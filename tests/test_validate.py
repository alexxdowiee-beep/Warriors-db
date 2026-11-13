"""Tests for scripts/validate.py.

Run:  .venv\\Scripts\\python.exe -m unittest discover -s tests -v

tests/valid/            a small fictional database that must pass (warnings allowed)
tests/invalid/<case>/   one small database per rule; each must fail with exactly the error codes below
"""
import subprocess
import sys
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "scripts"))

from validate import DatabaseValidator, load_validators  # noqa: E402

VALIDATORS = load_validators()

# case folder -> exact set of error codes it must produce
INVALID_CASES = {
    "schema": {"SCHEMA", "DATE"},                 # rule 1 (the original fixture also has reversed dates)
    "filename-mismatch": {"FILENAME"},            # rule 2
    "wrong-folder": {"PREFIX", "SCHEMA"},         # rule 2 (a person stored in places/)
    "broken-reference": {"REF"},                  # rule 3
    "missing-citation-source": {"REF"},           # rule 3, citations' source_id
    "duplicate-slug": {"DUP_SLUG"},               # rule 4
    "duplicate-id": {"DUP_ID"},                   # rule 4 (same claim ID in two files)
    "date-order": {"DATE"},                       # rule 5
    "grade-a-dependent": {"GRADE_A"},             # rule 6 (subject verified), sources derive from each other
    "grade-a-not-opened": {"GRADE_A"},            # rule 6 (subject verified), nothing opened
    "grade-b-uncited": {"GRADE_UNCITED"},         # rule 6 (subject verified)
    "core-grade": {"CORE_GRADE"},                 # rule 7
    "tombstone-no-target": {"TOMBSTONE"},         # rule 8
    "tombstone-dangling": {"TOMBSTONE"},          # rule 8
    "json-syntax": {"JSON"},
    "territory-file": {"NO_SCHEMA"},
    "unknown-folder": {"UNKNOWN_FOLDER"},
}


def run(root):
    v = DatabaseValidator(root, VALIDATORS)
    v.run()
    return v


class ValidTree(unittest.TestCase):
    def test_valid_tree_has_no_errors(self):
        v = run(REPO / "tests" / "valid")
        self.assertEqual([str(e) for e in v.errors], [])

    def test_missing_core_claims_is_a_warning_not_an_error(self):  # rule 7
        v = run(REPO / "tests" / "valid")
        missing = [w for w in v.warnings if w.code == "CORE_MISSING"]
        self.assertEqual(len(missing), 1)
        self.assertIn("PER-999999", missing[0].file)

    def test_grade_rule_is_a_warning_before_verification(self):  # rule 6
        v = run(REPO / "tests" / "valid")
        uncited = [w for w in v.warnings if w.code == "GRADE_UNCITED"]
        self.assertEqual(len(uncited), 1)
        self.assertIn("CLM-999920", uncited[0].message)

    def test_rejected_myth_does_not_lower_core_grade(self):  # rule 7
        v = run(REPO / "tests" / "valid")
        self.assertFalse([e for e in v.errors if e.code == "CORE_GRADE"])

    def test_data_folder_passes(self):
        v = run(REPO / "data")
        self.assertEqual([str(e) for e in v.errors], [])


class InvalidCases(unittest.TestCase):
    def test_every_case_folder_is_covered(self):
        on_disk = {p.name for p in (REPO / "tests" / "invalid").iterdir() if p.is_dir()}
        self.assertEqual(on_disk, set(INVALID_CASES))

    def test_cases(self):
        for case, expected in INVALID_CASES.items():
            with self.subTest(case=case):
                v = run(REPO / "tests" / "invalid" / case)
                self.assertEqual({e.code for e in v.errors}, expected, "\n".join(map(str, v.issues)))


class CommandLine(unittest.TestCase):
    def _exit(self, *args):
        return subprocess.run([sys.executable, str(REPO / "scripts" / "validate.py"), *args],
                              capture_output=True, text=True, encoding="utf-8").returncode

    def test_exit_0_when_clean(self):
        self.assertEqual(self._exit(str(REPO / "tests" / "valid")), 0)

    def test_exit_1_on_errors(self):
        self.assertEqual(self._exit(str(REPO / "tests" / "invalid" / "grade-b-uncited")), 1)


if __name__ == "__main__":
    unittest.main()
