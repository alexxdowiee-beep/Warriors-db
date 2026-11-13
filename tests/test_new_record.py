"""Tests for scripts/new_record.py. Each test works in a temporary folder, never in data/."""
import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "scripts"))

import new_record  # noqa: E402
from validate import DatabaseValidator  # noqa: E402


def write(root, rel, obj):
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")


class NewRecord(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def run_cli(self, *args):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = new_record.main([*args, "--root", str(self.root)])
        return code, out.getvalue().strip(), err.getvalue()

    def test_first_record_gets_000001(self):
        code, out, _ = self.run_cli("person", "Joan of Arc")
        self.assertEqual(code, 0)
        path = Path(out)
        self.assertEqual(path.name, "PER-000001.json")
        rec = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(rec["id"], "PER-000001")
        self.assertEqual(rec["slug"], "joan-of-arc")
        self.assertEqual(rec["status"], "draft")
        self.assertEqual(rec["primary_name"], "Joan of Arc")
        self.assertRegex(rec["updated"], r"^\d{4}-\d{2}-\d{2}$")

    def test_gaps_are_not_reused_and_references_count(self):
        write(self.root, "persons/PER-000003.json", {"id": "PER-000003"})
        write(self.root, "relationships/PER-000003.json", {"to_id": "PER-000007"})  # referenced, no file yet
        code, out, _ = self.run_cli("person", "Hannibal Barca")
        self.assertTrue(out.endswith("PER-000008.json"))

    def test_tombstone_ids_are_never_recycled(self):
        write(self.root, "persons/PER-000009.json", {"id": "PER-000009", "status": "tombstone"})
        _, out, _ = self.run_cli("person", "Someone")
        self.assertTrue(out.endswith("PER-000010.json"))

    def test_claim_and_relationship_ids_only(self):
        write(self.root, "claims/PER-000001.json", {"claims": [{"id": "CLM-000041"}]})
        self.assertEqual(self.run_cli("claim")[1], "CLM-000042")
        self.assertEqual(self.run_cli("relationship")[1], "REL-000001")
        self.assertEqual(list((self.root / "claims").iterdir()), [self.root / "claims" / "PER-000001.json"])

    def test_slugs_strip_diacritics_and_macrons(self):
        self.assertEqual(new_record.slugify("Trần Hưng Đạo"), "tran-hung-dao")
        self.assertEqual(new_record.slugify("Ngāti Toa Rangatira"), "ngati-toa-rangatira")
        self.assertEqual(new_record.slugify("Sundiata Keïta (Mari Djata)"), "sundiata-keita-mari-djata")

    def test_duplicate_slug_refused(self):
        self.run_cli("person", "Joan of Arc")
        code, _, err = self.run_cli("person", "Joan of Arc")
        self.assertEqual(code, 1)
        self.assertIn("already used", err)
        self.assertEqual(self.run_cli("person", "Joan of Arc", "--slug", "joan-of-arc-2")[0], 0)

    def test_name_without_latin_letters_needs_slug(self):
        code, _, err = self.run_cli("person", "孫武")
        self.assertEqual(code, 1)
        self.assertIn("--slug", err)
        self.assertEqual(self.run_cli("person", "孫武", "--slug", "sun-tzu")[0], 0)

    def test_blank_record_fails_only_on_fields_needing_judgement(self):
        for rtype, name in [("person", "A"), ("battle", "B"), ("source", "C"), ("place", "D")]:
            self.run_cli(rtype, name)
        v = DatabaseValidator(self.root)
        v.run()
        self.assertEqual({e.code for e in v.errors}, {"SCHEMA"})
        unfilled = {(e.file.split("/")[-1], e.message.split(":")[0]) for e in v.errors}
        self.assertEqual({path for _, path in unfilled}, {
            "$.certainty", "$.core_claim_set", "$.active_period.earliest", "$.active_period.latest",
            "$.active_period.precision", "$.active_period.certainty", "$.kind", "$.source_type"})


if __name__ == "__main__":
    unittest.main()
