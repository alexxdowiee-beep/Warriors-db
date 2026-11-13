# Pilot conversion notes (Step 5, 13 Nov 2026)

How the five pilot profiles became records in `data/`, what did not fit the schema, and what was
deliberately not created. Nothing in the docs was dropped without being listed here.

## What was created

| Records | Count | IDs |
| --- | --- | --- |
| Persons | 5 | PER-000001 to PER-000005, as in the docs |
| Claims | 85 | CLM-000001 to CLM-000085, as in the docs, in `data/claims/<PER>.json` |
| Sources | 39 | SRC-000001 to SRC-000039, as in the docs |
| Work | 1 | WRK-000001 The Art of War |
| Battles | 32 | BAT-000001 to BAT-000032 (new, from `new_record.py`) |
| Wars | 13 | WAR-000001 to WAR-000013 (new) |
| Polities | 25 | POL-000001 to POL-000025 (new) |
| Places | 33 | PLC-000001 to PLC-000033 (new) |
| Relationships | 45 | REL-000001 to REL-000045, stored on the five persons |

Profile prose was copied verbatim from the docs, section by section. The conversion script stops if a
heading in a doc is neither converted nor listed as not converted.

## Decisions made with the user

- **Scope:** the core set (battle-table rows, wars named as context, polities that took part or were
  served, battle sites and birth or death places). Everything else is listed under "Not created" below.
- **Missing grades are left as null.** The validator reports each one as "not filled in" until it is graded.
- **Grade-rule breaches (rule 6) are warnings** while a record is `draft` or `sourced`, and errors once it
  is `verified` or `reviewed`.

## Source of truth

From 13 Nov 2026 the JSON records in this repository are the source of truth. The pilot profiles in
this folder (exported from Claude Docs) are historical drafts and are not updated.

## Answers applied (13 Nov 2026)

- **Q1 Myths.** Every myths-table row is now a claim (`field: "myth"`): 27 new claims, CLM-000086 to
  CLM-000112. The statement is the popular claim as worded in the table. Verdicts follow the table's label:
  - `rejected-myth`: False, Fiction, Untraced, Embellished, Literary, Colonial label
  - `accepted`: True
  - `disputed`: everything else

  Certainty is the grade in brackets. A citation is added only where the Evidence column names a source.
  Rows that repeat an existing claim link that claim instead of duplicating it: CLM-000014, 036, 042, 046,
  047, 050, 053, 056, 060, 063, 066, 069, 079, 080, 085. All are in each person's `myth_claim_ids`.
  - **Changed from the earlier draft mapping:** CLM-000057 and CLM-000081 were not true repeats.
    "The book was written in the 6th century BCE" is now its own claim (CLM-000107), linked to CLM-000057 as
    an alternative. "He was arrested as punishment for Wairau" is CLM-000111.
  - New myth claims have `quiz_ready: false`, since the docs' quiz lists don't include them. CLM-000109 quotes
    the opening words of Ka Mate, so it must stay out of quizzes and games (see PER-000005 `cultural_guidance`).
  - CLAUDE.md now says a myth claim is graded on how sure we are of its verdict.
- **Q2 Battle types.** Added `sortie` and `unknown` to the battle `kind` enum. Mapped:
  - Compiègne → `sortie`
  - Ticinus → `skirmish`
  - Sosso capital → `unknown`
  - Hotuiti → `massacre`
  - every other Te Rauparaha engagement without a type in the doc → `unknown`, including Horowhenua lakes
    and the first attack on Kaiapoi, which had been inferred before
  - Boju → `unknown` (not covered in the answers; same rule applied)

  The March on Rome is now WAR-000014 (campaign, part of the Second Punic War, grade B). BAT-000015 is a
  tombstone replaced by it, and Hannibal's relationship now points to WAR-000014.
- **Q7 Active periods** (grades from the user): Joan 1429–1430 A; Hannibal 221–190 BCE B; Sundiata
  c. 1230s–1250s C (stored as 1230–1259); Sun Tzu late 6th–early 5th century BCE C (stored as 550–451 BCE);
  Te Rauparaha unchanged (A).
- **Q10 Second sources** added for CLM-000004, 005, 010 (with a note on which part each source supports),
  011 and 016, all with access `opened`.
- **Q8 CLM-000026** is now flagged `inflated-numbers` and `patron-bias`. The footnote's explanation has
  moved to the bias notes of SRC-000010 (Polybius).

## Second round of answers applied (13 Nov 2026)

