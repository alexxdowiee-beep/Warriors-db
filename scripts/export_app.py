#!/usr/bin/env python3
"""Export the SQLite database to the app's data bundle (docs/APP_BRIEF.md, "Data export contract").

Usage:
    python scripts/export_app.py                       # build/warriors.sqlite -> app/data/
    python scripts/export_app.py --db X --out DIR

The exporter only copies and joins what is in the database; it never writes historical text.
Output is deterministic: the same database gives byte-identical files (sorted keys, sorted lists).
"generated_at" in manifest.json is the database's build time (build_info.built_at), so a rebuild of
unchanged data changes only that value and the bundle version.

Files written (the old bundle is deleted first):
  manifest.json, index.json, timeline.json, search.json, vocab.json, redirects.json
  people/<ID>.json, battles/<ID>.json, wars/<ID>.json, sources/<ID>.json,
  polities/<ID>.json, places/<ID>.json, civilisations/<ID>.json, works/<ID>.json
(works/ is not in the brief's table; it is added so that every link in the bundle resolves.)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sqlite3
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DEFAULT_DB = REPO / "build" / "warriors.sqlite"
DEFAULT_OUT = REPO / "app" / "data"
VOCAB_DIR = REPO / "schema" / "vocab"

# table -> bundle folder (only record types the app shows)
FOLDERS = {"persons": "people", "battles": "battles", "wars": "wars", "sources": "sources", "polities": "polities",
           "places": "places", "civilisations": "civilisations", "works": "works"}
OTHER_TABLES = ("equipment", "tactics", "periods")  # exported as names only until the app has pages for them
ID_RE = re.compile(r"\b(?:PER|CIV|POL|BAT|WAR|EQP|TAC|PRD|PLC|SRC|WRK|CLM|REL)-[0-9]{6}\b")
INTERNAL_FIELDS = {"editor_notes"}  # working notes for editors, not shown in the app

# Eras: a display convention for filtering (owner's decision, 13 Nov 2026), not a historical claim.
# Bounds are astronomical years: 500 BCE = -499. A person's era is the one containing the midpoint of
# their active period.
ERAS = [("ancient", "Ancient", None, -500, "before 500 BCE"),
        ("classical", "Classical", -499, 499, "500 BCE to 500 CE"),
        ("medieval", "Medieval", 500, 1499, "500 to 1500"),
        ("early-modern", "Early modern", 1500, 1799, "1500 to 1800"),
        ("modern", "Modern", 1800, None, "1800 onward")]

GRADES = {"A": ("Established", "Two or more independent sources, at least one opened and one contemporary or "
                                "archaeological, or scholarly consensus."),
          "B": ("Probable", "One good source, or several later ones with a credible chain."),
          "C": ("Disputed", "Credible sources or scholars disagree."),
          "D": ("Weak", "A single late, partisan or second-hand source."),
          "E": ("Legendary or false", "Legend, or shown to be false.")}
CLAIM_TYPES = {"event": ("Event", "It happened."), "tradition": ("Tradition", "What a tradition says."),
               "text": ("Text", "What a document says."),
               "interpretation": ("Interpretation", "A historian's judgement.")}
VERDICTS = {"accepted": "Accepted", "disputed": "Disputed", "rejected-myth": "Rejected (myth)"}
ACCESS = {"opened": "Opened", "excerpt": "Excerpt", "via-secondary": "Via a secondary source",
          "not-opened": "Not yet consulted"}
TIERS = {"scholarly": "Scholarly", "reference": "Reference", "popular": "Popular", "aggregator": "Aggregator",
         "ai-generated": "AI-generated", None: "Primary material"}
STATUSES = {"draft": "Draft", "sourced": "Sourced", "verified": "Verified", "reviewed": "Reviewed"}
CORE_FIELDS = {"commander": ["identity", "active_period", "main_battles"],
               "author": ["identity", "active_period", "main_works"]}
SPECIAL_LETTERS = {"đ": "d", "ð": "d", "ł": "l", "ø": "o", "æ": "ae", "œ": "oe", "ß": "ss", "þ": "th", "ı": "i"}


def label(s: str) -> str:
    return s.replace("_", " ").replace("-", " ").capitalize()


def fold(text: str) -> str:
    """Lower case, diacritics removed, so 'Trần Hưng Đạo' matches 'tran hung dao'."""
    text = "".join(SPECIAL_LETTERS.get(ch, ch) for ch in text.lower())
    text = "".join(ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", text)).strip()


def era_of(period: dict | None) -> str | None:
    if not period or not isinstance(period.get("earliest"), int) or not isinstance(period.get("latest"), int):
        return None
    mid = (period["earliest"] + period["latest"]) / 2
    for key, _label, lo, hi, _disp in ERAS:
        if (lo is None or mid >= lo) and (hi is None or mid < hi + 1):
            return key
    return None


class Exporter:
    def __init__(self, db: Path):
        con = sqlite3.connect(db)
        self.built_at = dict(con.execute("SELECT key, value FROM build_info")).get("built_at")
        self.records: dict[str, dict] = {}
        self.table_of: dict[str, str] = {}
        for table in list(FOLDERS) + list(OTHER_TABLES):
            for (data,) in con.execute(f'SELECT data FROM "{table}" ORDER BY id'):
                rec = json.loads(data)
                self.records[rec["id"]] = rec
                self.table_of[rec["id"]] = table
        self.claims_by_subject = defaultdict(list)
        self.claims = {}
        for subject, data in con.execute("SELECT subject_id, data FROM claims ORDER BY id"):
            c = json.loads(data)
            self.claims[c["id"]] = (c, subject)
            self.claims_by_subject[subject].append(c)
        self.links = defaultdict(list)
        self.rel_data = {}
        for rid, data in con.execute("SELECT id, data FROM relationships ORDER BY id"):
            self.rel_data[rid] = json.loads(data)
        for row in con.execute("SELECT relationship_id, direction, from_id, to_id, relation, role, certainty "
                               "FROM relationship_links ORDER BY relationship_id, direction"):
            rid, direction, frm, to, relation, role, cert = row
            self.links[frm].append(dict(relationship_id=rid, direction=direction, other_id=to, relation=relation,
                                        role=role, certainty=cert,
                                        claim_ids=self.rel_data[rid].get("claim_ids", [])))
        con.close()
        self.live = {i for i, r in self.records.items() if r.get("status") != "tombstone"}
        self.redirects = {}
        for i, r in self.records.items():
            if r.get("status") == "tombstone" and r.get("replaced_by"):
                target, seen = r["replaced_by"], {i}
                while target in self.records and self.records[target].get("status") == "tombstone" \
                        and target not in seen:
                    seen.add(target)
                    target = self.records[target].get("replaced_by")
                self.redirects[i] = target
        self.citing = defaultdict(list)  # source id -> [(claim, subject, citation)]
        for cid, (c, subject) in sorted(self.claims.items()):
            for cit in c.get("citations") or []:
                self.citing[cit["source_id"]].append((c, subject, cit))

    # ------------------------------------------------------------------ helpers
    def resolve(self, rid: str | None) -> str | None:
        return self.redirects.get(rid, rid)

    def ref(self, rid: str | None) -> dict | None:
        rid = self.resolve(rid)
        if not rid or rid not in self.records:
            return None
        r = self.records[rid]
        return {"id": rid, "name": r.get("primary_name"), "type": r.get("type")}

    def refs(self, ids) -> list:
        return [x for x in (self.ref(i) for i in ids or []) if x]

    def public(self, rec: dict) -> dict:
        return {k: v for k, v in rec.items() if k not in INTERNAL_FIELDS}

    def claim_out(self, c: dict, subject: str) -> dict:
        cites = []
        for cit in c.get("citations") or []:
            src = self.records.get(cit["source_id"], {})
            cites.append({"source_id": cit["source_id"], "title": src.get("primary_name"),
                          "source_type": src.get("source_type"), "tier": src.get("reliability_tier"),
                          "access": cit.get("access"), "locator": cit.get("locator"), "note": cit.get("note")})
        restricted = bool(c.get("restricted"))
        return {"id": c["id"], "subject": self.ref(subject), "field": c.get("field"),
                # Restricted material (e.g. the words of a taonga) never leaves the database.
                "statement": None if restricted else c.get("statement"),
                "restricted": restricted, "restricted_reason": c.get("restricted_reason") if restricted else None,
                "claim_type": c.get("claim_type"), "certainty": c.get("certainty"), "verdict": c.get("verdict"),
                "bias_flags": sorted(c.get("bias_flags") or []), "perspective": self.refs(c.get("perspective_of")),
                "alternative_claim_ids": c.get("alternative_claim_ids") or [], "citations": cites,
                "evidence_status": None if restricted else c.get("evidence_status"),
                "quiz_ready": bool(c.get("quiz_ready")),
                "quiz_kind": c.get("quiz_kind")}

    def connections(self, rid: str) -> list:
        out = []
        for l in self.links.get(rid, []):
            other = self.ref(l["other_id"])
            if other and other["id"] in self.live:
                out.append({"relationship_id": l["relationship_id"], "direction": l["direction"],
                            "relation": l["relation"], "other": other, "role": l["role"],
                            "certainty": l["certainty"], "claim_ids": l["claim_ids"]})
        return sorted(out, key=lambda x: (x["relation"], x["other"]["id"], x["relationship_id"]))

    def related_claims(self, rid: str) -> list:
        """Claims about the record, plus claims linked from relationships involving it."""
        ids = {c["id"] for c in self.claims_by_subject.get(rid, [])}
        for l in self.links.get(rid, []):
            ids.update(l["claim_ids"])
        return [self.claim_out(*self.claims[i]) for i in sorted(ids) if i in self.claims]

    def date_key(self, rec: dict):
        d = rec.get("date") or rec.get("span") or {}
        return (d.get("earliest") if isinstance(d.get("earliest"), int) else 10 ** 6, rec["id"])

    def base(self, rid: str) -> dict:
        out = self.public(self.records[rid])
        out["claims"] = [self.claim_out(c, rid) for c in self.claims_by_subject.get(rid, [])]
        out["connections"] = self.connections(rid)
        return out

    # ------------------------------------------------------------------ pages
    def person(self, rid: str) -> dict:
        rec = self.records[rid]
        out = self.public(rec)
        all_claims = self.claims_by_subject.get(rid, [])
        myth_ids = list(rec.get("myth_claim_ids") or [])
        out["claims"] = [self.claim_out(c, rid) for c in all_claims if c.get("field") != "myth"]
        out["myths"] = [self.claim_out(*self.claims[i]) for i in myth_ids if i in self.claims]
        out["era"] = era_of(rec.get("active_period"))
        out["regions"] = rec.get("regions") or []
        out["polities"] = self.refs(rec.get("polity_ids"))
        out["civilisations"] = self.refs(rec.get("civilisation_ids"))
        for key in ("birth_place_id", "death_place_id"):
            if rec.get(key):
                out[key.replace("_id", "")] = self.ref(rec[key])
        out["connections"] = self.connections(rid)
        engagements = []
        for c in out["connections"]:
            if c["other"]["type"] in ("battle", "war"):
                o = self.records[c["other"]["id"]]
                d = o.get("date") or o.get("span")
                engagements.append({"id": o["id"], "type": o["type"], "name": o.get("primary_name"),
                                    "kind": o.get("kind"), "date": d, "relation": c["relation"], "role": c["role"],
                                    "certainty": c["certainty"], "result": o.get("outcome"),
                                    "war": self.ref(o.get("war_id") or o.get("parent_war_id")),
                                    "claim_ids": c["claim_ids"]})
        out["engagements"] = sorted(engagements, key=lambda e: (
            e["date"]["earliest"] if e["date"] and isinstance(e["date"].get("earliest"), int) else 10 ** 6,
            e["id"], e["relation"]))
        fields = CORE_FIELDS.get(rec.get("core_claim_set"), [])
        core = [c for c in all_claims if c.get("field") in fields and c.get("verdict") != "rejected-myth"
                and c.get("certainty") in GRADES]
        worst = max((c["certainty"] for c in core), default=None, key=lambda g: "ABCDE".index(g))
        out["core"] = {"claim_set": rec.get("core_claim_set"), "fields": fields,
                       "claim_ids": [c["id"] for c in core],
                       "weakest_claim_ids": [c["id"] for c in core if c["certainty"] == worst],
                       "missing_fields": [f for f in fields if not any(c.get("field") == f for c in core)]}
        out["bias_flags_present"] = sorted({f for c in all_claims for f in c.get("bias_flags") or []})
        out["key_source_ids"] = sorted({cit["source_id"] for c in all_claims for cit in c.get("citations") or []
                                        if c.get("verdict") != "rejected-myth"})
        return out

    def battle(self, rid: str) -> dict:
        out = self.base(rid)
        rec = self.records[rid]
        out["place"] = self.ref(rec.get("place_id"))
        out["war"] = self.ref(rec.get("war_id"))
        out["sides"] = [dict(s, polities=self.refs(s.get("polity_ids")), commanders=self.refs(s.get("commander_ids")))
                        for s in rec.get("sides") or []]
        out["people"] = [c for c in out["connections"] if c["other"]["type"] == "person"]
        out["related_claims"] = self.related_claims(rid)
        return out

    def war(self, rid: str) -> dict:
        out = self.base(rid)
        rec = self.records[rid]
        out["parent_war"] = self.ref(rec.get("parent_war_id"))
        out["sub_wars"] = [self.ref(i) for i, r in sorted(self.records.items(), key=lambda kv: self.date_key(kv[1]))
                           if i in self.live and r.get("type") == "war" and r.get("parent_war_id") == rid]
        battles = sorted((r for i, r in self.records.items()
                          if i in self.live and r.get("type") == "battle" and r.get("war_id") == rid),
                         key=self.date_key)
        out["battles"] = [{"id": b["id"], "name": b.get("primary_name"), "kind": b.get("kind"), "date": b.get("date"),
                           "certainty": b.get("certainty"), "result": b.get("outcome")} for b in battles]
        bell = {}
        for b in battles:
            for s in b.get("sides") or []:
                for p in self.refs(s.get("polity_ids")):
                    bell[p["id"]] = p
        out["belligerents"] = [bell[k] for k in sorted(bell)]
        out["people"] = [c for c in out["connections"] if c["other"]["type"] == "person"]
        out["related_claims"] = self.related_claims(rid)
        return out

    def source(self, rid: str) -> dict:
        out = self.base(rid)
        rec = self.records[rid]
        out["derives_from"] = self.refs(rec.get("derives_from"))
        out["derived_by"] = [self.ref(i) for i, r in sorted(self.records.items())
                             if i in self.live and r.get("type") == "source" and rid in (r.get("derives_from") or [])]
        groups = defaultdict(list)
        for c, subject, cit in self.citing.get(rid, []):
            groups[subject].append({"claim": self.claim_out(c, subject), "access": cit.get("access"),
                                    "note": cit.get("note"), "locator": cit.get("locator")})
        out["cited_by"] = [{"subject": self.ref(s), "claims": groups[s]} for s in sorted(groups)]
        return out

    def linked(self, rid: str) -> dict:
        """Polities, places, civilisations, works: the record plus linked people, battles and wars."""
        out = self.base(rid)
        people, battles, wars = {}, {}, {}
        for i, r in self.records.items():
            if i not in self.live:
                continue
            t = r.get("type")
            if t == "person" and (rid in (r.get("polity_ids") or []) or rid in (r.get("civilisation_ids") or [])
                                  or rid in (r.get("birth_place_id"), r.get("death_place_id"))):
                people[i] = self.ref(i)
            if t == "battle" and (r.get("place_id") == rid or any(rid in (s.get("polity_ids") or [])
                                                                   for s in r.get("sides") or [])):
                battles[i] = self.ref(i)
        for c in out["connections"]:
            {"person": people, "battle": battles, "war": wars}.get(c["other"]["type"], {})[c["other"]["id"]] = c["other"]
        out["people"] = [people[k] for k in sorted(people)]
        out["battles"] = [battles[k] for k in sorted(battles, key=lambda k: self.date_key(self.records[k]))]
        out["wars"] = [wars[k] for k in sorted(wars, key=lambda k: self.date_key(self.records[k]))]
        out["perspective_claims"] = [self.claim_out(c, s) for cid, (c, s) in sorted(self.claims.items())
                                     if rid in (c.get("perspective_of") or [])]
        return out

    # ------------------------------------------------------------------ bundle files
    def index(self) -> list:
        out = []
        for i in sorted(self.live):
            r = self.records[i]
            if r.get("type") != "person":
                continue
            out.append({"id": i, "primary_name": r.get("primary_name"), "roles": r.get("roles") or [],
                        "polities": self.refs(r.get("polity_ids")), "regions": r.get("regions") or [],
                        "era": era_of(r.get("active_period")), "active_period": r.get("active_period"),
                        "certainty": r.get("certainty"), "status": r.get("status"), "tags": r.get("tags") or [],
                        "summary": r.get("summary"), "cultural_guidance": r.get("cultural_guidance")})
        return out

    def timeline(self) -> dict:
        people, events = [], []
        for i in sorted(self.live):
            r = self.records[i]
            if r.get("type") == "person" and r.get("active_period"):
                ap = r["active_period"]
                people.append({"id": i, "name": r.get("primary_name"), "earliest": ap.get("earliest"),
                               "latest": ap.get("latest"), "display": ap.get("display"),
                               "certainty": ap.get("certainty"), "regions": r.get("regions") or [],
                               "era": era_of(ap)})
            elif r.get("type") in ("battle", "war"):
                d = r.get("date") if r["type"] == "battle" else r.get("span")
                if d and isinstance(d.get("earliest"), int):
                    events.append({"id": i, "type": r["type"], "name": r.get("primary_name"),
                                   "earliest": d["earliest"], "latest": d.get("latest"), "display": d.get("display"),
                                   "certainty": d.get("certainty"), "era": era_of(d),
                                   "people": sorted({c["other"]["id"] for c in self.connections(i)
                                                     if c["other"]["type"] == "person"})})
        key = lambda x: (x["earliest"], x["id"])  # noqa: E731
        return {"people": sorted(people, key=key), "events": sorted(events, key=key)}

    def search(self) -> list:
        out = []
        for i in sorted(self.live):
            r = self.records[i]
            if self.table_of[i] not in FOLDERS:
                continue
            names = [r.get("primary_name")] + [n["name"] for n in r.get("names") or [] if isinstance(n, dict)]
            if r.get("type") == "source" and r.get("title"):
                names.append(r["title"])
            names = list(dict.fromkeys(n for n in names if n))
            out.append({"id": i, "type": r.get("type"), "label": r.get("primary_name"), "names": names,
                        "folded": list(dict.fromkeys(fold(n) for n in names))})
        return out

    def vocab(self) -> dict:
        rel = json.loads((VOCAB_DIR / "relations.json").read_text(encoding="utf-8"))
        flags = json.loads((VOCAB_DIR / "bias-flags.json").read_text(encoding="utf-8"))
        flag_list = flags.get("bias_flags", flags) if isinstance(flags, dict) else flags
        regions = json.loads((VOCAB_DIR / "regions.json").read_text(encoding="utf-8"))
        relations = {r for group in rel["relations"].values() for r in group} | set(rel["reverse"].values())
        return {
            "grades": {g: {"label": l, "meaning": m} for g, (l, m) in GRADES.items()},
            "claim_types": {k: {"label": l, "meaning": m} for k, (l, m) in CLAIM_TYPES.items()},
            "verdicts": {k: {"label": v} for k, v in VERDICTS.items()},
            "access": {k: {"label": v} for k, v in ACCESS.items()},
            "reliability_tiers": {(k or "primary"): {"label": v} for k, v in TIERS.items()},
            "statuses": {k: {"label": v} for k, v in STATUSES.items()},
            "bias_flags": {f: {"label": label(f)} for f in flag_list},
            "relations": {r: {"label": label(r)} for r in sorted(relations)},
            "regions": {"values": regions["regions"], "note": regions["note"]},
            "eras": {"note": "A display convention for filtering, not a historical claim. A person's era is the one "
                             "containing the midpoint of their active period.",
                     "values": [{"key": k, "label": l, "earliest": lo, "latest": hi, "display": d}
                                for k, l, lo, hi, d in ERAS]},
        }

    def files(self) -> dict[str, object]:
        out = {}
        pages = {"persons": self.person, "battles": self.battle, "wars": self.war, "sources": self.source,
                 "polities": self.linked, "places": self.linked, "civilisations": self.linked, "works": self.linked}
        counts = defaultdict(int)
        for i in sorted(self.live):
            table = self.table_of[i]
            if table in pages:
                out[f"{FOLDERS[table]}/{i}.json"] = pages[table](i)
                counts[FOLDERS[table]] += 1
        counts["claims"] = len(self.claims)
        out["index.json"] = self.index()
        out["timeline.json"] = self.timeline()
        out["search.json"] = self.search()
        out["vocab.json"] = self.vocab()
        out["redirects.json"] = dict(sorted(self.redirects.items()))
        self.counts = dict(sorted(counts.items()))
        return out


def dump(obj) -> bytes:
    return (json.dumps(obj, ensure_ascii=False, sort_keys=True, indent=1) + "\n").encode("utf-8")


def export(db: Path, out_dir: Path) -> dict:
    ex = Exporter(db)
    blobs = {path: dump(obj) for path, obj in ex.files().items()}
    h = hashlib.sha256()
    for path in sorted(blobs):
        h.update(path.encode() + b"\0" + blobs[path])
    manifest = {"bundle_version": h.hexdigest()[:16], "generated_at": ex.built_at, "counts": ex.counts}
    blobs["manifest.json"] = dump(manifest)
    if out_dir.exists():
        shutil.rmtree(out_dir)
    for path, data in blobs.items():
        p = out_dir / path
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
    return manifest


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Export build/warriors.sqlite to the app data bundle.")
    parser.add_argument("--db", default=str(DEFAULT_DB))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    args = parser.parse_args(argv)
    db = Path(args.db)
    if not db.is_file():
        print(f"{db} not found: run scripts/build_db.py first", file=sys.stderr)
        return 1
    manifest = export(db, Path(args.out))
    print(f"exported to {args.out} (bundle {manifest['bundle_version']})")
    for k, v in manifest["counts"].items():
        print(f"  {k:<15}{v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
