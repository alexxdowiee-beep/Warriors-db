# Warriors & Leaders — App Build Brief (Version 1)

Nov 13, 2026 · @Alex Dowie

This brief is written for Claude Code. It describes version 1 of the Warriors & Leaders app: a read-only, offline-capable web app that presents the database honestly, with every fact showing its certainty grade and sources. The owner reviews each checkpoint before work continues.

## Purpose and rules

**What version 1 is for:** browsing and reading the database comfortably on a laptop, with a usable phone layout, so the owner can see the data, spot gaps and decide what to build next. It is a reading app, not an editor; all editing stays in the JSON files and the existing scripts.

**How to use this brief:**

1. Read `CLAUDE.md` first. Its research rules apply to the app too: the app must never show a claim as more certain than its grade.
2. Work through the build steps in order (section "Build steps"). Stop at each checkpoint, show the owner what was built, and wait for approval.
3. Ask before adding any dependency not named here, before changing the database schema, and before publishing anything to the internet.

**Non-negotiable rules for the app:**

- **Show the grade with every fact.** Any sentence, row or badge that presents a claim shows its certainty grade.
- **Never invent or fill in.** If data is missing, the app says so ("unknown", "not yet recorded"); it never guesses, interpolates or generates text about history.
- **No AI calls, no tracking, no external requests at runtime.** Everything the app shows comes from the exported data bundle, and it works with no internet connection once installed.
- **Respect cultural guidance.** Records with a `cultural_guidance` note display it, and any restricted material (for example haka words) is never reproduced.

## Scope of version 1

### In

- **Home / Explore:** the Chronicle timeline of dated events, filterable by region, plus a people index.
- **Person profile:** the Dossier layout the owner approved, with claims, battles, myths, sources, connections and a life slider.
- **Battle and war pages:** date, place, sides, result and the people involved, with grades.
- **Source pages:** each source with its type, reliability tier, bias notes, what it derives from, and every claim that cites it.
- **Search:** across people, battles, wars, places and sources, by any of their names.
- **Evidence views:** filter a person's claims by grade, type or perspective.
- **Offline and installable:** works with no connection on the laptop and on an Android phone.

### Out (later versions)

- Version 2, next: the Atlas home with its globe, campaign maps on profiles, territory changes, and licensed images (the approved "Redesign 1" and the map panel of "Redesign 3").
- Quizzes (the data is ready, but they need their own design).
- Side-by-side comparisons of two people.
- Family trees and relationship graphs.
- Editing data in the app.
- Any account, login or server.

These are listed so that nothing in version 1 blocks them. In particular, keep the data export general enough that maps, quizzes and comparisons can read it later without changes to the core files.

## Architecture and technology

### The pipeline

1. **JSON records** in `data/` — the source of truth, edited only by the existing workflow.
2. **`build_db.py`** — compiles them into `build/warriors.sqlite` (exists already).
3. **`export_app.py`** — new: reads the SQLite file and writes a compact data bundle to `app/data/` (contract in the next section).
4. **The app** in `app/` — static files that read only `app/data/`.

The app never reads the SQLite file or the raw JSON directly. That keeps it fast and lets the database change shape without breaking the app, as long as the export contract holds.

### Technology choices

| Choice | Decision | Why |
| --- | --- | --- |
| Framework | None: plain HTML, CSS and JavaScript modules | No build step or Node install needed; easy for any future session to read; plenty for a few thousand records |
| Routing | Hash-based URLs, e.g. `#/person/PER-000003` | Works offline and on any static host; every page can be bookmarked |
| Local server | `python -m http.server` from the `app` folder | Python is already installed for the scripts |
| Offline | Web app manifest and a service worker that caches the app and the data bundle | Installable on Android; works with no signal |
| Fonts | Cinzel and Alegreya, self-hosted as woff2 files in `app/fonts/` with their licence files | Both are under the SIL Open Font License; self-hosting is required for offline use |
| Search | A prebuilt index in the data bundle, searched in the browser | No server; instant results |
| Dependencies | None at runtime; no external scripts, fonts or CDNs | Offline, private and durable |

### Folder layout

```
app/
├── index.html          # single page; all screens render into it
├── manifest.webmanifest
├── sw.js               # service worker
├── css/
│   ├── tokens.css      # colours, type, spacing (see Design system)
│   └── app.css
├── js/
│   ├── main.js         # router and page loading
│   ├── data.js         # fetches and caches the bundle
│   ├── search.js
│   └── views/          # one module per screen
├── fonts/              # Cinzel, Alegreya + OFL licence files
├── icons/              # app icons for install
└── data/               # generated by export_app.py; not edited by hand
```