- **What a record's grade means:**
  - Source: how certain its authorship and dating are (reliability goes in `reliability_notes`).
  - Place: how certain its location is (also stored in `location_certainty`).
  - Polity or war: that it existed with roughly the stated span; default A, Sosso B.
- **Grades the user gave:**
  - Sources: modern published works, statutes and named ancient authors are A. SRC-000004 B, 014 B, 018 B,
    026 C, 029 B, 033 B, 035 B.
  - Relationships: Joan → France A; Hannibal → Carthage A, → Seleucid kingdom B, → Bithynia B.
  - WRK-000001: A.
- **Grades Claude proposed** (for review): see the table below.
- **Uncited claims above C lowered to C**, with "Pilot doc grade X; restore when cited" in their evidence
  status: CLM-000017, 069, 093, 094, 102, 111.
- **Missing core claims added** (claim type `event`, verdict `accepted`):
  - CLM-000113: Joan, identity, A
  - CLM-000114: Joan, active period, A
  - CLM-000115: Sundiata, active period, C, no source named in the doc
  - CLM-000116: Te Rauparaha, identity, A
  - CLM-000117: Te Rauparaha, active period, A
- **Reverse names:** `schema/vocab/relations.json` has a reverse for every relation. `served_under` now
  reverses to `superior_of`.
- **Boju:** kind `unknown` (confirmed).

### Grades proposed by Claude (not given by the user or the docs)

| Record | Name | Grade | Reason |
| --- | --- | --- | --- |
| SRC-000001 | Condemnation trial record, 1431 | A | Official court record; date and court certain |
| SRC-000002 | Nullification trial dossier | A | Official retrial proceedings, securely dated 1452–1456 |
| SRC-000003 | Joan's dictated letters | B | Dated, but dictated through scribes, so authorship is mediated |
| SRC-000013 | Appian, Cassius Dio and others | B | Group record; "and others" are unnamed |
| SRC-000021 | Ibn Battuta, travel account | A | Named author with a dated work, same as Ibn Khaldun |
| SRC-000027 | Yinqueshan bamboo slips | A | Copyists anonymous, but tomb dating (c. 140–118 BCE) is secure |
| SRC-000030 | Han shu bibliographic treatise | A | Part of a dated official history (1st c. CE) |
| SRC-000039 | Oral histories of other iwi | B | Same as the other oral-tradition sources |
| WAR-000005 | Mande revolt against Sosso rule | B | Its core event (CLM-000040) is B; the war cannot be surer |
| WAR-000008 | Wu campaign against Chu, 512 BCE | B | Known via Sima Qian and the Zuo zhuan; dates graded B in the doc |
| 7 war spans | Loire, First Punic, 512 BCE, Musket Wars, both Heke, South Island | = war grade | A span's certainty is its war's grade |
| PLC-000001–011, 017, 033 | Domrémy, Rouen, Orléans, Jargeau, Beaugency, Patay, Montépilloy, Paris, Saint-Pierre-le-Moûtier, La Charité-sur-Loire, Compiègne, Rome, Ōtaki | A | Exist today under the same name |
| PLC-000012 | Saguntum | A | Modern Sagunto |
| PLC-000013, 014 | Ticinus, Trebia | A | The rivers Ticino and Trebbia (the battle sites on them are a separate question) |
| PLC-000015, 016 | Lake Trasimene, Cannae | A | Lago Trasimeno; known site of Canne della Battaglia |
| PLC-000018 | Zama | C | Town site and battlefield disputed |
| PLC-000019 | Pamphylia | B | A region with no modern name, not a point |
| PLC-000020 | Libyssa | B | Near modern Gebze; only approximately located |
| PLC-000021 | Kirina | B | Modern village exists; placing the battle there rests on tradition |
| PLC-000022 | Boju | C | Location disputed |
| PLC-000023 | Te Arawī | B | Pā near Kāwhia Harbour; exact site not confirmed |
| PLC-000024, 025 | Motunui, Horowhenua lakes | A | Still so named; the lakes exist today |
| PLC-000026 | Hotuiti | C | Location not identified; needs research |
| PLC-000027–030 | Waiorua, Hikapu, Kaiapoi pā, Ōnawe | A | Waiorua Bay, Hikapu Reach, marked pā site, Ōnawe Peninsula |
| PLC-000031 | Te Kūititanga | B | At Waikanae; exact site approximate |
| PLC-000032 | Wairau plains | A | Wairau plains, Marlborough |

## Third round applied (13 Nov 2026): recommendations for Q3–Q6, Q9, Q11–Q14 accepted

