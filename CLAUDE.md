# Warriors & Leaders Database — rules for Claude Code

A long-term, globally balanced knowledge database of warriors, commanders, rulers and strategists,
built to become an interactive learning app (laptop first, phone layout). **Historical accuracy
always comes before interesting storytelling.**

## Non-negotiable research rules
1. Never invent a date, quotation, battle, number, name or source. "unknown" is a valid value.
2. Every important fact is a claim (CLM) with a certainty grade, a claim_type and citations.
3. A quotation is stored only with its primary source and a locator. Untraceable famous quotes go in myths.
4. Army sizes and casualties are quantity ranges, or "unknown". Keep the ancient claim separate from modern estimates.
5. Where sources disagree, store both claims and link them with alternative_claim_ids. Do not choose silently.
6. Atrocities and failures are recorded with the same evidence standard as victories: plainly, not sensationally.
7. Say what was actually read. citation.access is one of: opened, excerpt, via-secondary, not-opened.
   Anything written from memory stays status "draft" and cannot be graded above C until sourced.
8. Never change the user-facing conclusions of a reviewed record without asking the user.

## Certainty grades
- A Established: 2+ independent sources (neither derived from the other nor from a common source), at least one opened, at least one contemporary or archaeological, or scholarly consensus.
  For a text or tradition claim (what a document or tradition says), A needs one opened copy of the document or tradition itself, or a translation or record of it; a modern summary does not count.
- B Probable: one good source, or several later ones with a credible chain.
- C Disputed: credible sources or scholars disagree.
- D Weak: a single late, partisan or second-hand source.
- E Legendary or false.
Oral tradition is not downgraded for being oral; grade what it can support.

## Claim types
event (it happened) · tradition (what a tradition says) · text (what a document says) · interpretation (a historian's judgement).
"The epic says X" and "X happened" are separate claims with separate grades.
A myth claim (a popular claim checked against the evidence) is graded on how sure we are of its verdict, not on the popular claim itself.

## Bias flags (schema/vocab/bias-flags.json)
propaganda, hostile-source, hagiography, late-source, inflated-numbers, oral-tradition, translation-issue,
nationalist-reinterpretation, popular-culture, self-testimony, patron-bias.

## Overall record grade
A record's overall grade = its weakest core claim. Core claims depend on core_claim_set:
- commander: identity, active period, main battles
- author: identity, active period, main works
Use active period, not birth date.

## Sources
Every source has a SRC record with bias_notes and derives_from (source IDs it copies or depends on).
Two sources where one derives from the other count as ONE for grading.

## Perspectives and culture
- perspective_of on a claim records whose view it is (polity or civilisation IDs). Show contested events from each side.
- cultural_guidance on a record notes appropriate use of taonga, sacred material or knowledge held by a community
  as guardians. Do not reproduce such material (for example haka words) in quizzes or games.

## IDs and files
- IDs: three-letter prefix + hyphen + six digits (PER-000001). Permanent. Never reused, renamed or recycled.
  Prefixes: PER CIV POL BAT WAR EQP TAC PRD PLC SRC WRK CLM REL.
- One file per record: data/<folder>/<ID>.json, file name = ID.
- Claims and relationships are grouped per subject: data/claims/<subjectID>.json, data/relationships/<subjectID>.json.
- Each relationship is stored ONCE, on its subject; the build script creates reverse links.
- A deleted record becomes a tombstone (status "tombstone", replaced_by set). Never delete files.
- Always get new IDs from scripts/new_record.py.

## Dates
historicalDate objects. earliest/latest are astronomical years (1 BCE = 0, 2 BCE = -1). display shows BCE/CE.

## Style
New Zealand English spelling. Correct diacritics and macrons (Ngāti Toa, Trần Hưng Đạo). BCE/CE.
Summaries in our own words; no copying from sources beyond very short quotes.

## Commands
- python scripts/validate.py      — must pass before every commit
- python scripts/new_record.py <type> "<Primary name>"
- python scripts/build_db.py      — JSON to build/warriors.sqlite
- python scripts/export_app.py    — SQLite to app bundle (later phase)

## Workflow
draft → sourced → verified → reviewed (the user approves). Run the validator after every change.
Ask the user before changing any schema, vocabulary or this file.
