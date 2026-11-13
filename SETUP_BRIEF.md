# First task for Claude Code

Read CLAUDE.md first. This repository already contains the folder structure, JSON Schemas (schema/)
and vocabularies (schema/vocab/). The design was approved in a separate planning conversation; do not
change the schemas without asking me.

Work through these steps in order and stop after each step to show me what you did.

## Step 1 — Environment
Check that Python 3.11+ is available. Create a virtual environment in .venv and install `jsonschema`.
Add a requirements.txt. Do not install anything else without asking.

## Step 2 — scripts/validate.py
Validate every JSON file in data/ and report all problems at once, with file names. Checks:
1. Each record validates against its schema (resolve $refs to common.schema.json with a referencing Registry).
   Claims files use claims-file.schema.json; relationships files use relationships-file.schema.json.
2. The file name equals the record ID, and the ID prefix matches the folder and the record type.
3. Every referenced ID exists somewhere in data/ (referential integrity), including citations' source_id.
4. Slugs are unique within each type. IDs are unique across the whole database.
5. Dates: earliest <= latest.
6. Grade rules for claims:
   - A requires at least 2 citations to sources that are independent (neither derives_from the other,
     directly or indirectly) and at least one citation with access "opened".
   - B requires at least 1 citation.
   - A claim with no citations cannot be above C.
7. A record's overall certainty is not better than its weakest core claim, where core claims are the
   claims whose field is "identity", "active_period", "main_battles" (commander) or "main_works" (author).
   Report this as a warning, not an error, when core claims are missing.
8. Tombstones must have replaced_by pointing to an existing record.
Exit code 0 when clean, 1 when there are errors. Also run it against tests/valid (must pass) and
tests/invalid (must fail), and add a test for each rule.

## Step 3 — scripts/new_record.py
`python scripts/new_record.py person "Joan of Arc"` finds the next free ID for that type, writes a
blank record with all required fields, a slug, status "draft" and today's date, and prints the path.

## Step 4 — scripts/build_db.py
Compile all JSON into build/warriors.sqlite: one table per record type, plus claims, citations,
relationships (with generated reverse links using schema/vocab/relations.json), names, and an FTS5
full-text index over names, summaries and profile text. Rebuild from scratch each time.

## Step 5 — Convert the five pilot profiles
docs/pilot/ contains five pilot profiles exported from the planning conversation as Markdown
(Joan of Arc, Hannibal Barca, Sundiata Keita, Sun Tzu, Te Rauparaha). Convert each into records:
- the person record (PER-000001 to PER-000005, in that order),
- their claims (the CLM numbers in the docs), sources (the SRC numbers in the docs),
- the battles, wars, polities and places they mention, as new records with fresh IDs,
- relationships between them,
- WRK-000001 for The Art of War.
Keep every grade, flag, claim type and evidence status exactly as in the docs. If something in a doc
does not fit the schema, list it and ask me; do not drop or invent anything.
Then run the validator and show me the result. Expect warnings where the docs themselves say a
claim still needs a second source; do not "fix" these by changing grades.

## Step 6 — Git
Initialise git (if not already), commit with a clear message, and push to my GitHub repository
when I give you its address.