- **Q3 `quiz_kind`:** optional claim field with values `plain-fact`, `debate`, `tradition` and `myth-busting`,
  set from the docs' lists.
  - The myth claims CLM-000086 to 112 are now `myth-busting`, except CLM-000109 (it quotes Ka Mate), which
    stays out of quizzes.
  - CLM-000069 stays `myth-busting` at grade C.
  - CLM-000017 is `plain-fact` in the doc but is now grade C; the app should not show C claims as plain facts.
  - 101 claims are now quiz-ready (52 plain-fact, 30 myth-busting, 14 debate, 5 tradition).
- **Q4 Strength by arm:** a battle side's `strength` and `casualties` may be a list of ranges, one per arm.
  Cannae (BAT-000014) holds Polybius's infantry and cavalry figures separately; Rome's cavalry, "just over
  6,000", is stored as low 6,000. No total is stored.
- **Q5 Roles:** added `magistrate`, `adviser` and `composer` to `roles.json`. Hannibal gains `magistrate` and
  `adviser`; Te Rauparaha gains `composer`. Sun Tzu is still not listed as a commander.
- **Q6:** no change; `sourced` stays.
- **Q9 New sources:**

  | Source | Grade | Cited on |
  | --- | --- | --- |
  | SRC-000040 British Library catalogue entry | A | CLM-000017 (excerpt) |
  | SRC-000041 Ye Shi | A | CLM-000064 (via-secondary) |
  | SRC-000042 Liu Xiang | A | CLM-000068 (via-secondary) |
  | SRC-000043 Met, "The Empires of the Western Sudan" | A | historical-context source; not cited on a claim |
  | SRC-000044 Michelet (1853) | A | CLM-000090 (not-opened) |
  | SRC-000045 Shakespeare, Henry VI, Part 1 | B | CLM-000091 (not-opened) |

  Giles (SRC-000031) now derives from Ye Shi and Liu Xiang. These are still not created, because they
  can't be identified: the OUP work, the field study of the Manden Charter, the 6 January letter, and
  the 9th-century source about Cao Cao.
- **Q11:** two sources that derive from a common source now count as one. This added one warning,
  CLM-000028.
- **Q12:** a text or tradition claim graded A needs one opened copy of the document or tradition itself (source
  types `primary-*`, `archaeological`, `oral-tradition`, `statute`, `translation`). This cleared 9 warnings.
  CLM-000049 and CLM-000073 still warn, because they cite a description of the tradition.
- **Q13 Compare-with links:** new relation `compare_with`. Links REL-000046 to 049 cover Joan–Hannibal,
  Sundiata–Joan, Sundiata–Te Rauparaha and Sun Tzu–Hannibal, graded A, with the docs' reasons in the role. Each
  doc's full "Compare with" text is in the person's `editor_notes` until the other people get records.
- **Q14 Relations:**
  - new relations `led` and `originated_from`
  - REL-000050: Te Rauparaha led Ngāti Toa (B)
  - REL-000051: Sundiata ruled the Mali Empire (B)
  - REL-000052: Sun Tzu originated from Qi (C)

  The fourth bullet (`served` grades) was resolved in round 2.
- **CLAUDE.md:** the grade A rule now says "neither derived from the other nor from a common source", and adds
  the text/tradition rule.
- **Validator:** 0 errors, 13 warnings, all on A-grade claims that still need evidence.

Still open: only whether to link Te Rauparaha → Ngāti Raukawa (descent through his mother) with
`originated_from`, and at what grade.

## Questions for the user (things that do not fit the schema)

1. **Myth-table rows without a CLM number.** Each profile's myths table has rows that are not among the
   numbered claims: 7 for Joan, 8 for Hannibal, 3 for Sundiata, 3 for Sun Tzu and 4 for Te Rauparaha (25 in all).
   They are not stored anywhere as records yet; persons have no myths field. Where a numbered claim matches a
   myth row, it is listed in `myth_claim_ids`. Should the other rows become new claims (fresh CLM IDs,
   verdict `rejected-myth` or `disputed`, grades as in the docs)?
2. **Battle types not in the `kind` vocabulary.** These are left as null:
   - Compiègne (doc type "Sortie")
   - Ticinus ("Cavalry action")
   - March on Rome ("Diversion")
   - Taking of the Sosso capital ("Capture of a city")
   - Boju and the capture of Ying, and Te Rauparaha's Motunui, Hotuiti, Waiorua, Hikapu, Ōnawe,
     Ōraumoaiti and Ōraumoanui, Te Kūititanga and Wairau (no type given in the doc)

   Should I add values to the vocabulary (e.g. `sortie`, `cavalry-action`, `capture`), or pick the closest
   existing ones?
