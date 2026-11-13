#!/usr/bin/env python3
"""Create a new blank record with the next free permanent ID.

Usage:
    python scripts/new_record.py person "Joan of Arc"
    python scripts/new_record.py polity "Ngāti Toa Rangatira" --slug ngati-toa
    python scripts/new_record.py claim          # prints the next CLM ID (claims live in data/claims/<subject>.json)
    python scripts/new_record.py relationship   # prints the next REL ID

The next ID is one higher than the highest ID with that prefix that appears ANYWHERE in data/
(file names, record IDs, references, even IDs mentioned in notes). Gaps are never filled, so an ID
is never reused or recycled, including IDs of tombstones.

Fields that need a human judgement (certainty, active_period, core_claim_set, battle kind,
source_type) are written as null on purpose: we never guess them. The validator will list them
as SCHEMA errors until they are filled in.
"""
from __future__ import annotations

import argparse
import datetime
import json
import re
import sys
import unicodedata
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DEFAULT_ROOT = REPO / "data"

# type -> (prefix, folder)
RECORD_TYPES = {
    "person": ("PER", "persons"),
    "civilisation": ("CIV", "civilisations"),
    "polity": ("POL", "polities"),
    "battle": ("BAT", "battles"),
    "war": ("WAR", "wars"),
    "equipment": ("EQP", "equipment"),
    "tactic": ("TAC", "tactics"),
    "period": ("PRD", "periods"),
    "place": ("PLC", "places"),
    "source": ("SRC", "sources"),
    "work": ("WRK", "works"),
}
ID_ONLY_TYPES = {"claim": "CLM", "relationship": "REL"}

BLANK_DATE = {"earliest": None, "latest": None, "precision": None, "display": "", "certainty": None}

# Required type-specific fields (from schema/*.schema.json), left for a human to fill in.
TYPE_REQUIRED = {
    "person": {"core_claim_set": None, "active_period": BLANK_DATE},
    "battle": {"kind": None},
    "source": {"source_type": None, "bias_notes": "", "derives_from": []},
}

# Letters that Unicode decomposition does not reduce to a base Latin letter.
SPECIAL_LETTERS = {"đ": "d", "ð": "d", "ł": "l", "ø": "o", "æ": "ae", "œ": "oe", "ß": "ss", "þ": "th", "ı": "i"}


def slugify(name: str) -> str:
    text = "".join(SPECIAL_LETTERS.get(ch, ch) for ch in name.lower())
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9]+", "-", text.replace("'", "").replace("’", ""))
    return text.strip("-")


def next_id(root: Path, prefix: str) -> str:
    pattern = re.compile(rf"\b{prefix}-([0-9]{{6}})\b")
    highest = 0
    for f in root.rglob("*.json"):
        for text in (f.stem, f.read_text(encoding="utf-8-sig", errors="replace")):
            for m in pattern.finditer(text):
                highest = max(highest, int(m.group(1)))
    if highest >= 999_999:
        raise SystemExit(f"error: no {prefix} IDs left")
    return f"{prefix}-{highest + 1:06d}"


def slug_in_use(root: Path, folder: str, slug: str) -> Path | None:
    for f in (root / folder).glob("*.json"):
        try:
            if json.loads(f.read_text(encoding="utf-8-sig")).get("slug") == slug:
                return f
        except (json.JSONDecodeError, AttributeError):
            continue
    return None


def blank_record(rtype: str, rid: str, name: str, slug: str, today: str) -> dict:
    record = {
        "id": rid,
        "type": rtype,
        "slug": slug,
        "primary_name": name,
        "names": [{"name": name, "kind": "primary", "preferred": True}],
        "summary": "",
        "certainty": None,
        "status": "draft",
        "updated": today,
    }
    record.update(json.loads(json.dumps(TYPE_REQUIRED.get(rtype, {}))))  # deep copy
    return record


def main(argv=None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Create a new blank record with the next free ID.")
    parser.add_argument("type", choices=sorted(RECORD_TYPES) + sorted(ID_ONLY_TYPES))
    parser.add_argument("name", nargs="?", help="primary name (required for record types)")
    parser.add_argument("--slug", help="override the generated slug")
    parser.add_argument("--root", default=str(DEFAULT_ROOT), help="database folder (default: data/)")
    args = parser.parse_args(argv)
    root = Path(args.root)

    if args.type in ID_ONLY_TYPES:
        print(next_id(root, ID_ONLY_TYPES[args.type]))
        return 0

    if not args.name or not args.name.strip():
        parser.error(f"a primary name is required for type '{args.type}'")
    name = args.name.strip()
    prefix, folder = RECORD_TYPES[args.type]

    slug = args.slug or slugify(name)
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", slug):
        print(f"error: cannot make a valid slug from '{name}'; pass one with --slug", file=sys.stderr)
        return 1
    clash = slug_in_use(root, folder, slug)
    if clash:
        print(f"error: slug '{slug}' is already used by {clash.name}; pass a different one with --slug",
              file=sys.stderr)
        return 1

    rid = next_id(root, prefix)
    path = root / folder / f"{rid}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    record = blank_record(args.type, rid, name, slug, datetime.date.today().isoformat())
    with path.open("x", encoding="utf-8", newline="\n") as fh:  # "x": never overwrite an existing file
        fh.write(json.dumps(record, indent=2, ensure_ascii=False) + "\n")

    try:
        print(path.resolve().relative_to(REPO).as_posix())
    except ValueError:
        print(path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
