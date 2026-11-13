#!/usr/bin/env python3
"""Validate the Warriors & Leaders JSON database.

Usage:
    python scripts/validate.py            # validates data/
    python scripts/validate.py <root>     # validates another tree with the same layout (e.g. tests/valid)

Reports every problem at once. Exit code 0 when there are no errors (warnings allowed), 1 otherwise.

Checks (numbers follow SETUP_BRIEF.md, Step 2):
  1 SCHEMA         record / claims file / relationships file validates against its JSON Schema
  2 FILENAME       file name equals the record ID (or the subject ID for claims/relationships files)
    PREFIX         ID prefix and record type match the folder
  3 REF            every referenced ID exists somewhere in the tree (incl. citations' source_id)
  4 DUP_SLUG       slugs are unique within each record type
    DUP_ID         IDs (records, claims, relationships) are unique across the whole tree
  5 DATE           earliest <= latest in every historicalDate
  6 GRADE_A        an A claim needs 2+ independent sources (neither derives from the other, and no
                   common source), at least one of the pair with reliability_tier scholarly or
                   reference, and at least one citation with access "opened". A text or tradition
                   claim instead needs one opened copy of the document or tradition itself.
    GRADE_UNCITED  a claim with no citations cannot be above C (so B needs at least one citation)
                   Rule 6 is an error once the claim's subject is "verified" or "reviewed";
                   while the subject is "draft" or "sourced" it is a warning.
  7 CORE_GRADE     a record's certainty is not better than its weakest core claim
    CORE_MISSING   (warning) core claims are missing for the record's core_claim_set
    CORE_TYPE      (warning) a claim with a core field (identity, active_period, main_battles, main_works)
                   should be claim_type event or interpretation, not text or tradition
  8 TOMBSTONE      a tombstone has replaced_by pointing to an existing record
  9 AI_SOURCE      an ai-generated source may be cited only by a claim with verdict "rejected-myth";
                   source_type ai-generated and reliability_tier ai-generated go together
 10 TIER           reliability_tier may be null only for primary material (PRIMARY_MATERIAL)
Housekeeping: JSON (unreadable file), DUP_KEY (duplicate key in a JSON object), UNKNOWN_FOLDER,
NO_SCHEMA (file in a folder without a schema yet), and warnings STRAY_FILE, REL_SUBJECT, REPLACED_BY.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

REPO = Path(__file__).resolve().parent.parent
SCHEMA_DIR = REPO / "schema"
DEFAULT_ROOT = REPO / "data"

ID_RE = re.compile(r"^(PER|CIV|POL|BAT|WAR|EQP|TAC|PRD|PLC|SRC|WRK|CLM|REL)-[0-9]{6}$")
GRADES = "ABCDE"  # best to worst
# Statuses at which claim grade rules (rule 6) are errors; below these they are warnings.
ENFORCED_STATUSES = {"verified", "reviewed"}
# Source types that count as the document or tradition itself (or a translation or record of it)
# for text and tradition claims (rule 6).
RECORD_OF_DOCUMENT = {"primary-contemporary", "primary-later", "archaeological", "oral-tradition", "statute", "translation"}
# Source types with no reliability_tier (null): the material itself, judged through bias_notes (rule 10).
PRIMARY_MATERIAL = {"primary-contemporary", "primary-later", "archaeological", "oral-tradition", "statute"}
# Tiers that can anchor an A grade: one of the two independent sources must have one (rule 6).
ANCHOR_TIERS = {"scholarly", "reference"}

# folder -> (ID prefix, record type); schema file is "<type>.schema.json"
RECORD_FOLDERS = {
    "persons": ("PER", "person"),
    "civilisations": ("CIV", "civilisation"),
    "polities": ("POL", "polity"),
    "battles": ("BAT", "battle"),
    "wars": ("WAR", "war"),
    "equipment": ("EQP", "equipment"),
    "tactics": ("TAC", "tactic"),
    "periods": ("PRD", "period"),
    "places": ("PLC", "place"),
    "sources": ("SRC", "source"),
    "works": ("WRK", "work"),
}
# folder -> (list key in the file, schema file)
GROUPED_FOLDERS = {
    "claims": ("claims", "claims-file.schema.json"),
    "relationships": ("relationships", "relationships-file.schema.json"),
}
# Folders that exist but have no prefix or schema yet: any file placed in them is an error.
RESERVED_FOLDERS = {"territories"}

CORE_FIELDS = {
    "commander": ("identity", "active_period", "main_battles"),
    "author": ("identity", "active_period", "main_works"),
}


@dataclass
class Issue:
    level: str  # "error" | "warning"
    code: str
    file: str
    message: str

    def __str__(self) -> str:
        return f"{self.level.upper():7} [{self.code}] {self.file}: {self.message}"


def display_path(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO).as_posix()
    except ValueError:
        return str(path)


def load_validators() -> dict[str, Draft202012Validator]:
    """One validator per schema file, with $refs resolved through a shared Registry."""
    contents = {}
    for p in sorted(SCHEMA_DIR.glob("*.schema.json")):
        schema = json.loads(p.read_text(encoding="utf-8"))
        Draft202012Validator.check_schema(schema)
        contents[schema.get("$id", p.name)] = schema
    registry = Registry().with_resources(
        (uri, Resource.from_contents(s, default_specification=DRAFT202012)) for uri, s in contents.items()
    )
    return {
        uri: Draft202012Validator(s, registry=registry, format_checker=FormatChecker())
        for uri, s in contents.items()
    }


def walk(obj, path="$"):
    """Yield (json_path, value) for every node in a JSON document."""
    yield path, obj
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk(v, f"{path}[{i}]")


class DuplicateKeyCollector:
    def __init__(self):
        self.duplicates: list[str] = []

    def __call__(self, pairs):
        seen = {}
        for k, v in pairs:
            if k in seen:
                self.duplicates.append(k)
            seen[k] = v
        return seen


@dataclass
class LoadedFile:
    path: Path
    kind: str  # "record" | "claims" | "relationships"
    data: dict
    definition_paths: set  # JSON paths whose ID string defines (not references) an ID


class DatabaseValidator:
    def __init__(self, root: Path, validators: dict[str, Draft202012Validator] | None = None):
        self.root = Path(root)
        self.validators = validators or load_validators()
        self.issues: list[Issue] = []
        self.files: list[LoadedFile] = []
        self.defined: dict[str, list[str]] = defaultdict(list)  # ID -> places it is defined
        self.records: dict[str, LoadedFile] = {}
        self.claims: dict[str, tuple[dict, str, Path]] = {}  # CLM -> (claim, subject, path)
        self.claims_by_subject: dict[str, list[dict]] = defaultdict(list)
        self.slugs: dict[tuple[str, str], list[str]] = defaultdict(list)
        self.file_count = 0

    # ---------------------------------------------------------------- reporting
    def error(self, code, path, message):
        self.issues.append(Issue("error", code, display_path(path), message))

    def warning(self, code, path, message):
        self.issues.append(Issue("warning", code, display_path(path), message))

    @property
    def errors(self):
        return [i for i in self.issues if i.level == "error"]

    @property
    def warnings(self):
        return [i for i in self.issues if i.level == "warning"]

    # ---------------------------------------------------------------- run
    def run(self) -> list[Issue]:
        if not self.root.is_dir():
            self.error("UNKNOWN_FOLDER", self.root, "root folder does not exist")
            return self.issues
        self.load_tree()
        self.check_unique_ids_and_slugs()  # rule 4
        self.check_references()  # rule 3
        self.check_dates()  # rule 5
        self.check_claim_grades()  # rule 6
        self.check_core_claims()  # rule 7
        self.check_tombstones()  # rule 8
        self.check_sources()  # rules 9 and 10
        return self.issues

    # ---------------------------------------------------------------- loading (rules 1 and 2)
    def load_tree(self):
        for entry in sorted(self.root.iterdir()):
            if entry.name.startswith("."):
                continue
            if entry.is_file():
                self.warning("STRAY_FILE", entry, "file outside any record folder is ignored")
                continue
            name = entry.name
            if name not in RECORD_FOLDERS and name not in GROUPED_FOLDERS and name not in RESERVED_FOLDERS:
                self.error("UNKNOWN_FOLDER", entry, "folder is not a known record folder; its files are not validated")
                continue
            for f in sorted(entry.iterdir()):
                if f.name.startswith("."):
                    continue
                if f.is_dir():
                    self.error("UNKNOWN_FOLDER", f, "record folders must not contain subfolders")
                    continue
                if f.suffix != ".json":
                    self.warning("STRAY_FILE", f, "non-JSON file is ignored")
                    continue
                self.file_count += 1
                if name in RESERVED_FOLDERS:
                    self.error("NO_SCHEMA", f, f"'{name}/' has no ID prefix or schema yet; records cannot be stored here")
                    continue
                data = self.read_json(f)
                if data is None:
                    continue
                if name in RECORD_FOLDERS:
                    self.load_record(f, name, data)
                else:
                    self.load_grouped(f, name, data)

    def read_json(self, f: Path):
        collector = DuplicateKeyCollector()
        try:
            data = json.loads(f.read_text(encoding="utf-8-sig"), object_pairs_hook=collector)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            self.error("JSON", f, f"cannot be read as JSON: {exc}")
            return None
        for key in collector.duplicates:
            self.error("DUP_KEY", f, f"key '{key}' appears more than once in the same object")
        if not isinstance(data, dict):
            self.error("SCHEMA", f, "top level must be a JSON object")
            return None
        return data

    def schema_check(self, f: Path, data: dict, schema_uri: str):
        validator = self.validators[schema_uri]
        unfilled = set()
        for err in sorted(validator.iter_errors(data), key=lambda e: [str(p) for p in e.absolute_path]):
            if err.instance is None and err.absolute_path:
                # A null placeholder (e.g. from new_record.py) fails several keywords; report it once.
                if err.json_path not in unfilled:
                    unfilled.add(err.json_path)
                    self.error("SCHEMA", f, f"{err.json_path}: not filled in (null)")
                continue
            self.error("SCHEMA", f, f"{err.json_path}: {err.message}")

    def load_record(self, f: Path, folder: str, data: dict):
        prefix, rtype = RECORD_FOLDERS[folder]
        self.schema_check(f, data, f"{rtype}.schema.json")

        rid = data.get("id")
        if rid != f.stem:
            self.error("FILENAME", f, f"file name '{f.stem}' does not equal record id '{rid}'")
        if not f.stem.startswith(prefix + "-"):
            self.error("PREFIX", f, f"files in '{folder}/' must be named {prefix}-NNNNNN.json")
        if isinstance(rid, str) and not rid.startswith(prefix + "-"):
            self.error("PREFIX", f, f"id '{rid}' does not have the {prefix}- prefix required in '{folder}/'")
        if data.get("type") != rtype:
            self.error("PREFIX", f, f"type '{data.get('type')}' does not belong in '{folder}/' (expected '{rtype}')")

        lf = LoadedFile(f, "record", data, {"$.id"})
        self.files.append(lf)
        if isinstance(rid, str):
            self.defined[rid].append(display_path(f))
            self.records.setdefault(rid, lf)
        slug = data.get("slug")
        if isinstance(slug, str):
            self.slugs[(str(data.get("type")), slug)].append(display_path(f))

    def load_grouped(self, f: Path, folder: str, data: dict):
        list_key, schema_uri = GROUPED_FOLDERS[folder]
        self.schema_check(f, data, schema_uri)

        subject = data.get("subject")
        if subject != f.stem:
            self.error("FILENAME", f, f"file name '{f.stem}' does not equal subject '{subject}'")
        if not ID_RE.match(f.stem):
            self.error("FILENAME", f, f"file name '{f.stem}' is not a record ID")

        definitions = set()
        items = data.get(list_key)
        if isinstance(items, list):
            for i, item in enumerate(items):
                if not isinstance(item, dict):
                    continue
                item_id = item.get("id")
                if not isinstance(item_id, str):
                    continue
                definitions.add(f"$.{list_key}[{i}].id")
                self.defined[item_id].append(f"{display_path(f)} ({list_key}[{i}])")
                if folder == "claims":
                    self.claims.setdefault(item_id, (item, subject, f))
                    self.claims_by_subject[subject].append(item)
                elif item.get("from_id") != subject:
                    self.warning(
                        "REL_SUBJECT", f,
                        f"{item_id}: from_id '{item.get('from_id')}' is not the file's subject '{subject}' "
                        "(relationships are stored once, on their subject)",
                    )
        self.files.append(LoadedFile(f, folder, data, definitions))

    # ---------------------------------------------------------------- rule 4
    def check_unique_ids_and_slugs(self):
        for rid, places in sorted(self.defined.items()):
            if len(places) > 1:
                self.error("DUP_ID", Path(places[0].split(" (")[0]),
                           f"id '{rid}' is defined {len(places)} times: {'; '.join(places)}")
        for (rtype, slug), places in sorted(self.slugs.items()):
            if len(places) > 1:
                self.error("DUP_SLUG", Path(places[0]),
                           f"slug '{slug}' is used by {len(places)} {rtype} records: {'; '.join(places)}")

    # ---------------------------------------------------------------- rule 3
    def check_references(self):
        for lf in self.files:
            for jpath, value in walk(lf.data):
                if not isinstance(value, str) or not ID_RE.match(value):
                    continue
                if jpath in lf.definition_paths:
                    continue
                if lf.kind == "record" and jpath == "$.replaced_by":
                    continue  # reported by the tombstone check (rule 8)
                if value not in self.defined:
                    self.error("REF", lf.path, f"{jpath} refers to '{value}', which does not exist")

    # ---------------------------------------------------------------- rule 5
    def check_dates(self):
        for lf in self.files:
            for jpath, value in walk(lf.data):
                if isinstance(value, dict) and "earliest" in value and "latest" in value:
                    e, l = value["earliest"], value["latest"]
                    if isinstance(e, int) and isinstance(l, int) and e > l:
                        self.error("DATE", lf.path, f"{jpath}: earliest ({e}) is later than latest ({l})")

    # ---------------------------------------------------------------- rule 6
    def source_ancestors(self) -> dict[str, set[str]]:
        """For each source, every source it derives from directly or indirectly."""
        direct = {}
        for rid, lf in self.records.items():
            if lf.data.get("type") == "source":
                df = lf.data.get("derives_from")
                direct[rid] = {s for s in df if isinstance(s, str)} if isinstance(df, list) else set()
        ancestors = {}
        for start in direct:
            seen, stack = set(), list(direct[start])
            while stack:
                s = stack.pop()
                if s in seen or s == start:
                    continue
                seen.add(s)
                stack.extend(direct.get(s, ()))
            ancestors[start] = seen
        return ancestors

    def check_claim_grades(self):
        ancestors = self.source_ancestors()

        def independent(a, b):
            # Neither derives from the other, and they share no source they both derive from.
            line_a = ancestors.get(a, set()) | {a}
            line_b = ancestors.get(b, set()) | {b}
            return a != b and not (line_a & line_b)

        source_types = {rid: lf.data.get("source_type") for rid, lf in self.records.items()
                        if lf.data.get("type") == "source"}
        tiers = {rid: lf.data.get("reliability_tier") for rid, lf in self.records.items()
                 if lf.data.get("type") == "source"}

        for cid, (claim, subject, f) in sorted(self.claims.items()):
            grade = claim.get("certainty")
            if grade not in GRADES:
                continue  # schema error already reported
            # Grade rules are enforced once the subject record is verified or reviewed. Before that
            # (draft, sourced) a breach is a warning: the evidence is still being gathered.
            subject_rec = self.records.get(subject)
            enforced = subject_rec is None or subject_rec.data.get("status") in ENFORCED_STATUSES
            report = self.error if enforced else self.warning
            citations = [c for c in claim.get("citations") or [] if isinstance(c, dict)]
            if not citations:
                if grade in "AB":
                    report("GRADE_UNCITED", f, f"{cid} is graded {grade} but has no citations (uncited claims cannot be above C)")
                continue
            if grade != "A":
                continue
            if claim.get("claim_type") in ("text", "tradition"):
                # A claim about what a document or tradition says needs one opened copy of it (or a
                # translation or record of it); corroboration is not needed. A modern summary does not count.
                if not any(c.get("access") == "opened" and source_types.get(c.get("source_id")) in RECORD_OF_DOCUMENT
                           for c in citations):
                    report("GRADE_A", f,
                           f"{cid} is a {claim.get('claim_type')} claim graded A but cites no opened copy of the "
                           f"document or tradition itself (source types: {', '.join(sorted(RECORD_OF_DOCUMENT))})")
                continue
            sources = sorted({c.get("source_id") for c in citations if c.get("source_id") in ancestors})
            pairs = [(a, b) for i, a in enumerate(sources) for b in sources[i + 1:] if independent(a, b)]
            if not pairs:
                report("GRADE_A", f,
                           f"{cid} is graded A but does not cite 2 independent sources "
                           f"(cited: {', '.join(sources) or 'none that exist'}; sources that derive from one another, "
                           f"or from a common source, count as one)")
            elif not any(tiers.get(a) in ANCHOR_TIERS or tiers.get(b) in ANCHOR_TIERS for a, b in pairs):
                report("GRADE_A", f,
                       f"{cid} is graded A but neither source of any independent pair is scholarly or reference "
                       f"(cited: {', '.join(f'{s} ({tiers.get(s) or 'primary'})' for s in sources)})")
            if not any(c.get("access") == "opened" for c in citations):
                report("GRADE_A", f, f"{cid} is graded A but no citation has access 'opened'")

    # ---------------------------------------------------------------- rule 7
    def check_core_claims(self):
        core_fields = {f for fields in CORE_FIELDS.values() for f in fields}
        for cid, (claim, _subject, f) in sorted(self.claims.items()):
            if claim.get("field") in core_fields and claim.get("claim_type") not in (None, "event", "interpretation"):
                self.warning("CORE_TYPE", f, f"{cid} has core field {claim.get('field')!r} but claim_type "
                             f"{claim.get('claim_type')!r}; a claim about what a source or tradition says should "
                             f"use another field")
        for rid, lf in sorted(self.records.items()):
            data = lf.data
            claim_set = data.get("core_claim_set")
            if claim_set not in CORE_FIELDS or data.get("status") == "tombstone":
                continue
            fields = CORE_FIELDS[claim_set]
            core = [
                c for c in self.claims_by_subject.get(rid, [])
                if c.get("field") in fields and c.get("verdict") != "rejected-myth" and c.get("certainty") in GRADES
            ]
            missing = [fld for fld in fields if not any(c.get("field") == fld for c in core)]
            if missing:
                self.warning("CORE_MISSING", lf.path,
                             f"no core claims for {', '.join(missing)} (core_claim_set '{claim_set}')")
            record_grade = data.get("certainty")
            if not core or record_grade not in GRADES:
                continue
            weakest = max(core, key=lambda c: GRADES.index(c["certainty"]))
            if GRADES.index(record_grade) < GRADES.index(weakest["certainty"]):
                self.error("CORE_GRADE", lf.path,
                           f"record is graded {record_grade} but its weakest core claim {weakest.get('id')} "
                           f"({weakest.get('field')}) is graded {weakest['certainty']}")

    # ---------------------------------------------------------------- rule 8
    # ---------------------------------------------------------------- rules 9 and 10
    def check_sources(self):
        sources = {rid: lf for rid, lf in self.records.items() if lf.data.get("type") == "source"}
        for rid, lf in sorted(sources.items()):
            stype, tier = lf.data.get("source_type"), lf.data.get("reliability_tier")
            if stype is None or "reliability_tier" not in lf.data:
                continue  # schema error already reported
            if (stype == "ai-generated") != (tier == "ai-generated"):
                self.error("AI_SOURCE", lf.path, f"source_type {stype} with reliability_tier {tier}: "
                           f"ai-generated must be both or neither")
            if tier is None and stype not in PRIMARY_MATERIAL:
                self.error("TIER", lf.path, f"reliability_tier is null but source_type {stype} is not primary "
                           f"material ({', '.join(sorted(PRIMARY_MATERIAL))}); choose a tier")
        ai = {rid for rid, lf in sources.items() if lf.data.get("source_type") == "ai-generated"}
        for cid, (claim, _subject, f) in sorted(self.claims.items()):
            if claim.get("verdict") == "rejected-myth":
                continue
            cited = sorted({c.get("source_id") for c in claim.get("citations") or []
                            if isinstance(c, dict) and c.get("source_id") in ai})
            if cited:
                self.error("AI_SOURCE", f, f"{cid} cites ai-generated source {', '.join(cited)} but its verdict is "
                           f"{claim.get('verdict')!r}; an ai-generated source may only be cited by a rejected-myth claim")

    def check_tombstones(self):
        for rid, lf in sorted(self.records.items()):
            data = lf.data
            target = data.get("replaced_by")
            if data.get("status") != "tombstone":
                if target is not None:
                    self.warning("REPLACED_BY", lf.path, "replaced_by is set but status is not 'tombstone'")
                    if target not in self.records:
                        self.error("REF", lf.path, f"$.replaced_by refers to '{target}', which is not an existing record")
                continue
            if target is None:
                self.error("TOMBSTONE", lf.path, "tombstone has no replaced_by")
            elif target == rid:
                self.error("TOMBSTONE", lf.path, "tombstone is replaced_by itself")
            elif target not in self.records:
                self.error("TOMBSTONE", lf.path, f"replaced_by '{target}' is not an existing record")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("root", nargs="?", default=str(DEFAULT_ROOT), help="tree to validate (default: data/)")
    args = parser.parse_args(argv)

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # macrons and diacritics on Windows consoles

    v = DatabaseValidator(Path(args.root))
    v.run()
    order = {"error": 0, "warning": 1}
    for issue in sorted(v.issues, key=lambda i: (order[i.level], i.file, i.code)):
        print(issue)
    print(f"\n{display_path(Path(args.root))}: {v.file_count} files checked, "
          f"{len(v.errors)} error(s), {len(v.warnings)} warning(s)")
    return 1 if v.errors else 0


if __name__ == "__main__":
    sys.exit(main())