3. **Kinds of quiz question.** `quiz_ready` is true for every claim in the docs' "Quiz-ready claims" lists,
   but a true/false flag can't record which list a claim came from: plain fact, debate, tradition or
   myth-busting. Should there be a `quiz_kind` field?
4. **One strength figure per side.** Polybius gives infantry and cavalry separately for Cannae. Only the
   infantry figures are in `strength`; the full numbers are in the battle's `tactical_summary`.
5. **Roles not in `roles.json`.** These were mapped:
   - Joan: "military leader, religious visionary" → `war-leader`, `religious-leader`
   - Sundiata: "founder-king, war leader, lawgiver" → `ruler`, `war-leader`, `lawgiver`

   These have no matching role:
   - Hannibal: suffete, adviser in exile
   - Sun Tzu: "general (traditional, disputed)" (left out)
   - Te Rauparaha: composer of Ka Mate

   The original wording is kept in each person's `editor_notes`.
6. **Status "Sourced (partial)"** is stored as `sourced`. The word "partial" is kept in `editor_notes`.
7. **Active period.** It is required, but the docs give:
   - Joan 1429–1430 and Hannibal 221–190 BCE, with no grade (certainty left null)
   - no active period for Sundiata or Sun Tzu (all fields null). Sun Tzu's card has "Lived late 6th–early
     5th century BCE by tradition, grade C". Should that be his active period?
8. **CLM-000026 is flagged `hostile-source`.** The doc's own footnote says the real issue is Polybius's
   patrons, and `patron-bias` now exists. I kept the doc's flag. Should it change?
9. **Sources the docs use but don't list as SRC records.** These claims have the citations below missing:
   - British Library catalogue and OUP (CLM-000017; it has no citation)
   - Ye Shi (CLM-000064)
   - Liu Xiang (CLM-000068)
   - the unnamed field study of the Manden Charter (CLM-000050)
   - the near-contemporary letter giving 6 January (CLM-000002)
   - the 9th-century claim about Cao Cao (CLM-000066)
   - the second Met page on the Western Sudan

   Should these get SRC records?
10. **Citations limited to sources the doc names.** Citations were added only where the doc names the source
    for that claim. For military events the doc's own rule "unless marked, events below come from the
    Williamson archive biography" was used. Several claims say "2 opened" but name only one source, so the
    second opened source is not cited and they show a GRADE_A warning: CLM-000004, 005, 011 and 016.
    Claims that say "1 opened" without naming it have no citation: CLM-000002, 008 and 015.
11. **Two sources copied from a third count as independent.** The A rule treats them that way (for example,
    DCC and the Shuckburgh translation both derive from Polybius, so CLM-000028 passes). The Hannibal doc
    says such a pair is not truly independent. Should the validator also treat shared ancestry as dependence?
12. **Text and tradition claims backed by one opened copy.** Examples are "the Act says X" (CLM-000084) and
    "Sima Qian tells the story" (CLM-000062). The docs grade these A from one opened copy of the document
    itself, but the A rule asks for two independent sources. When these records are verified, should claims
    of type `text` or `tradition` need only the document itself, opened?
13. **"Compare with" sections** have no field or relation. They are not converted.
14. **Gaps in the relation vocabulary.**
    - There is no relation for leading an iwi, so Te Rauparaha and Ngāti Toa are linked only through
      `polity_ids`.
    - Sundiata's "founder-king" role is stored as `founded` only.
    - Sun Tzu's origin in Qi is recorded in `polity_ids` only.
    - Joan's and Hannibal's `served` links have no grade in the docs (null).

## Mapping decisions (no question, but please check)

- **claim_type:** the Joan and Hannibal docs have no Type column, so every claim was typed `event`, except
  CLM-000030, whose Flags column says "Interpretation" (stored as claim type `interpretation`, no bias flag).
  CLM-000013 ("She held real military command") is `event`; it could be `interpretation`.
- **verdict:** A or B → `accepted`; C or D → `disputed`. (No numbered claim is graded E.)
- **field** (used for core claims):
  - `identity`: CLM-000020, 039, 058
  - `active_period`: CLM-000022, 059
  - `main_battles`: claims about the person in a battle-table engagement (CLM-000005, 006, 007, 010, 011,
    023, 025, 028, 031, 040, 041, 074, 076, 077)
  - `main_works`: CLM-000054, 057

  Casualty and strength claims are not core. Joan and Te Rauparaha have no identity or active-period claim,
  and Sundiata has no active-period claim, so the validator warns.
