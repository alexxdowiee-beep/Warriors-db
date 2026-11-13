# Warriors & Leaders Database — Foundation Proposal

Nov 12, 2026 · @Alex Dowie

## Summary and decisions for your approval

The database should store every record as its own JSON file in a Git repository, validate each one against a schema, and compile the lot into SQLite for the app. Every important statement is a separate **claim** with its own sources and certainty grade, so evidence lives at the level of the fact, not the profile. All seven decisions below, and the list of 50, were approved on 12 November 2026.

| # | Decision | Recommendation | Why it matters later |
| --- | --- | --- | --- |
| 1 | Storage format | JSON file per record as the source of truth, compiled to SQLite, shipped to the app | Readable and easy for Claude Code to edit; SQLite gives fast search and queries |
| 2 | Evidence model | Claim-level sourcing with certainty grades A–E | Disputed facts can sit side by side without rewriting profiles |
| 3 | Identifiers | Permanent IDs like `PER-000042`, plus a separate readable slug | Names and spellings change; IDs never do |
| 4 | Dates | Structured date ranges with precision and certainty, stored as signed years for sorting, shown as BCE/CE | Timelines work across 4,000 years without special cases |
| 5 | Kingdoms and empires | One "polity" type covering empires, kingdoms, sultanates, chiefdoms, city-states and confederations | Avoids forcing non-European states into European categories |
| 6 | Relationships | One typed relationship table with a controlled vocabulary | New kinds of connection need no schema change |
| 7 | App target | Offline-capable web app (PWA) designed for your laptop first, with a responsive phone layout; built with Python scripts | One codebase runs in your laptop browser and installs on your Android phone; no app store needed |

The five-person pilot is under way in chat, starting with Joan of Arc (approved) and Hannibal; work moves to Claude Code later.

## 1. Overall architecture

The system has four layers, and only the first is ever edited by hand. Everything downstream is rebuilt from it by script, so a structural change means re-running a build, not rewriting data.

