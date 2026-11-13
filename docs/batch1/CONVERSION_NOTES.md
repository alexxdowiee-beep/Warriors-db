# Batch 1 conversion notes

Converted 13 Nov 2026 from the five docs in this folder (moved here from `docs/pilot/`). The JSON records in
`data/` are the source of truth; these docs are historical drafts. Every temporary label and the ID it became
is in [ID_MAP.md](ID_MAP.md).

## What was created

| Records | IDs |
| --- | --- |
| Persons | PER-000006 Genghis Khan, 007 Subutai, 008 Baibars, 009 Trần Hưng Đạo, 010 Timur |
| Claims | CLM-000120–274: 106 from the claims tables, 49 from the myths tables |
| Sources | SRC-000046–099 (54 records for 62 labels) |
| Wars | WAR-000015–027 (13) |
| Battles | BAT-000033–060 (28) |
| Polities | POL-000033–054 (22), plus the 7 shared polities from step 2 (POL-000026–032) |
| Civilisations | CIV-000002 Arabic-speaking world, plus Kipchaks from step 2 (CIV-000001) |
| Places | PLC-000034–054 (21) |
| Relationships | REL-000055–114 (60) |

## Rules followed

- **The claims tables are the authority** for grade, claim type, flags, perspective and quiz kind, which are copied
  as written. Where the record card and the claims table differ, the claims table wins:
  - Genghis Khan's death year: card A, claim GK-C15 B, so stored as B.
  - Genghis Khan's active period: card A, claim GK-C02 B, so stored as B.
  - Subutai's birth: card "B for the decade, C for the year"; claim SB-C04 C, so stored as C.
- **Verdict** for claims-table rows: A or B → `accepted`; C or D → `disputed` (as in the pilot).
- **evidence_status** is the doc's citations cell, with each label replaced by its source ID. Grades with a
  qualifier keep it there (e.g. BB-C16 "A (year C)").
- **Citations**: one per source label in the citations cell. Where the cell gives no access level (e.g. TH-C02
  "S06; S10"), the access comes from the doc's sources table: Yes, Abstract or "Extract and notes" → `opened`;
  Excerpts or "Catalogue page only" → `excerpt`; "Via …" → `via-secondary`; No → `not-opened`. Notes in brackets
  ("abstract", "quoting S01", "popular part") go in the citation's `note`.
- **Sources named in a cell that have no row in a sources table** are not stored as sources. They stay in
  evidence_status: Wikipedia (SB-C04; the doc says "not stored as a source"), EBSCO (BB-C06, BB-C22), Larousse and
  World History Encyclopedia (TM-C13, TM-C20).
- **Myth rows** become claims with field `myth`, claim type `event`, the popular claim as the statement, quiz kind
  `myth-busting`, and "Myths table verdict: … Evidence: …" as evidence_status. A citation is added only where the
  Evidence column names a source.
  - BB-M02 is stored as C, as its doc says ("uncited verdicts (M02) drop to C under the rule").
  - Three rows repeat a claim and link it instead of duplicating it: SB-M09 = SB-C19, BB-M07 = BB-C21,
    TM-M04 = TM-C12.
- **Alternatives** (rule 5) linked both ways: GK-C04/C05 (birth year), SB-C07/C08 (1223 or 1224), TM-C04/C05 and
  TM-C04/TM-M01 (birth year), TH-C12/TH-M02 (Yuan army size).
- **Profiles**: the docs' prose is copied verbatim into the person's `profile` sections; the battle tables are
  appended to `military_career`. The research note and "The evidence" go in `evidence_note`. The record card,
  "Compare with" and the batch notes go in `editor_notes`.

## Judgement calls (please check)

1. **Merged sources.** One record each, as the docs mark them: Secret History (GK-S01 = SB-S02), Rashid al-Din
   (GK-S03 = SB-S03 = BB-S04), Ibn al-Athir (GK-S06 = SB-S06) and May 2008 (GK-S09 = SB-S07 = BB-S09 = TM-S15).
   I also merged the *Yuan shi* (TH-S02 into GK-S04), which the docs don't mark. Subutai's biography chapters
   (SB-S01) stay a separate record.
2. **Myth verdicts.** The pilot's `rejected-myth` labels (False, Untraced, Literary) now also include five new labels:
   Fabricated, Outdated, Inflated, Legend and Anachronistic. Everything else is `disputed`: Misleading, Disputed,
   Unsupported, Overstated, Unproven, Tradition, Reported and Oversimplified.
3. **Source types and tiers.**
   - Primary-material types: TH-S04 "primary-contemporary (attributed)" → `primary-contemporary`, graded C for the
     attribution. SB-S01 "primary-later (translation of a Mongol original)" → `primary-later`.
   - AI-generated page: SB-S12 was typed `other` in the doc, which predates the type, and is now `ai-generated`.
   - Tiers: TH-S10 WarHistory.org → `aggregator`; GK-S12 National Geographic and BB-S11 Kazakh government page →
     `popular`.
4. **derives_from.**
   - Recorded:
     - TH-S10 → TH-S08 (the doc says "Probably S08", in its derives-from column)
     - BB-S08 → BB-S12 (Smith reviews Amitai-Preiss)
     - SB-S10 → SB-S01, GK-S08 → GK-S01, GK-S12 → GK-S10, TM-S03 → TM-S01, BB-S03 → BB-S01 and S02
   - Not recorded, because the shared origin is a lost record with no source record of its own (noted in
     `reliability_notes`): Rashid al-Din and the Secret History ("partly Mongol records shared with S01"), the
     Yuan shi (Yuan court records), SB-S01 (a lost Mongolian biography), TH-S01 (earlier Trần records).
   - Not expressible: SB-S08 and SB-S09 share an author, which the doc says makes them not independent.
     derives_from can't say "same author"; no A-grade claim relies on that pair.
