#!/usr/bin/env python3
"""Compile the JSON database into SQLite.

Usage:
    python scripts/build_db.py                      # data/ -> build/warriors.sqlite
    python scripts/build_db.py --root tests/valid --out <file>

The database is rebuilt from scratch every time (written to a temporary file, then swapped in, so a
failed build never leaves a half-built database behind). The JSON files remain the only source of truth.
The validator runs first and the build stops if it reports errors (--no-validate skips this).

Tables
  persons, civilisations, polities, battles, wars, equipment, tactics, periods, places, sources, works
      one per record type; columns follow the JSON Schemas. historicalDate fields become
      <field>_earliest/_latest/_precision/_display/_certainty; arrays and objects are stored as JSON
      text; the full record is kept in the `data` column.
  records              view: id, type, slug, primary_name, summary, certainty, status across all types
  names                one row per entry in a record's names[]
  claims               one row per claim; claim_bias_flags and claim_perspectives list those arrays
  citations            one row per citation of a claim
  relationships        one row per stored relationship, as written in data/relationships/
  relationship_links   each relationship in both directions: the stored row plus a generated reverse
                       row; the reverse name comes from schema/vocab/relations.json "reverse"
  search               FTS5 index over names, summaries and profile text (diacritics ignored, so
                       "ngati" finds "Ngāti")
  build_info           when and from what the database was built
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import sqlite3
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "scripts"))

from validate import RECORD_FOLDERS, DatabaseValidator  # noqa: E402

SCHEMA_DIR = REPO / "schema"
DEFAULT_ROOT = REPO / "data"
DEFAULT_OUT = REPO / "build" / "warriors.sqlite"
DATE_PARTS = ("earliest", "latest", "precision", "display", "certainty")

# Long descriptive text per type that goes into the full-text index alongside names and summary.
SEARCH_TEXT_FIELDS = {
    "person": ("profile",),
    "civilisation": ("overview",),
    "battle": ("tactical_summary", "significance", "outcome"),
    "war": ("causes", "outcome", "consequences"),
    "tactic": ("description",),
    "work": ("structure",),
}


def j(value):
    return None if value is None else json.dumps(value, ensure_ascii=False)


def sql_type(prop: dict) -> str:
    if "$ref" in prop:
        return "TEXT"
    t = prop.get("type", "string")
    if isinstance(t, list):
        t = next((x for x in t if x != "null"), "string")
    return {"integer": "INTEGER", "number": "REAL", "boolean": "INTEGER"}.get(t, "TEXT")


def is_json(prop: dict) -> bool:
    t = prop.get("type")
    types = t if isinstance(t, list) else [t]
    return prop.get("$ref", "").endswith("/quantityRange") or "object" in types or "array" in types


def table_columns(rtype: str) -> list[tuple[str, str, str, str]]:
    """(column, sql type, json property, kind) for one record type. kind: value | json | date:<part>."""
    common = json.loads((SCHEMA_DIR / "common.schema.json").read_text(encoding="utf-8"))
    specific = json.loads((SCHEMA_DIR / f"{rtype}.schema.json").read_text(encoding="utf-8"))
    props = {**common["$defs"]["base"]["properties"], **specific.get("properties", {})}
    cols = []
    for name, prop in props.items():
        if name == "names":
            continue  # its own table
        if prop.get("$ref", "").endswith("/historicalDate"):
            for part in DATE_PARTS:
                cols.append((f"{name}_{part}", "INTEGER" if part in ("earliest", "latest") else "TEXT", name, f"date:{part}"))
        elif is_json(prop):
            cols.append((name, "TEXT", name, "json"))
        else:
            cols.append((name, sql_type(prop), name, "value"))
    return cols


def column_value(record: dict, prop: str, kind: str):
    value = record.get(prop)
    if kind == "json":
        return j(value)
    if kind.startswith("date:"):
        return value.get(kind[5:]) if isinstance(value, dict) else None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (dict, list)):
        return j(value)
    return value


def profile_text(value) -> str:
    if isinstance(value, dict):
        return "\n".join(profile_text(v) for v in value.values())
    if isinstance(value, list):
        return "\n".join(profile_text(v) for v in value)
    return value if isinstance(value, str) else ""


def read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def build(root: Path, out: Path) -> dict:
    vocab = read(SCHEMA_DIR / "vocab" / "relations.json")
    known_relations = {r for group in vocab["relations"].values() for r in group}
    reverse_names = vocab["reverse"]
    notes: list[str] = []

    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_name(out.name + ".tmp")
    if tmp.exists():
        tmp.unlink()
    con = sqlite3.connect(tmp)
    try:
        con.execute("PRAGMA foreign_keys = OFF")  # integrity is checked by validate.py
        counts = {}

        # ---- one table per record type
        union = []
        for folder, (_prefix, rtype) in RECORD_FOLDERS.items():
            cols = table_columns(rtype)
            col_sql = ", ".join(f'"{c}" {t}' for c, t, _, _ in cols if c not in ("id", "type"))
            con.execute(f'CREATE TABLE "{folder}" (id TEXT PRIMARY KEY, type TEXT NOT NULL, {col_sql}, data TEXT NOT NULL)')
            con.execute(f'CREATE UNIQUE INDEX "{folder}_slug" ON "{folder}"(slug)')
            union.append(f'SELECT id, type, slug, primary_name, summary, certainty, status FROM "{folder}"')
            counts[folder] = 0
        con.execute("CREATE VIEW records AS " + " UNION ALL ".join(union))

        con.executescript("""
            CREATE TABLE names (record_id TEXT NOT NULL, seq INTEGER NOT NULL, name TEXT NOT NULL, kind TEXT,
                language TEXT, script TEXT, romanisation TEXT, preferred INTEGER, PRIMARY KEY (record_id, seq));
            CREATE INDEX names_name ON names(name);
            CREATE TABLE claims (id TEXT PRIMARY KEY, subject_id TEXT NOT NULL, field TEXT, statement TEXT,
                claim_type TEXT, certainty TEXT, verdict TEXT, evidence_status TEXT, quiz_ready INTEGER,
                bias_flags TEXT, perspective_of TEXT, alternative_claim_ids TEXT, data TEXT NOT NULL);
            CREATE INDEX claims_subject ON claims(subject_id);
            CREATE TABLE claim_bias_flags (claim_id TEXT NOT NULL, flag TEXT NOT NULL, PRIMARY KEY (claim_id, flag));
            CREATE TABLE claim_perspectives (claim_id TEXT NOT NULL, perspective_id TEXT NOT NULL,
                PRIMARY KEY (claim_id, perspective_id));
            CREATE TABLE citations (claim_id TEXT NOT NULL, seq INTEGER NOT NULL, source_id TEXT NOT NULL,
                locator TEXT, note TEXT, access TEXT, PRIMARY KEY (claim_id, seq));
            CREATE INDEX citations_source ON citations(source_id);
            CREATE TABLE relationships (id TEXT PRIMARY KEY, subject_id TEXT NOT NULL, from_id TEXT NOT NULL,
                to_id TEXT NOT NULL, relation TEXT NOT NULL, role TEXT, certainty TEXT,
                span_earliest INTEGER, span_latest INTEGER, span_precision TEXT, span_display TEXT,
                span_certainty TEXT, claim_ids TEXT, data TEXT NOT NULL);
            CREATE TABLE relationship_links (relationship_id TEXT NOT NULL, direction TEXT NOT NULL
                CHECK (direction IN ('stored', 'reverse')), from_id TEXT NOT NULL, to_id TEXT NOT NULL,
                relation TEXT NOT NULL, reverse_name_known INTEGER NOT NULL, role TEXT, certainty TEXT,
                PRIMARY KEY (relationship_id, direction));
            CREATE INDEX relationship_links_from ON relationship_links(from_id);
            CREATE INDEX relationship_links_to ON relationship_links(to_id);
            CREATE VIRTUAL TABLE search USING fts5(record_id UNINDEXED, type UNINDEXED, names, summary, body,
                tokenize = 'unicode61 remove_diacritics 2');
            CREATE TABLE build_info (key TEXT PRIMARY KEY, value TEXT);
        """)

        for folder, (_prefix, rtype) in RECORD_FOLDERS.items():
            cols = table_columns(rtype)
            placeholders = ", ".join("?" for _ in range(len(cols) + 1))
            col_names = ", ".join(f'"{c}"' for c, _, _, _ in cols)
            insert = f'INSERT INTO "{folder}" ({col_names}, data) VALUES ({placeholders})'
            for f in sorted((root / folder).glob("*.json")) if (root / folder).is_dir() else []:
                rec = read(f)
                con.execute(insert, [column_value(rec, p, k) for _, _, p, k in cols] + [j(rec)])
                counts[folder] += 1
                names = [n for n in rec.get("names") or [] if isinstance(n, dict)]
                for seq, n in enumerate(names):
                    con.execute("INSERT INTO names VALUES (?,?,?,?,?,?,?,?)",
                                (rec["id"], seq, n.get("name"), n.get("kind"), n.get("language"),
                                 n.get("script"), n.get("romanisation"),
                                 None if n.get("preferred") is None else int(n["preferred"])))
                all_names = [rec.get("primary_name") or ""] + [n.get("name", "") for n in names]
                body = "\n".join(profile_text(rec.get(field)) for field in SEARCH_TEXT_FIELDS.get(rtype, ()))
                con.execute("INSERT INTO search VALUES (?,?,?,?,?)",
                            (rec["id"], rtype, "\n".join(dict.fromkeys(filter(None, all_names))),
                             rec.get("summary") or "", body.strip()))

        # ---- claims and citations
        counts["claims"] = counts["citations"] = 0
        claims_dir = root / "claims"
        for f in sorted(claims_dir.glob("*.json")) if claims_dir.is_dir() else []:
            doc = read(f)
            for c in doc.get("claims", []):
                con.execute("INSERT INTO claims VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                            (c["id"], doc["subject"], c.get("field"), c.get("statement"), c.get("claim_type"),
                             c.get("certainty"), c.get("verdict"), c.get("evidence_status"),
                             None if c.get("quiz_ready") is None else int(c["quiz_ready"]),
                             j(c.get("bias_flags")), j(c.get("perspective_of")),
                             j(c.get("alternative_claim_ids")), j(c)))
                counts["claims"] += 1
                for flag in dict.fromkeys(c.get("bias_flags") or []):
                    con.execute("INSERT INTO claim_bias_flags VALUES (?,?)", (c["id"], flag))
                for pid in dict.fromkeys(c.get("perspective_of") or []):
                    con.execute("INSERT INTO claim_perspectives VALUES (?,?)", (c["id"], pid))
                for seq, cit in enumerate(c.get("citations") or []):
                    con.execute("INSERT INTO citations VALUES (?,?,?,?,?,?)",
                                (c["id"], seq, cit["source_id"], cit.get("locator"), cit.get("note"), cit.get("access")))
                    counts["citations"] += 1

        # ---- relationships, plus generated reverse links
        counts["relationships"] = counts["relationship_links"] = 0
        unknown, no_reverse = set(), set()
        rel_dir = root / "relationships"
        for f in sorted(rel_dir.glob("*.json")) if rel_dir.is_dir() else []:
            doc = read(f)
            for r in doc.get("relationships", []):
                span = r.get("span") if isinstance(r.get("span"), dict) else {}
                con.execute("INSERT INTO relationships VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                            (r["id"], doc["subject"], r["from_id"], r["to_id"], r["relation"], r.get("role"),
                             r.get("certainty"), *(span.get(p) for p in DATE_PARTS), j(r.get("claim_ids")), j(r)))
                counts["relationships"] += 1
                rel = r["relation"]
                if rel not in known_relations:
                    unknown.add(rel)
                reverse = reverse_names.get(rel)
                if reverse is None:
                    no_reverse.add(rel)
                con.execute("INSERT INTO relationship_links VALUES (?,?,?,?,?,?,?,?)",
                            (r["id"], "stored", r["from_id"], r["to_id"], rel, 1, r.get("role"), r.get("certainty")))
                # Without a reverse name in the vocabulary, the reverse row keeps the stored relation name;
                # direction = 'reverse' and reverse_name_known = 0 tell the app to phrase it passively.
                con.execute("INSERT INTO relationship_links VALUES (?,?,?,?,?,?,?,?)",
                            (r["id"], "reverse", r["to_id"], r["from_id"], reverse or rel,
                             int(reverse is not None), r.get("role"), r.get("certainty")))
                counts["relationship_links"] += 2
        if unknown:
            notes.append(f"relations not in schema/vocab/relations.json: {', '.join(sorted(unknown))}")
        if no_reverse:
            notes.append(f"relations with no reverse name in the vocabulary (reverse rows keep the stored name): "
                         f"{', '.join(sorted(no_reverse))}")

        try:
            source = root.resolve().relative_to(REPO).as_posix()
        except ValueError:
            source = str(root)
        info = {"built_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
                "source": source, "counts": j(counts)}
        con.executemany("INSERT INTO build_info VALUES (?,?)", info.items())
        con.commit()
    except BaseException:
        con.close()
        tmp.unlink(missing_ok=True)
        raise
    con.close()
    os.replace(tmp, out)
    return {"counts": counts, "notes": notes}


def main(argv=None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Compile the JSON database into SQLite.")
    parser.add_argument("--root", default=str(DEFAULT_ROOT), help="database folder (default: data/)")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="output file (default: build/warriors.sqlite)")
    parser.add_argument("--no-validate", action="store_true", help="build even if the validator reports errors")
    args = parser.parse_args(argv)
    root, out = Path(args.root), Path(args.out)

    if not args.no_validate:
        v = DatabaseValidator(root)
        v.run()
        if v.errors:
            for e in v.errors:
                print(e)
            print(f"\nbuild stopped: validator reported {len(v.errors)} error(s). "
                  "Fix them, or pass --no-validate to build anyway.")
            return 1

    result = build(root, out)
    try:
        shown = out.resolve().relative_to(REPO).as_posix()
    except ValueError:
        shown = str(out)
    print(f"built {shown}")
    for table, n in result["counts"].items():
        print(f"  {table:<20} {n}")
    for note in result["notes"]:
        print(f"note: {note}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