1. **Authoring layer** — one JSON file per record (person, battle, source, and so on) in a Git repository. Git gives a full history of every change, so any correction can be traced or undone.
2. **Validation layer** — JSON Schema files define every field. A validator checks each record's shape, checks that every referenced ID exists, and checks that every claim graded A or B cites at least one source.
3. **Database layer** — a build script compiles the JSON into a single SQLite file with full-text search (SQLite's FTS5). This is what you query, compare and analyse.
4. **Application layer** — an export step produces a compact bundle for the app: timelines, maps, quizzes and profiles all read from it.

### Why not JSON only, or SQLite only

- **JSON only** is easy to edit but slow and awkward to query once there are thousands of linked records ("every battle where a cavalry feint beat a larger army").
- **SQLite only** is easy to query, but a binary file is hard to review, hard for Claude Code to edit safely, and impossible to diff in Git.
- **The hybrid** keeps both strengths, and it is a common pattern for data projects built this way.

### How the ten categories connect

The ten categories you asked for become ten record types. They connect in two ways: direct ID fields where the link is always one-to-one (a battle has one location), and a shared relationships table for everything else (a person can command in many battles, serve several polities and be the rival of several people). Two extra record types sit underneath all of them: **claims** and **sources**, which carry the evidence.

&#91;embedded content: record types · 3 tiers on an evidence base\]

Arrows stand for typed relationships, which run both ways; every link and every fact traces down to a cited claim.

## 2. Proposed database schema

Thirteen record types share one set of base fields (a Work type, WRK, for texts such as The Art of War, was added after the Sun Tzu pilot), three reusable value objects, and one relationships table. Each type then adds only the fields specific to it.

### Identifiers

Every record gets a permanent ID: a three-letter type prefix, a hyphen and six digits. IDs are never reused, renamed or recycled, even if a record is merged or deleted (a deleted record leaves a tombstone pointing to its replacement).

| Record type | Prefix | Example |
| --- | --- | --- |
| Person | PER | PER-000001 |
| Civilisation / culture | CIV | CIV-000001 |
| Polity (kingdom, empire, sultanate, chiefdom, city-state, confederation) | POL | POL-000001 |
| Battle / siege | BAT | BAT-000001 |
| War / campaign | WAR | WAR-000001 |
| Equipment (weapons, armour, ships, fortifications) | EQP | EQP-000001 |
| Tactic / strategy | TAC | TAC-000001 |
| Period | PRD | PRD-000001 |
| Place | PLC | PLC-000001 |
| Source | SRC | SRC-000001 |
| Claim | CLM | CLM-000001 |
| Relationship | REL | REL-000001 |

### Base fields (every record)

| Field | Type | Rule |
| --- | --- | --- |
| `id` | string | Permanent, as above |
| `type` | enum | person, polity, battle… |
| `slug` | string | Readable, e.g. `hannibal-barca`; may change |
| `primary_name` | string | Most common English form |
| `names` | list of name objects | All other names, scripts and spellings |
| `summary` | text | 2–3 sentences in our own words |
| `certainty` | A–E | Overall grade for the record (section 4) |
| `status` | enum | draft → sourced → verified → reviewed |
| `external_ids` | object | Wikidata QID, Pleiades ID, GeoNames ID, etc. |
| `tags` | list | Themes such as `naval`, `women-commanders`, `gunpowder` |
| `updated` | date | Last edit |
| `editor_notes` | text | Open questions, not shown in the app |

Two more fields were added after the Te Rauparaha pilot: cultural\_guidance on every record (appropriate use of taonga, sacred material or knowledge held by a community as guardians), and perspective\_of on claims (the people whose view a claim records, as polity or civilisation IDs). Storing Wikidata IDs from the start lets the app pull in portraits, coordinates and cross-links later without rework.

### Reusable value objects

**Historical date.** Never a bare string. It holds a range, a precision and a certainty, so "c. 247 BCE", "between 1162 and 1167" and "9 September 9 CE" all sort and display correctly. `earliest` and `latest` are astronomical years (1 BCE = 0, 2 BCE = −1), which keeps timeline maths simple; the app shows BCE/CE.

```json
{
  "earliest": -246, "latest": -246,
  "month": null, "day": null,
  "precision": "year",
  "qualifier": "circa",
  "calendar_original": "unknown",
  "display": "c. 247 BCE",
  "certainty": "B",
  "claim_ids": ["CLM-000123"]
}
```

**Quantity range.** For army sizes, casualties and ship counts. Ancient figures are often inflated, so the schema forces a range plus the claims behind it; a single number is only allowed when sources agree.

```json
{ "low": 30000, "high": 50000, "unit": "soldiers", "basis": "modern estimate", "ancient_claim": 300000, "claim_ids": ["CLM-000456"] }
```

**Name.** Each name records its language, script, romanisation system and kind, so Temüjin, Chinggis Khan and Genghis Khan are one person.

```json
{ "name": "Chinggis Khan", "kind": "title", "language": "mn", "script": "Latn", "romanisation": "scholarly", "preferred": false }
```

### Type-specific fields

| Type | Key fields |
| --- | --- |
| Person | `birth`, `death` (date objects), `birth_place_id`, `death_place_id`, `death_cause`, `sex`, `roles` (ruler, commander, strategist, admiral, rebel leader…), `dynasty_id`, profile sections (section 3) |
| Civilisation | `region`, `span` (date range), `language_family`, `predecessor_ids`, `successor_ids`, `overview` |
| Polity | `polity_type`, `span`, `capitals` (place IDs with date ranges), `civilisation_id`, `government`, `territory_snapshot_ids` |
| War / campaign | `kind` (war, campaign, rebellion, conquest, raid series), `parent_war_id`, `span`, `belligerents`, `causes`, `outcome`, `consequences` |
| Battle / siege | `kind` (field battle, siege, naval, ambush, raid), `date`, `place_id`, `war_id`, `sides` (below), `outcome`, `tactical_summary`, `significance`, `terrain`, `site_certainty` |
| Equipment | `category` (weapon, armour, mount, vessel, fortification, gunpowder, siege engine), `materials`, `span_of_use`, `origin_civilisation_ids`, `museum_examples` (source IDs) |
| Tactic | `category` (formation, manoeuvre, siegecraft, naval, logistics, intelligence, doctrine, grand strategy), `description`, `requirements`, `counters`, `notable_uses` |
| Period | `scheme` (global or regional, e.g. Sengoku, Warring States), `span`, `region`, `parent_period_id` — periods may overlap |
| Place | `latitude`, `longitude`, `location_precision`, `location_certainty`, `place_type`, `modern_country`, `historical_names` |
| Source | `source_type`, `authors`, `title`, `date_written`, `edition`, `publisher`, `year`, `isbn_doi`, `url`, `accessed`, `language`, `bias_notes`, `reliability_notes`, derives\_from (source IDs it copies or depends on, so two sources repeating one original count as one) |
| Claim | `about_id`, `field`, `statement`, `claim_type (event, tradition, text or interpretation: added after the Sundiata pilot), certainty`, `verdict` (accepted, disputed, rejected-myth), `alternative_claim_ids`, `citations` |
| Relationship | `from_id`, `to_id`, `relation`, `role`, `span`, `certainty`, `claim_ids` |

**Battle sides** are stored inside the battle record, one entry per side: the polities involved, commanders (person IDs), strength and casualties (quantity ranges, or "unknown" when no source gives a figure, so no number is ever forced) and the result for that side. This keeps lopsided and multi-sided battles honest.

**Citations** inside a claim hold `source_id`, `locator` (book, chapter, page, line or museum accession number) and an optional note. A claim with no citation cannot be graded above C.

### Relationships

One table, one controlled vocabulary. Each relationship is stored once and the build script creates the reverse link, so "Hannibal commanded at Cannae" also appears on the Cannae page.

| Connects | Example relations |
| --- | --- |
| Person → Person | parent\_of, spouse\_of, sibling\_of, succeeded, served\_under, mentored, allied\_with, rival\_of, killed |
| Person → Polity | ruled, served, founded, rebelled\_against |
| Person → Battle / War | commanded, participated, wounded\_at, died\_at, planned |
| Person → Equipment / Tactic | introduced, reformed, used |
| Battle → War, War → War | part\_of |
| Battle → Tactic / Equipment | featured |
| Polity → Polity | conquered, vassal\_of, succeeded, allied\_with |
| Polity → Civilisation | belongs\_to |
| Any → Period | during |

### Supporting tables

- **Territory snapshots:** a polity's extent at a given date, stored as a GeoJSON file with its source and certainty. Designed now, filled later.
- **Media:** images and maps with licence, credit and source, so nothing unlicensed reaches the app.
- **Quiz items:** each question points to the claim IDs it tests. Only A and B claims become plain facts; disputed claims become "what do historians debate?" questions.
- **Change log:** handled by Git history.

## 3. Standard profile template

Every person profile has the same 16 sections in the same order, so any two people can be compared section by section. One exception, added after the Joan of Arc pilot: where a person's command role is itself disputed, sections 6 and 7 are merged into one. Narrative sections are written prose; anything factual inside them (dates, numbers, outcomes) is also stored as a claim so it can be checked, graded and quizzed.

| # | Section | What it holds | Rules |
| --- | --- | --- | --- |
| 1 | Identity | Primary name, all other names and titles, polity, civilisation, roles, one-line description | Native-script name where one exists |
| 2 | Birth and death | Date objects, places, cause of death | Unknown is recorded as unknown, never guessed |
| 3 | Early life | Family, upbringing, education, formative events | Late anecdotes flagged as such |
| 4 | Historical context | The political and military situation they entered | Links to periods, polities and wars |
| 5 | Military career | Chronological narrative of commands and campaigns | Each campaign linked to a WAR record |
| 6 | Leadership qualities | How they led: command style, relations with troops, decision-making | Must cite evidence, not adjectives |
| 7 | Strategy and tactics | Characteristic methods, with the battles that show them | Linked to TAC records |
| 8 | Major battles | Table of battles: date, opponent, role, result | Generated from relationships, not retyped |
| 9 | Victories and defeats | Balanced record, including defeats sources downplay | Both sides' accounts where they exist |
| 10 | Political achievements | State-building, law, administration, diplomacy | Separate from military record |
| 11 | Controversies and failures | Atrocities, massacres, enslavement, strategic errors, contested decisions | Stated plainly, not softened or sensationalised |
| 12 | Weapons and technology | Equipment they used, introduced or faced | Linked to EQP records |
| 13 | Legacy and influence | Effect on later warfare, states and memory | Distinguishes influence from later reputation |
| 14 | Myths and misconceptions | Popular claims, apocryphal quotes, film and nationalist versions, with the evidence | Each myth is a claim with verdict `rejected-myth` or `disputed` |
| 15 | Sources and evidence | Key primary sources, archaeology, leading modern studies, and an honest note on how thin or biased the record is | Every source has a SRC record |
| 16 | Learning aids | Key takeaways, comparison hooks ("compare with…"), quiz-ready claims | Drawn only from A and B claims |

### Record skeleton

This is the shape Claude Code will validate against; long text sections sit under `profile`.

```json
{
  "id": "PER-000001",
  "type": "person",
  "slug": "example-person",
  "primary_name": "",
  "names": [],
  "summary": "",
  "roles": [],
  "birth": {}, "death": {},
  "birth_place_id": null, "death_place_id": null,
  "polity_ids": [], "civilisation_ids": [],
  "profile": {
    "early_life": "", "historical_context": "", "military_career": "",
    "leadership": "", "strategy_and_tactics": "", "victories_and_defeats": "",
    "political_achievements": "", "controversies": "", "technology": "",
    "legacy": "", "evidence_note": "", "key_takeaways": []
  },
  "myth_claim_ids": [],
  "certainty": "B",
  "status": "draft",
  "external_ids": { "wikidata": null },
  "tags": [],
  "updated": "2026-11-12"
}
```

Battles, relatives, rivals and equipment are deliberately absent from the skeleton: they live in the relationships table, so a fact is never stored in two places that can disagree.

## 4. Research and verification methodology

Every claim gets one certainty grade from A to E, at least one citation with a precise locator, and any bias flags that apply. The grade describes the evidence, not how famous or plausible the claim is.

### Certainty grades

| Grade | Label | Evidence required | Example |
| --- | --- | --- | --- |
| A | Established | Two or more independent sources, at least one contemporary or archaeological; broad scholarly agreement | Mehmed II took Constantinople in 1453 |
| B | Probable | One good source or several later ones with a credible chain; accepted by most scholars, with minor doubts | Details of a battle known from one reliable historian |
| C | Disputed | Credible scholars disagree; competing claims recorded side by side | Sun Tzu as a single historical author |
| D | Weak | A single late, partisan or second-hand source; little corroboration | Speeches put in commanders' mouths by ancient historians |
| E | Legendary or false | Tradition or myth with no reliable support, or contradicted by evidence | Famous quotations first recorded centuries later |

A record's overall grade is the grade of its weakest core claim (identity, active period, and main battles for commanders or main works for authors, set by a core\_claim\_set field; active period replaces birth date; both added after the Sun Tzu pilot), so a mostly legendary figure cannot look solid because of a few well-attested details.

### Bias flags

Claims can carry one or more flags so the app can warn the reader: `propaganda` (official royal or state account), `hostile-source` (written by enemies), `hagiography` (written by admirers or devotees), `late-source` (written long after the events), `inflated-numbers`, `oral-tradition`, `translation-issue`, `nationalist-reinterpretation`, `popular-culture` (film, game or novel origin), self-testimony (a person's own account of their deeds, such as Caesar's commentaries or Babur's memoir), patron-bias (shaped by a writer's patrons or court, as with Polybius and the Scipios).

Oral tradition is not graded down for being oral. It is graded on what it can support: tradition can be strong evidence for how a people remember a founder and weaker evidence for exact dates or numbers.

### Source hierarchy

1. **Archaeological and material evidence** — excavation reports, inscriptions, coins, surviving weapons and armour in museum collections.
2. **Contemporary primary sources** — chronicles, letters, official records, eyewitness accounts, a commander's own writings (read critically: self-written accounts are often self-serving).
3. **Later primary sources** — historians writing after the events from earlier material now lost.
4. **Academic secondary sources** — peer-reviewed journals, university-press books, recognised specialists.
5. **Reputable reference and museum publications** — national museums, scholarly encyclopedias.
6. **General sources** — used only to find better sources, never cited alone for a graded claim.

### Rules

- No date, quotation, battle, number or name is ever invented. Unknown is a valid value.
- A quotation is only stored with its primary source and locator. A famous quote that cannot be traced goes in Myths, not in the profile.
- Army sizes and casualties are stored as ranges, with the ancient claim kept separately from the modern estimate.
- Where sources disagree, both versions are stored as linked claims; the profile text explains the disagreement rather than choosing silently.
- Each source record states its author's position, distance from the events, purpose and audience.
- Atrocities and failures are recorded with the same standard of evidence as victories.

### Verification workflow

1. **Draft** — structure filled, claims written, sources identified.
2. **Sourced** — every claim has citations; the validator passes.
3. **Verified** — each A and B claim re-checked against its cited source; numbers and dates cross-checked.
4. **Reviewed** — you read it and approve. Only reviewed records appear as finished in the app.

### Limits I will be honest about

I can search the open web and read pages I can reach, but not paywalled journals or most books in full. Each citation will therefore record whether I actually opened the source or am relying on a secondary description of it, and the access date. Anything I write from my own knowledge without opening a source stays at status **draft** and cannot be graded above C until it is sourced.

## 5. File structure for Claude Code

One repository holds the data, the rules, the build scripts and later the app. A `CLAUDE.md` at the root carries the research standards and schema rules, so every Claude Code session follows them without being reminded.

```
warriors-db/
├── CLAUDE.md                 # Standards, ID rules, certainty grades, "never invent" rule
├── README.md
├── schema/
│   ├── common.schema.json    # base fields, date, quantity range, name, citation
│   ├── person.schema.json    # one schema per record type
│   ├── polity.schema.json
│   ├── ...
│   └── vocab/
│       ├── relations.json    # allowed relationship types
│       ├── roles.json
│       ├── bias-flags.json
│       └── certainty.json
├── data/
│   ├── persons/PER-000001.json
│   ├── civilisations/
│   ├── polities/
│   ├── battles/
│   ├── wars/
│   ├── equipment/
│   ├── tactics/
│   ├── periods/
│   ├── places/
│   ├── sources/
│   ├── claims/               # grouped by subject: claims/PER-000001.json
│   ├── relationships/        # grouped by subject: relationships/PER-000001.json
│   └── territories/          # GeoJSON snapshots
├── scripts/
│   ├── new_record.py         # issues the next free ID, writes a blank template
│   ├── validate.py           # schema + broken links + citation rules
│   ├── build_db.py           # JSON → build/warriors.sqlite
│   └── export_app.py         # SQLite → app bundle
├── tests/                    # sample records that must pass and must fail
├── docs/
│   ├── methodology.md        # section 4 of this doc
│   └── style-guide.md        # spelling, transliteration, BCE/CE, tone
├── build/                    # generated, not committed
└── app/                      # the app (laptop first, phone layout), roadmap phase 5
```

Python is suggested for the scripts because SQLite support is built in and it runs the same on your Windows laptop as anywhere else. Claims and relationships are grouped one file per subject rather than one per claim, which keeps the folder to a few hundred files instead of tens of thousands.

## 6. Proposed first 50 individuals

The list spans roughly 3,500 years: 10 people from Africa, 21 from Asia, 11 from Europe, 5 from the Americas and Caribbean and 3 from the Pacific, including 5 women and about a dozen lesser-known figures. Several were chosen deliberately as test cases for the certainty system: oral tradition, enemy-written sources, self-written propaganda and disputed historicity. Eras are given by century only; exact dates will be researched and graded, not assumed.

| # | Person | Polity / culture | Era (approx.) | Role | Why include |
| --- | --- | --- | --- | --- | --- |
| 1 | Thutmose III | Egypt, New Kingdom | 15th c. BCE | Pharaoh, commander | Megiddo: among the earliest battles with a detailed contemporary record |
| 2 | Ramesses II | Egypt | 13th c. BCE | Pharaoh | Kadesh: a classic case of royal propaganda against the Hittite record |
| 3 | Tiglath-Pileser III | Assyria | 8th c. BCE | King, army reformer | Built a professional standing army; lesser known |
| 4 | Cyrus the Great | Achaemenid Persia | 6th c. BCE | Founder | Empire built by conquest and integration; modern myths about him |
| 5 | Sun Tzu | China | c. 5th c. BCE (disputed) | Strategist | Historicity and authorship disputed: tests grades C–E |
| 6 | Alexander the Great | Macedon | 4th c. BCE | King, commander | Combined arms; main sources written centuries later |
| 7 | Chandragupta Maurya | Maurya India | 4th c. BCE | Founder | Indian traditions versus Greek accounts |
| 8 | Hannibal Barca | Carthage | 3rd c. BCE | General | Cannae; known mainly through his enemies' historians |
| 9 | Amanirenas | Kush (Meroë) | 1st c. BCE | Queen (kandake) | Fought Rome to a negotiated settlement; lesser known |
| 10 | Julius Caesar | Rome | 1st c. BCE | General, dictator | Wrote his own campaign accounts: self-propaganda |
| 11 | Arminius | Cherusci | 1st c. CE | War leader | Teutoburg; later nationalist myth |
| 12 | Boudica | Iceni, Britain | 1st c. CE | Queen, rebel leader | Few sources, inflated casualty figures, unknown battle site |
| 13 | Ban Chao | Han China | 1st c. CE | General, diplomat | Extended Han power into the Tarim Basin; lesser known |
| 14 | Zenobia | Palmyra | 3rd c. CE | Queen | Challenged Rome across the eastern provinces |
| 15 | Belisarius | Eastern Roman (Byzantine) | 6th c. | General | Reconquest campaigns; one historian both praised and attacked him |
| 16 | Khalid ibn al-Walid | Early caliphate | 7th c. | General | Yarmouk; speed of early Islamic expansion |
| 17 | Charlemagne | Franks | 8th–9th c. | King, emperor | Decades of annual campaigning; Carolingian state |
| 18 | Harald Hardrada | Norway | 11th c. | King, Viking | Varangian Guard to Stamford Bridge; saga reliability |
| 19 | Saladin | Ayyubid | 12th c. | Sultan | Hattin; reputation shaped by both Muslim and European writers |
| 20 | Minamoto no Yoshitsune | Japan | 12th c. | Samurai commander | Genpei War; heavy later legend |
| 21 | Genghis Khan (Temüjin) | Mongol | 12th–13th c. | Founder | Organisation, intelligence, mobility |
| 22 | Subutai | Mongol | 13th c. | General | Campaigns across Eurasia; lesser known |
| 23 | Sundiata Keita | Mali | 13th c. | Founder | Known chiefly through oral tradition |
| 24 | Baibars | Mamluk Sultanate | 13th c. | Commander, sultan | Ain Jalut against the Mongols |
| 25 | Trần Hưng Đạo | Đại Việt (Vietnam) | 13th c. | Commander | Defeated Mongol-Yuan invasions; lesser known in the West |
| 26 | Timur | Timurid | 14th c. | Conqueror | Devastation and legitimacy-building |
| 27 | Joan of Arc | France | 15th c. | Military leader | Trial records give unusually rich primary evidence |
| 28 | Itzcoatl | Mexica (Aztec) | 15th c. | Tlatoani | Founded the Triple Alliance; reportedly had histories rewritten |
| 29 | Pachacuti | Inca | 15th c. | Sapa Inca | Rapid expansion; sources written after the Spanish conquest |
| 30 | Mehmed II | Ottoman | 15th c. | Sultan | Constantinople; gunpowder siegecraft |
| 31 | Babur | Mughal | 16th c. | Founder | Panipat; wrote his own memoir |
| 32 | Lapulapu | Mactan (Philippines) | 16th c. | Chief | Mactan; one main European eyewitness |
| 33 | Cuauhtémoc | Mexica | 16th c. | Last tlatoani | Defence of Tenochtitlan; Indigenous and Spanish accounts |
| 34 | Oda Nobunaga | Japan | 16th c. | Daimyo | Nagashino and the disputed "volley fire" story |
| 35 | Qi Jiguang | Ming China | 16th c. | General | Anti-piracy campaigns and training manuals; lesser known |
| 36 | Idris Alooma | Kanem-Bornu | 16th c. | Mai (king) | Early firearms in the Sahel; lesser known |
| 37 | Yi Sun-sin | Joseon Korea | 16th c. | Admiral | Imjin War naval campaign; his own war diary |
| 38 | Gustavus Adolphus | Sweden | 17th c. | King, commander | The "military revolution" debate |
| 39 | Njinga | Ndongo and Matamba | 17th c. | Queen | Decades of war and diplomacy against Portugal |
| 40 | Nader Shah | Afsharid Persia | 18th c. | Shah | Karnal; rapid rise from obscurity |
| 41 | Toussaint Louverture | Saint-Domingue (Haiti) | 18th c. | Revolutionary general | The slave revolution that produced an independent state |
| 42 | Napoleon Bonaparte | France | 18th–19th c. | Emperor, commander | Corps system; Napoleonic warfare |
| 43 | Kamehameha I | Hawaiʻi | 18th–19th c. | King | Unification of the islands |
| 44 | Tecumseh | Shawnee | 19th c. | War leader | Pan-tribal confederacy |
| 45 | Shaka | Zulu | 19th c. | King | Military reforms; much myth from colonial-era writers |
| 46 | Te Rauparaha | Ngāti Toa, Aotearoa | 19th c. | Rangatira | Musket Wars; contested reputation; lesser known abroad |
| 47 | Menelik II | Ethiopia | 19th c. | Emperor | Adwa |
| 48 | Mustafa Kemal Atatürk | Ottoman Empire / Turkey | 20th c. | Commander, statesman | Gallipoli to the republic |
| 49 | Georgy Zhukov | Soviet Union | 20th c. | Marshal | Khalkhin Gol to Berlin; Soviet-era editing of the record |
| 50 | Võ Nguyên Giáp | Vietnam | 20th c. | General | Điện Biên Phủ; revolutionary warfare |

Reserves if you want swaps: Riwha Tītokowaru (Aotearoa), Simón Bolívar, Ranjit Singh, Tipu Sultan, Yaa Asantewaa, Samori Ture, Bai Qi, Tokugawa Ieyasu, Scipio Africanus, Basil II.

### Suggested pilot five

These five cover the hardest evidence problems, so the template is tested before the other 45 are written: **Joan of Arc** (rich primary records), **Hannibal Barca** (enemy-written sources), **Sundiata Keita** (oral tradition), **Sun Tzu** (disputed existence) and **Te Rauparaha** (contested reputation, Māori and colonial sources).

## 7. Development roadmap

Each phase ends with a check you sign off, so a problem is caught when it costs one record to fix, not fifty.

1. **Approve the foundations.** You accept or change the seven decisions at the top of this doc and the list of 50.
   - Gate: written approval of storage, IDs, dates, certainty grades and the list.
2. **Set up the repository in Claude Code.** Create the folders, `CLAUDE.md`, JSON Schemas, vocabularies, `new_record.py`, `validate.py` and `build_db.py`, with test records that must pass and must fail.
   - Gate: the validator catches a missing source, a broken ID link and a bad date on purpose.
3. **Pilot five profiles.** Joan of Arc, Hannibal, Sundiata, Sun Tzu and Te Rauparaha, plus every battle, polity, place and source they link to.
   - Gate: you review all five; the template and schema are adjusted once, here, before scaling.
4. **Populate the other 45 in batches of five,** grouped by region and era so shared battles, wars and polities are built once.
   - Gate per batch: validator passes, random claims spot-checked against their sources.
5. **Build the first app version.** An offline web app laid out for your laptop screen, with a phone layout: search, browse by era and region, profiles with certainty badges and source lists.
   - Gate: works offline on your laptop, and on your Android phone without signal.
6. **Add learning features.** Interactive timelines, side-by-side comparisons, campaign breakdowns, and quizzes built only from A and B claims.
7. **Add maps and dynasties.** Battle and place maps, campaign routes, territory snapshots over time, family trees from the relationships table.
8. **Expand.** The next 50 people, plus themed collections such as naval warfare, women commanders and resistance to empire.

### What I need from you next

Your decision on the seven items in the summary table, any swaps to the list of 50, and whether the pilot five suit you. A comment on any row in this doc works.
