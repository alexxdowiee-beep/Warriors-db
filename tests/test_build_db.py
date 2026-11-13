"""Tests for scripts/build_db.py, built from tests/valid into a temporary file."""
import io
import json
import sqlite3
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "scripts"))

import build_db  # noqa: E402


class BuildDb(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls.tmp.name) / "test.sqlite"
        with redirect_stdout(io.StringIO()):
            code = build_db.main(["--root", str(REPO / "tests" / "valid"), "--out", str(cls.out)])
        assert code == 0
        cls.con = sqlite3.connect(cls.out)

    @classmethod
    def tearDownClass(cls):
        cls.con.close()
        cls.tmp.cleanup()

    def q(self, sql, *args):
        return self.con.execute(sql, args).fetchall()

    def test_one_table_per_record_type(self):
        tables = {r[0] for r in self.q("SELECT name FROM sqlite_master WHERE type='table'")}
        for folder in build_db.RECORD_FOLDERS:
            self.assertIn(folder, tables)
        self.assertEqual(self.q("SELECT count(*) FROM persons")[0][0], 3)
        self.assertEqual(self.q("SELECT count(*) FROM records")[0][0], 8)

    def test_dates_are_flattened_and_full_record_kept(self):
        row = self.q("SELECT death_earliest, death_display, active_period_certainty, data FROM persons "
                     "WHERE id='PER-999997'")[0]
        self.assertEqual(row[:3], (1420, "1420 CE", "B"))
        self.assertEqual(json.loads(row[3])["slug"], "test-commander")

    def test_tombstone_kept_with_replaced_by(self):
        self.assertEqual(self.q("SELECT status, replaced_by FROM persons WHERE id='PER-999996'"),
                         [("tombstone", "PER-999997")])

    def test_names(self):
        self.assertEqual(self.q("SELECT name FROM names WHERE record_id='PER-999997' AND kind='epithet'"),
                         [("Te Kōwhai Whakamātautau",)])

    def test_claims_citations_and_flags(self):
        self.assertEqual(self.q("SELECT count(*) FROM claims WHERE subject_id='PER-999997'")[0][0], 5)
        self.assertEqual(self.q("SELECT source_id, access FROM citations WHERE claim_id='CLM-999901' ORDER BY seq"),
                         [("SRC-999901", "opened"), ("SRC-999902", "excerpt")])

    def test_reverse_links(self):
        # part_of has a reverse name in the vocabulary
        self.assertEqual(self.q("SELECT from_id, relation, reverse_name_known FROM relationship_links "
                                "WHERE relationship_id='REL-999902' AND direction='reverse'"),
                         [("WAR-999901", "includes", 1)])
        self.assertEqual(self.q("SELECT from_id, to_id, relation, reverse_name_known FROM relationship_links "
                                "WHERE relationship_id='REL-999901' AND direction='reverse'"),
                         [("BAT-999901", "PER-999997", "commanded_by", 1)])

    def test_every_vocabulary_relation_has_a_reverse(self):
        vocab = json.loads((REPO / "schema" / "vocab" / "relations.json").read_text(encoding="utf-8"))
        relations = {r for group in vocab["relations"].values() for r in group}
        self.assertEqual(relations - set(vocab["reverse"]), set())
        self.assertEqual(vocab["reverse"]["served_under"], "superior_of")  # not "commanded" (clashed with person-battle)
        for symmetric in ("spouse_of", "sibling_of", "allied_with", "rival_of"):
            self.assertEqual(vocab["reverse"][symmetric], symmetric)
        self.assertEqual(self.q("SELECT count(*) FROM relationships")[0][0], 2)

    def test_full_text_search_ignores_diacritics(self):
        self.assertEqual(self.q("SELECT record_id FROM search WHERE search MATCH 'kowhai'"), [("PER-999997",)])
        self.assertEqual(self.q("SELECT record_id FROM search WHERE search MATCH 'vanguard'"), [("PER-999997",)])
        self.assertEqual(self.q("SELECT record_id FROM search WHERE search MATCH 'summary:fictional AND war'"),
                         [("WAR-999901",)])

    def test_build_stops_on_validation_errors(self):
        out = Path(self.tmp.name) / "bad.sqlite"
        with redirect_stdout(io.StringIO()):
            code = build_db.main(["--root", str(REPO / "tests" / "invalid" / "grade-b-uncited"), "--out", str(out)])
        self.assertEqual(code, 1)
        self.assertFalse(out.exists())

    def test_rebuild_replaces_old_database(self):
        out = Path(self.tmp.name) / "again.sqlite"
        out.write_text("not a database")
        with redirect_stdout(io.StringIO()):
            build_db.main(["--root", str(REPO / "tests" / "valid"), "--out", str(out)])
        con = sqlite3.connect(out)
        self.assertEqual(con.execute("SELECT count(*) FROM persons").fetchone()[0], 3)
        con.close()


if __name__ == "__main__":
    unittest.main()