5. **Source grades** (how certain authorship and dating are, per the pilot rule). Modern works, named authors and
   dated official histories are A. These are graded B: group records (GK-S07, SB-S04, SB-S05, BB-S03, BB-S05,
   TM-S09), the Secret History, oral traditions, the Kazakh page and WarHistory.org (no author named). TH-S04 is C
   (attribution unchecked). The three AI pages are D.
6. **Polities created for perspectives.** perspective_of needs a polity or civilisation ID.
   - Modern states: Mongolia, Vietnam, Uzbekistan.
   - Regions: Syria and Iran, created as polities.
   - Civilisation: the Arabic-speaking world.
   - Existing records reused: "Hungary" is the Kingdom of Hungary, "Rus'" the Rus' principalities, "Jin" the Jin
     dynasty, "Khwarazm" the Khwarazmian Empire.
   - Polity types are set only where the name says so (kingdom, sultanate) or for the military orders (`other`).
7. **Persons.**
   - Status `sourced`; the docs give no status.
   - Roles: "founder" and "royal prince" have no matching role, so founding is stored as a `founded` relationship
     (as for Sundiata). Genghis Khan and Timur: ruler, commander. Baibars: commander, ruler. Subutai and
     Trần Hưng Đạo: commander.
   - Dynasty "Trần" and "Timurid".
   - Baibars has civilisation Kipchaks.
   - Death places: Damascus (Baibars) and Otrar (Timur). Genghis Khan's death is a `died_at` link to the siege of
     Zhongxing, not a death place.
   - Birth places are not stored; Kesh is "traditionally" only.
8. **Relationships.** The relation comes from the battle table's role column; the role text is copied.
   - "Part of Batu's army" → `participated`.
   - Trần Hưng Đạo's role "Uncertain" in 1257–58 → `participated`, C.
   - Baibars' "Sent his army" (Cilician Armenia) → `planned`.
   - Every other role → `commanded`.
   - Baibars `affected_by` the great western campaign (B, claim BB-C05).
   - Subutai `served_under` Genghis Khan (A, claim SB-C01).
   - compare_with: 8 links between people who now have records (A, reasons from the docs). This includes
     Subutai–Hannibal, which Hannibal's pilot notes listed as pending.
9. **Battles and wars.**
   - Kinds, dates, results and grades come from the battle tables.
   - Date certainties that differ from the battle grade:
     - BB-B06 Krak: year C ("1270 or 1271")
     - BB-B07 Anatolia: year C (the prose: Britannica 1276, Smith 1277)
   - Site certainty C with no place stored: TM-B01 (Terek or Kur) and TM-B02 (Panipat or outside Delhi).
   - The Khwarazm war uses the Genghis Khan doc's span, 1218–1221; Subutai's table says 1219–1221.
   - The three Đại Việt invasions get "of Đại Việt" added to their names.
   - Army sizes are not stored (all `unknown` in the docs).
10. **Place grades** (location certainty):
    - A: cities, rivers and castles that exist today
    - B: Zhongdu and Zhongxing (historical capitals under or near modern cities), Ryazan (the 1237 city is not
      today's Ryazan), Kalka River, Ain Jalut, Chương Dương and Tây Kết (sites known by battle name only)

## Not created (named in the docs' notes, not in their tables)

- The Mamluk–Ilkhanid war, and the places Bukhara, Samarkand, Kesh and Thăng Long.
- People: Jebe, Batu, Ögödei, Toghril, Jalal al-Din, Qutuz, Kitbuqa, Kublai Khan, Toghan, Trần Quang Khải,
  Tokhtamysh, Bayezid I. They appear in text, side labels and relationship roles only.

## Answers applied (13 Nov 2026)

- **Core fields.** SB-C18 (CLM-000172) field `identity` → `evidence`; GK-C23 (CLM-000142) `identity` → `names`.
  New validator warning `CORE_TYPE`: a claim with a core field (identity, active_period, main_battles,
  main_works) should be claim_type `event` or `interpretation`.
- **Citations added** to uncited claims, from sources already in the database (each noted in evidence_status):
  - GK-M01 (CLM-000145): May, SRC-000054
  - BB-M03 (CLM-000208): May, SRC-000054
  - BB-M04 (CLM-000209): Britannica, SRC-000073
  - BB-M08 (CLM-000212): Britannica, SRC-000073
  - TH-M06 (CLM-000239) and TH-M07 (CLM-000240): WarHistory.org, SRC-000084
- **New sources for TM-C20** (CLM-000262, stays B):
  - SRC-000100 Larousse, "Timur Lang": reference tier, excerpt
  - SRC-000101 World History Encyclopedia, "Timur": popular tier, excerpt

  Both are graded B, because the URL, author and date are not recorded.
- **Lowered to C** ("Doc grade X; restore when cited"): GK-M06 (CLM-000150, was A), SB-M04 (CLM-000178, was B),
  SB-C13 (CLM-000167, was B).
- **Single-source A grades** stay as warnings: the to-do list for second sources.

## Validator after the answers

0 errors, 24 warnings: the 14 from the pilot and 10 on batch 1 A grades that need a second independent source
(or, for BB-C22, an opened copy of the *Sirat Baybars*).