### Getting it onto the phone

On the laptop, the local server is enough. For the phone, the app must be served from somewhere the phone can reach. **Ask the owner before publishing anywhere.** Options to present at that checkpoint: GitHub Pages (the owner's account is already set up; publishing from a private repository may need a paid plan, so a separate public repository holding only the built app is the usual alternative), or another free static host. Nothing in the data is private, but publishing is the owner's decision.

## Data export contract

`scripts/export_app.py` reads `build/warriors.sqlite` and writes the files below to `app/data/`, deleting the old bundle first. The app relies only on this contract.

| File | Contents |
| --- | --- |
| `manifest.json` | Bundle version (a hash of the contents), generation time, record counts by type |
| `index.json` | One entry per person: id, primary name, roles, polities, region, active period, overall grade, status, tags, one-paragraph summary |
| `people/<ID>.json` | Everything a profile page needs, already resolved (see below) |
| `battles/<ID>.json`, `wars/<ID>.json` | The record, its sides, people involved with roles, place, related claims |
| `sources/<ID>.json` | The source record, reliability tier, `derives_from` resolved to titles, and every claim that cites it |
| `polities/<ID>.json`, `places/<ID>.json`, `civilisations/<ID>.json` | The record plus the people, battles and wars linked to it |
| `timeline.json` | Every person's active period and every dated war and battle, with region and era for filtering |
| `search.json` | One entry per searchable record: id, type, label, every alternative name, and a diacritic-folded version of each |
| `vocab.json` | Display labels and short explanations for grades, claim types, bias flags, verdicts, relations and reliability tiers |
| `redirects.json` | Tombstoned IDs mapped to their replacements, so old links still work |

### What "resolved" means

The app should never have to join tables. Each `people/<ID>.json` already contains:

- the person record and all names;
- every claim about the person, each with grade, type, verdict, flags, perspective (as display names) and its citations, each citation carrying the source's title, access level and reliability tier;
- relationships in both directions, with the other record's name and type;
- the battles and wars they took part in, with their role and result;
- the myth claims, separately;
- the overall grade and which core claim set it.

A trimmed example of the shape:

```json
{
  "id": "PER-000003",
  "primary_name": "Sundiata Keita",
  "certainty": "C",
  "status": "sourced",
  "active_period": { "earliest": 1230, "latest": 1259, "display": "c. 1230s–1250s", "certainty": "C" },
  "claims": [
    {
      "id": "CLM-000041",
      "statement": "The decisive battle was at Kirina",
      "claim_type": "event", "certainty": "B", "verdict": "accepted",
      "bias_flags": ["oral-tradition"], "perspective": [],
      "citations": [ { "source_id": "SRC-000023", "title": "The Empires of the Western Sudan: Mali Empire", "access": "opened", "tier": "reference" } ]
    }
  ],
  "cultural_guidance": null
}
```

### Export rules

- **Deterministic output:** the same database must produce byte-identical files, with stable key order and sorting, so Git shows only real changes.
- **Nothing added:** the exporter copies and joins; it never writes new historical text.
- **Tombstones** are excluded from lists and pages but listed in `redirects.json`.
- **Tests:** export runs cleanly on the current database; every claim in the bundle has a grade and claim type; every citation resolves to a source; every link in every file points to a record that exists in the bundle.

## Screens

**Revised after the owner saw the first build.** The approved layouts are "Redesign 2 · Chronicle timeline" and "Redesign 3 · Dossier profile" from the planning conversation's design canvas. Claude Code cannot open that canvas, so this section describes them fully. "Redesign 1 · Atlas home" (globe, layers, era tabs) is approved for **version 2**, together with real maps and images.

### Header (every screen)

The wordmark **WARRIORS & LEADERS** (Cinzel, with the ampersand in the accent colour), the screen name in small Cinzel, the main navigation (Chronicle, People, Battles, Sources), and a search box. On a phone the navigation collapses into a menu button and the search box becomes an icon.

### Home: the Chronicle timeline

- **Region filter chips** in the header bar: All regions, Africa, Asia, Europe, Americas, Pacific, each label in its region colour.
- **Intro card** at top left (gold-tinted panel): a title and one line explaining how to read the cards.
- **The spine:** a horizontal gold line that scrolls sideways inside its own container. Event cards alternate above and below it, each joined to a node on the line labelled with its date (Cinzel, accent colour).
- **Each card:** an image strip (see Images below) with a bottom border in the region colour; the region in small coloured capitals; the title in Cinzel; one sentence; the person it belongs to as a link; and the grade badge.
- **Card content comes from the data, never written by the app.** Cards are dated battles, wars and key events in date order. The sentence is the statement of the record's main claim, or its `outcome` field if it has none. The badge is that claim's grade. Undated or C-dated items show their date with its grade.
- **Era overview strip** along the bottom: the five era bands with a dot per card, the band currently in view highlighted. Clicking a band scrolls the spine there.

### People index

A grid of person cards, each with name, polity, era, regions, overall grade badge and status chip.

### Person profile: the Dossier

Two panels side by side on a laptop, with a strip across the bottom.

**Left panel (content):**

1. **Hero:** an image area 230px high fading into the page (see Images), with the breadcrumb (People › polity) in small Cinzel capitals and the name in large Cinzel laid over its lower edge.
2. **Alternative name** in italic, if any.
3. **Chips:** overall grade (letter and label, in its grade colour), the reign or active period with its grade, regions, era, and "Research in progress" when not yet reviewed.
4. **Tabs:** Overview · Campaigns · Evidence · Myths · Sources.
   - **Overview:** the summary as a lead paragraph, then a four-cell key-facts grid (Born, Died, Role, and Origin or main polity), each with its grade.
   - **Campaigns:** the narrative career sections and the battles table.
   - **Evidence:** the full claims list with filters by grade, type and perspective; the core claims that set the overall grade; bias flags present; "Sources disagree" pairs.
   - **Myths:** the myths table.
   - **Sources:** every source cited, with tier and access level.

**Right panel (life):**

- **Version 1:** the **life slider** at the top: a track with the person's dated milestones (from dated claims and battles, in order). Selecting a milestone shows its statement, date and grade in a card below. Under that, Connections and, if present, Cultural guidance.
- **Version 2:** a campaign map is added above the slider, with markers for the same milestones.

**Bottom strip:** tabs with counts (Battles, Claims, Sources, Myths, Connections, Perspectives) and a horizontally scrolling row of cards for the selected tab. For battles, each card shows date, grade, name, opponent, role and result.

**Phone:** everything stacks in one column: hero, chips, tabs (scrolling sideways if needed), tab content, the life panel, then the bottom strip, which still scrolls sideways.

### Battle, war, source, polity and place pages

Use the same Dossier pattern in a simpler form: hero, chips (date with grade, kind, region), tabs where useful, and the record's own content. Battle pages keep the sides table, and say "unknown" in words for unknown strengths and casualties. Source pages list every claim that cites them, grouped by person.

### Images

There are no image records yet. Until they exist, image areas show a neutral dark gradient only: **no placeholder text and no stock or generated images**. Version 2 adds media records with licence and credit, shown in small type on each image.

### Search

One search box, results grouped by type. It must match any alternative name and ignore diacritics and case: "tran hung dao" finds Trần Hưng Đạo, "chinggis" finds Genghis Khan, "tamerlane" finds Timur. The `/` key focuses the search box on the laptop.

## Design system

Dark theme only in version 1, as approved. Define everything as CSS custom properties in `tokens.css`, so a light theme can be added later without touching components.

### Colours

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | #0F1115 | Page background |
| `--bg-header` | #0B0D10 | Header bar |
| `--bg-band` | #13161B | Timeline band |
| `--panel` | #171A20 | Panels, key-facts cells, cards |
| `--border` | #2A2F38 | Panel and table borders |
| `--text` | #E7E4DC | Main text |
| `--text-2` | #C9C4BA | Secondary text, nav links |
| `--muted` | #A8A39A | Labels, captions |
| `--accent` | #E2B25C | Bronze-gold: links, highlights, primary buttons |
| `--accent-strong` | #F5D08E | Hover, active era band text |
| `--accent-bg` | #241E12 | Active nav item background |
| `--era-active` | #3A2E17 | Highlighted era band |
| `--loss` | #F0A090 | Defeat results, bias flag text |
| `--loss-border` | #C0705F | Bias flag outline |
| `--input-bg` | #161920 | Search box |

### Certainty grade badges

Grades must never rely on colour alone: every badge shows the letter and, where space allows, the label.

| Grade | Label | Colour |
| --- | --- | --- |
| A | Established | #7FC8A0 |
| B | Probable | #9DBBE0 |
| C | Disputed | #E2B25C |
| D | Weak | #E8956B |
| E | Legendary or false | #C9C4BA, with a dashed outline |

Check every badge against `--panel` and `--bg` for at least 4.5:1 contrast; adjust shades if needed and report the final values.

### Region colours

Used only for region labels, chips and card borders, never for grades, and always next to the region's name in words.

| Region | Colour |
| --- | --- |
| Africa | #E6A86B |
| Asia | #C9A7E8 |
| Europe | #D8C3A5 |
| Americas | #E7A0B8 |
| Pacific | #7FD3DA |

### Typography

- **Cinzel** (weights 500–800) for the wordmark, page titles, section headings and small uppercase labels (letter-spacing 0.08–0.14em).
- **Alegreya** (400, 500, 700 and italic) for all body text, at 17px with line-height 1.6; the summary lead at 22px.
- **Sizes:** person name `clamp(40px, 6vw, 68px)`; section headings 26px; panel labels 12–13px uppercase Cinzel.
- Fallbacks: Cinzel → "Times New Roman", serif; Alegreya → Georgia, serif.
- Set the `lang` attribute on names in other languages and scripts (e.g. `lang="vi"` for Trần Hưng Đạo), so screen readers and fonts handle them correctly.

### Layout

- Content max-width 1400px, side padding 32px (16px on phones).
- Profile columns: section nav 190–210px, reading column flexible, right rail 280–320px.
- Breakpoints: three columns from 1200px; two columns from 768px (rail moves below the title band); one column below 768px.
- Wide tables scroll inside their own container; the page itself never scrolls sideways.

### Components

Grade badge, status chip, bias-flag chip (outlined, `--loss` text), key-facts strip, panel, data table, primary button (gold background, dark text), secondary button (gold outline), timeline bar, search result row.

### Accessibility

- WCAG AA contrast throughout.
- Touch targets at least 44 × 44px.
- Everything usable by keyboard, with a clearly visible focus outline in the accent colour.
- Proper heading order and landmarks, so a screen reader can jump between sections.
- Respect "reduce motion" settings; version 1 needs no animation.

## Evidence display rules

These rules are what make this app different from an ordinary encyclopedia. Treat them as requirements, not styling.

### Grades and types

- Every claim shows its **grade badge** and its **claim type** in words: Event, Tradition, Text or Interpretation.
- **Tradition claims** are introduced as tradition ("The epic says…", "Ngāti Toa's account…") and styled differently from events, for example with an italic statement and a "Tradition" tag. They must never be presented as plain historical fact.
- **Key facts and summaries** show their own grades. A birth year graded C appears as "c. 1162 or 1165 · C", never as a bare date.
- **D and E claims** appear only in the claims list, the myths table, or with their badge clearly attached. They never appear unlabelled in a summary, key fact or timeline label.
- **Disputed alternatives** (claims linked by `alternative_claim_ids`) are shown side by side as "Sources disagree", never with one silently chosen.

### Myths

The myths table shows the popular claim, a verdict chip (False, Disputed, Misleading, Tradition and so on, from the verdict and grade), and the evidence. AI-generated sources appear only here, labelled "Origin of this myth: AI-generated web page", and are never shown as evidence anywhere else.

### Sources and citations

- Each citation shows the source title (linked to its source page), its reliability tier, and its access level in words: "Opened", "Excerpt", "Via a secondary source" or "Not yet consulted".
- A claim's `evidence_status` (for example "A once a second source is opened") is shown under the claim in small text. It tells the reader honestly what is still to be done.
- Records whose status is not "reviewed" show a quiet banner: "Research in progress — not yet reviewed."

### Perspectives

- Claims with `perspective_of` show "From the perspective of: …".
- The claims list can be filtered by perspective, so a reader can see, for example, Ngāti Toa's and Ngāi Tahu's accounts of the same events.
- On battle pages, each side's row links to that side's perspective claims where they exist.

### Numbers and dates

- Quantity ranges are shown as ranges with their basis: "Ancient claim: 70,000 dead (Polybius) · Modern estimate: not recorded". Unknown values say "unknown".
- Dates use their display string and BCE/CE; the astronomical year numbers used for sorting are never shown.

### Cultural guidance

Records with `cultural_guidance` show it in a clearly labelled panel near the top of the page. The app never reproduces restricted material; for example, it may describe Ka Mate and its history but must not display its words.

### Profile text

The narrative profile sections may contain grade markers in brackets, such as "(B)" or "(A as tradition)". Where a marker is simply a single grade letter in brackets, render it as a small inline badge; otherwise leave the text as written. The claims list remains the authority.

## Build steps

Work in this order. At each **checkpoint**, stop, show the owner the result (screenshots where useful), and wait for approval. Commit after each approved step.

1. **The export.** Write `scripts/export_app.py` and its tests, following the data export contract.
   - Checkpoint: show the counts in `manifest.json` and the full `people/` file for Sundiata Keita.
2. **The shell.** Create `app/` with the folder layout, `tokens.css`, the self-hosted fonts and licence files, the header, the router and the data loader. Explain how to start the local server.
   - Checkpoint: the owner opens `http://localhost:8000` and sees the header, the fonts and an empty home page.
3. **The person profile.** Build the full profile page first, since it is the heart of the app. Test it on three contrasting records: Sundiata Keita (grade C, oral tradition), Baibars (grade A, dense sources) and Te Rauparaha (perspectives and cultural guidance).
   - Checkpoint: screenshots of all three at laptop width and phone width.
4. **Explore.** The Chronicle timeline home, with its era overview strip, and the people index.
   - Checkpoint: screenshot, and confirm every person in the database appears.
5. **The other pages and search.** Battle, war, source, polity, place and civilisation pages, then search.
   - Checkpoint: demonstrate the three search examples from the Screens section, and one page of each type.
6. **Offline and installable.** Manifest, icons and service worker. Test offline mode on the laptop.
   - Checkpoint: the app still works with the network switched off.
7. **Publishing for the phone.** Present the hosting options from the Architecture section with their trade-offs, and **wait for the owner's decision** before publishing anything.
   - Checkpoint: the owner installs the app on their Android phone.
8. **Documentation.** Add a short "Updating the app" section to `README.md` (run `build_db.py`, then `export_app.py`, check, commit, publish), run the validator and all tests, then commit and push.

### Prompt to start

Once this brief is saved as `docs/APP_BRIEF.md`, the owner pastes:

```
Read CLAUDE.md and docs/APP_BRIEF.md. We're building version 1 of the app.
Start with build step 1 only, and stop at its checkpoint.
```

## Acceptance checklist

Version 1 is done when the owner can tick every line.

### Content and honesty

- [ ] Every person in the database has a profile page, and every battle, war, source, polity and place linked from it has a page.
- [ ] Every claim shown anywhere carries its grade and claim type.
- [ ] Tradition claims are visibly marked as tradition.
- [ ] No D or E claim appears unlabelled in a summary, key fact or timeline label.
- [ ] Disputed alternatives appear side by side.
- [ ] Unknown numbers say "unknown".
- [ ] Records not yet reviewed show the "Research in progress" banner.
- [ ] Cultural guidance appears on Te Rauparaha's page, and Ka Mate's words appear nowhere.
- [ ] AI-generated sources appear only as the origin of myths.
- [ ] The app contains no historical text that is not in the data bundle.

### Design and usability

- [ ] Dark theme, Cinzel headings and Alegreya text, matching the Design system section, with Chronicle and Dossier laid out as in the Screens section. Image areas show only a neutral gradient, with no placeholder text.
- [ ] Laptop: the Dossier's two panels plus bottom strip; phone: one column. Nothing scrolls sideways except the Chronicle spine and the bottom card strips, which scroll inside their own containers.
- [ ] Search finds "tran hung dao", "chinggis" and "tamerlane".
- [ ] Keyboard navigation works throughout; focus is always visible.
- [ ] Grade badges meet contrast requirements and show letters, not just colours.

### Technical

- [ ] `export_app.py` produces identical output on repeated runs, and its tests pass.
- [ ] The validator passes (warnings allowed, no errors).
- [ ] The app works offline on the laptop after one visit.
- [ ] The app installs and works offline on the owner's Android phone.
- [ ] No external requests at runtime (checked in the browser's network panel).
- [ ] `README.md` explains how to update the app after each batch.

### After version 1

Likely next steps, to be decided with the owner once they have used it: quizzes built from the quiz-ready claims, side-by-side comparisons, maps of battles and campaigns, and a relationship graph. The owner's experience of version 1 decides the order.