- **myth_claim_ids:** numbered claims matching a myth-table row. Joan: 014. Hannibal: 036.
  Sundiata: 042, 046, 047, 050, 053. Sun Tzu: 056, 057, 060, 063, 066, 069. Te Rauparaha: 079, 080, 081, 085.
- **source_type:** the doc's type wording is kept in `reliability_notes`. Mappings that are judgement calls:
  - nullification dossier → `primary-later`
  - Williamson, Pernoud, Niane, the UNESCO page, the Sunzi text, the Han shu, and Tāmihana's account → `other`
  - DCC and DNZB → `reference`
- **derives_from:** taken from the docs' tables and their explicit statements:
  - Williamson → condemnation trial, nullification trial and chronicles ("summarises chronicles and trial testimony")
  - DCC → Polybius ("based on Polybius")
  - Pernoud → nullification dossier
  - Polybius → Silenus/Sosylus is not linked, because the doc says "seems"
- **Battle certainty** is the doc's battle-table grade. A date's certainty is the same grade, except Kirina
  (date C as the doc says). Boju's battle grade is A (Wu's victory, CLM-000061); the table's grade for Sun
  Wu's role (D) is on the relationship.
- **Day ranges** (e.g. 29 April – 8 May 1429) use precision `day` with the range in `display`.
- **Sides** are recorded only where the doc names the opponent. Joan is in no `commander_ids`, because her
  command is disputed (CLM-000013). Her role from the table is in the relationship `role`.
- **Descriptive war names** where the doc gives none: Mande revolt against Sosso rule; Wars between Wu and
  Chu; Ngāti Toa–Waikato wars at Kāwhia; Te Rauparaha's South Island campaigns.
- **Polity and place types** are set only where the doc states them (e.g. "Kingdom of France", "Mali
  Empire", iwi, "village", "pā"). No coordinates were added: the docs give none.
- **Profile sections with no matching field:** Sundiata's and Te Rauparaha's "Death" sections are at the start
  of `legacy`. Each doc's research note, evidence discussion and "What would strengthen this profile" are
  in `evidence_note`.
- **Cultural guidance:** on PER-000005 and on SRC-000033, 034 and 039 (Ka Mate and knowledge held by iwi).

## Not created (mentioned in the docs, outside the core set)

- **Places:** Chinon, Poitiers, Blois, Meung-sur-Loire, Reims, Troyes, Châlons, the Orléans forts
  (Saint-Loup, the Augustins, Les Tourelles), Bohemia; Carthage (birthplace "probably", grade C, so not
  linked), Iberia, the Ebro, Pyrenees, Rhône, Alps, Capua, Metaurus, Sicily; Mema, Kangaba, Kurukan Fuga,
  the Niger, the Sosso capital (unnamed); Ying, Linyi (Yinqueshan); Kāwhia and Maungatautari (disputed
  birthplace), Te Kakara, Waikawau pā, Taranaki, Kāpiti Island, Manawatū, Lake Papaitonga, Pukerua,
  Kaikōura, Akaroa, Kaparatehau (Lake Grassmere), Whakatū, Te Taitapu, Porirua, Hutt Valley, Auckland,
  Rangiātea, Lake Rotoaira, Hauraki Gulf, Cook Strait, Nelson.
- **Polities:** Duchy of Bar, Macedon, Numidia, Capua, Ghana (Soninke empire), Mema, Yue, the Hussites,
  Ngāpuhi, Ngāti Whātua, Ngāti Maru, Ngāti Tūwharetoa, Ngāti Te Aho, the New Zealand Company, the colonial
  government.
- **Battles and events:** Meung-sur-Loire, the submissions of Troyes, Châlons and Reims, the Metaurus
  (207 BCE), the Fabian night escape, Te Kakara, Waikawau pā, the Papaitonga feast, Pukerua, Kaikōura, the
  *Elizabeth* affair (1830; "A for the event"), Kaparatehau, the Hutt Valley fighting (1846). Sundiata's
  "Earlier engagements against Sosso" row (D, tradition only) is in the summary of the Mande revolt war
  record, not a battle record.
- **Wars:** Carthage's war against its mercenaries (unnamed in the doc); the war of Antiochus III against
  Rome (unnamed in the doc, so the naval battle off Pamphylia has no war).
- **Persons:** everyone except the five subjects (e.g. Dunois, Charles VII, Hamilcar, Scipio, Sumanguru,
  Te Rangihaeata). They appear in text, side labels and relationship roles only.
- **Works:** Ka Mate (a WRK record was not requested; it is described in Te Rauparaha's legacy and claims).
