"""Tests for scripts/export_app.py (docs/APP_BRIEF.md, "Export rules").

Builds tests/valid and data/ into temporary SQLite files and exports each into a temporary folder.
"""
import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "scripts"))

import build_db  # noqa: E402
import export_app  # noqa: E402

FOLDER_OF = {"PER": "people", "BAT": "battles", "WAR": "wars", "SRC": "sources", "POL": "polities", "PLC": "places",
             "CIV": "civilisations", "WRK": "works"}
LINK_KEYS = {"id", "source_id", "relationship_id", "claim_ids", "alternative_claim_ids", "weakest_claim_ids",
             "key_source_ids", "people"}


def build_and_export(root: Path, tmp: Path, name: str) -> Path:
    db, out = tmp / f"{name}.sqlite", tmp / name
    with redirect_stdout(io.StringIO()):
        assert build_db.main(["--root", str(root), "--out", str(db), "--no-validate"]) == 0
        assert export_app.main(["--db", str(db), "--out", str(out)]) == 0
    return out


def load_bundle(out: Path) -> dict:
    return {str(p.relative_to(out)).replace("\\", "/"): json.loads(p.read_text(encoding="utf-8"))
            for p in sorted(out.rglob("*.json"))}


def walk(obj, key=None):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk(v, k)
    elif isinstance(obj, list):
        for v in obj:
            yield from walk(v, key)
    else:
        yield key, obj


class Export(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        tmp = Path(cls.tmp.name)
        cls.valid = build_and_export(REPO / "tests" / "valid", tmp, "valid")
        cls.data = build_and_export(REPO / "data", tmp, "data")
        cls.bundle = load_bundle(cls.data)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def all_claims(self):
        for path, obj in self.bundle.items():
            for key in ("claims", "myths", "related_claims", "perspective_claims"):
                if isinstance(obj, dict):
                    yield from ((path, c) for c in obj.get(key, []))
            if isinstance(obj, dict):
                for group in obj.get("cited_by", []):
                    yield from ((path, x["claim"]) for x in group["claims"])

    def test_output_is_deterministic(self):
        # the same database exported twice gives byte-identical files
        again = Path(self.tmp.name) / "data-again"
        with redirect_stdout(io.StringIO()):
            export_app.main(["--db", str(Path(self.tmp.name) / "data.sqlite"), "--out", str(again)])
        first = {p: p.read_bytes() for p in sorted(self.data.rglob("*")) if p.is_file()}
        second = {p: p.read_bytes() for p in sorted(again.rglob("*")) if p.is_file()}
        self.assertEqual([p.relative_to(self.data) for p in first], [p.relative_to(again) for p in second])
        self.assertEqual(list(first.values()), list(second.values()))

    def test_contract_files_exist(self):
        for name in ("manifest.json", "index.json", "timeline.json", "search.json", "vocab.json", "redirects.json"):
            self.assertIn(name, self.bundle)
        manifest = self.bundle["manifest.json"]
        self.assertEqual(manifest["counts"]["people"], len(self.bundle["index.json"]))
        self.assertTrue(manifest["bundle_version"])

    def test_every_claim_has_grade_and_type(self):
        claims = list(self.all_claims())
        self.assertTrue(claims)
        for path, c in claims:
            self.assertIn(c["certainty"], "ABCDE", (path, c["id"]))
            self.assertIn(c["claim_type"], ("event", "tradition", "text", "interpretation"), (path, c["id"]))

    def test_every_citation_resolves_to_a_source(self):
        for path, c in self.all_claims():
            for cit in c["citations"]:
                self.assertIn(f"sources/{cit['source_id']}.json", self.bundle, (path, c["id"]))
                self.assertTrue(cit["title"])

    def test_every_link_points_to_a_record_in_the_bundle(self):
        claim_ids = {c["id"] for _p, c in self.all_claims()}
        rel_ids = {c["relationship_id"] for obj in self.bundle.values() if isinstance(obj, dict)
                   for c in obj.get("connections", [])}
        for path, obj in self.bundle.items():
            if path == "redirects.json":
                continue
            for key, value in walk(obj):
                if key not in LINK_KEYS or not isinstance(value, str) or not export_app.ID_RE.fullmatch(value):
                    continue
                prefix = value[:3]
                if prefix == "CLM":
                    self.assertIn(value, claim_ids, path)
                elif prefix == "REL":
                    self.assertIn(value, rel_ids, path)
                else:
                    self.assertIn(f"{FOLDER_OF[prefix]}/{value}.json", self.bundle, (path, key, value))

    def test_tombstones_are_redirects_not_pages(self):
        self.assertEqual(self.bundle["redirects.json"].get("BAT-000015"), "WAR-000014")
        self.assertNotIn("battles/BAT-000015.json", self.bundle)
        valid = load_bundle(self.valid)
        self.assertEqual(valid["redirects.json"], {"PER-999996": "PER-999997"})
        self.assertNotIn("people/PER-999996.json", valid)

    def test_search_folds_diacritics_and_alternative_names(self):
        entries = self.bundle["search.json"]

        def find(q):
            q = export_app.fold(q)
            return {e["label"] for e in entries if any(q in f for f in e["folded"])}

        self.assertIn("Trần Hưng Đạo", find("tran hung dao"))
        self.assertIn("Genghis Khan", find("chinggis"))
        self.assertIn("Timur", find("tamerlane"))

    def test_eras_by_midpoint(self):
        era = export_app.era_of
        self.assertEqual(era({"earliest": -220, "latest": -189}), "classical")  # Hannibal
        self.assertEqual(era({"earliest": 1180, "latest": 1227}), "medieval")
        self.assertEqual(era({"earliest": 1807, "latest": 1849}), "modern")
        self.assertIsNone(era(None))
        index = {p["id"]: p for p in self.bundle["index.json"]}
        self.assertEqual(index["PER-000005"]["regions"], ["Pacific"])

    def test_nothing_internal_or_invented(self):
        for path, obj in self.bundle.items():
            self.assertNotIn("editor_notes", json.dumps(obj), path)
        person = self.bundle["people/PER-000005.json"]
        self.assertTrue(person["cultural_guidance"])

    def test_restricted_text_never_leaves_the_database(self):
        text = " ".join(json.dumps(obj, ensure_ascii=False) for obj in self.bundle.values()).lower()
        self.assertNotIn("ka mate! ka mate", text)
        myth = next(c for c in self.bundle["people/PER-000005.json"]["myths"] if c["id"] == "CLM-000109")
        self.assertTrue(myth["restricted"])
        self.assertIsNone(myth["statement"])
        self.assertIsNone(myth["evidence_status"])
        self.assertTrue(myth["restricted_reason"])


if __name__ == "__main__":
    unittest.main()
