# Batch 1 · Genghis Khan (Temüjin) — Profile Draft

Nov 13, 2026 · @Alex Dowie

Genghis Khan united the peoples of the Mongolian steppe and launched the conquests that created the largest contiguous land empire in history. His life is known mainly from one anonymous Mongol chronicle and from the histories of peoples he conquered or employed, so nearly every source has a stake in how he is remembered.

This is the first conversion-ready profile. It uses **temporary labels** (GK-…) instead of database IDs; Claude Code assigns the real IDs with `new_record.py`.

## Record card

| Field | Value |
| --- | --- |
| Temporary label | GK-P |
| Primary name | Genghis Khan |
| Other names | Temüjin (birth name); Chinggis Khan (scholarly form of the title); Cinggis Qan (transliteration of the Mongolian) |
| Core claim set | `commander` |
| Roles | founder, ruler, commander |
| Polity | Mongol Empire (Khamag Mongol Ulus, later Yeke Mongol Ulus) |
| Born | 1162 or 1165 (sources differ), Mongolian steppe · grade C |
| Died | 1227, during the siege of the Xi Xia capital · grade A for year; cause C |
| Active period | c. 1180s–1227; title Chinggis Khan from 1206 · grade A |
| Period | 12th–13th centuries; rise of the Mongol Empire |
| Overall certainty | **B · Probable** — main events firmly attested across several traditions; early life rests on one chronicle |
| Tags | `mongol-empire`, `state-founder`, `steppe-warfare`, `patron-bias`, `batch-1` |
| Cultural guidance | Revered in Mongolia as the father of the nation; describe his reputation there with respect alongside the record of conquest |

**Research note.** I opened two sources: Timothy May's peer-reviewed survey "The Mongol Empire in World History" (*World History Connected* 5.2, 2008), and the catalogue record of Igor de Rachewiltz's open-access translation of the *Secret History of the Mongols* (the translation itself is a 5 MB PDF I could not load). The 2003 genetics study, Columbia University's teaching site and National Geographic are cited from search excerpts. The main primary sources (Juvaini, Rashid al-Din, the Chinese records) are cited through May, flagged `via-secondary`.

## The evidence

Genghis Khan is unusually well documented for a 13th-century ruler, but by very different kinds of writer: his own people's epic chronicle, Persian officials who served his grandsons, Chinese court historians, and the shocked chroniclers of the lands he conquered. Each tells a different part of the story, for different reasons.

| Label | Source | Date | Viewpoint | Main bias |
| --- | --- | --- | --- | --- |
| GK-S01 | *The Secret History of the Mongols* | 13th c. (exact date debated) | Mongol, written within the ruling family's circle | Celebrates the Chinggisid line; epic and literary in style. The only Mongol-language account (`patron-bias`) |
| GK-S02 | Ata-Malik Juvaini, *History of the World Conqueror* | c. 1260 | Persian official in Mongol service ([May](https://journals.gmu.edu/whc/article/download/4894/2835?inline=1)) | Writes for his Mongol employers yet laments the destruction of his world (`patron-bias`) |
| GK-S03 | Rashid al-Din, *Compendium of Chronicles* | Early 14th c. | Persian vizier of the Mongol Ilkhans | Official history using Mongol records now lost (`patron-bias`) |
| GK-S04 | Chinese records, including the *Yuan shi* | Compiled 1369–70 (early Ming) | Chinese dynastic history | Late; compiled quickly by the dynasty that expelled the Mongols (`late-source`) |
| GK-S05 | Minhaj al-Siraj Juzjani, *Tabaqat-i Nasiri* | Mid-13th c. | Refugee scholar in Delhi | Hostile; a victim's-eye view (`hostile-source`) |
| GK-S06 | Ibn al-Athir, *The Complete History* | Before 1233 | Contemporary Arab historian in Mosul | Hostile, horrified; casualty figures inflated (`hostile-source`, `inflated-numbers`) |
| GK-S07 | European envoys (Carpini, Rubruck) and Marco Polo | 1240s–1290s | Outsiders at the Mongol courts | Observant but filtered through European assumptions |

### What this means for grading

- **His early life** rests almost entirely on the *Secret History*. Graded B at best, and C where it reads as epic.
- **The conquests** are attested by sources on all sides: winners, losers and outsiders. That gives many A grades.
- **Numbers of the dead** come mostly from hostile or traumatised writers. May notes that the death tolls in the sources are exaggerated, but that they reflect real mass killing ([May](https://journals.gmu.edu/whc/article/download/4894/2835?inline=1)). All such figures carry `inflated-numbers`.
- **Speeches and sayings** are recorded by authors writing years later for their own audiences. Exact words are graded D unless a source gives good reason to trust them.

### Derived sources

Rashid al-Din drew on some of the same Mongol material as the *Secret History*, and later Chinese records draw on Yuan court documents. Where two sources share an origin, they are linked with `derives_from` and count as one for grading.

## Life and historical context

### The steppe in the 12th century

The Mongols were one tribe among several on the Mongolian plateau, alongside the Kereit, Naiman, Merkit and Tatars ([May](https://journals.gmu.edu/whc/article/download/4894/2835?inline=1)). To the south, the Jin dynasty of the Jurchen ruled northern China and, by long-standing practice, kept the steppe divided by playing tribes against each other (B, to source).

### Birth

His birth year is uncertain. May gives 1165; de Rachewiltz's translation and the Columbia teaching site give 1162; other dates are also proposed in the literature (C, all stored as linked claims).

### Youth (mostly from the *Secret History*)

The *Secret History* tells of a hard youth. His father Yesügei was poisoned by Tatars, and the family was abandoned by its followers and lived in poverty. Temüjin killed his half-brother Begter in a quarrel over food. He married Börte, and when the Merkits abducted her he recovered her with the help of Toghril, khan of the Kereit, and his sworn brother Jamukha. These episodes are graded **B as tradition content** and **C as events**: they come from one source, composed within his family's circle, which shaped them into an epic of the hero's rise.

### Rise to power (1180s–1206)

May's outline is firmly attested: Temüjin became a nökhör (companion or vassal) of Toghril and rose to lead among the Mongol tribes; growing rivalry led to a break, and in 1203 Temüjin defeated Toghril. By 1204 he had defeated all his rivals, including the Naiman ([May](https://journals.gmu.edu/whc/article/download/4894/2835?inline=1), A). In 1206 an assembly of his followers proclaimed him Chinggis Khan, sole ruler of the united "All Mongol State" (A).

### The title

May, following de Rachewiltz, explains "Chinggis" as meaning firm, fierce or resolute. The older explanation, "oceanic ruler", from an early 20th-century link to a Turkic word for sea, has been set aside (B; myth table).

## Military career

**Unifying the steppe (to 1206).** Twenty years of wars against rival khans and former allies, ending with the defeat of Toghril in 1203 and of the Naiman in 1204 ([May](https://journals.gmu.edu/whc/article/download/4894/2835?inline=1), A).

**Xi Xia (1209).** The Tangut kingdom of Xi Xia, in what is now north-west China, was subdued by 1209 (A).

**The Jin empire (1211 onwards).** In 1211 he invaded the Jin empire of northern China. May notes the campaigns began as raids, but as resistance collapsed the Mongols kept the territory; most of the Jin empire was conquered by 1216, though resistance lasted until 1234 under his successor (A). The fall of the Jin central capital, Zhongdu (on the site of modern Beijing), in 1215 is widely reported (B, to source).

**Into Central Asia (1209–1218).** Mongol armies pursued tribal leaders who had fled west, and smaller states such as the Uighurs submitted as vassals, bringing the empire to the border of the Khwarazmian Empire (A).

**Khwarazm (1218–1221).** Chinggis Khan at first sought peaceful trade. After the governor of the border town of Otrar massacred a Mongol-sponsored caravan and diplomacy failed, he marched west, leaving a small force in China. He took Otrar, then split his army to strike the empire at several points; the Khwarazm-shah Muhammad II, his larger army spread thin defending cities, fled and died on a Caspian island. In 1221 Chinggis Khan defeated Muhammad's son Jalal al-Din near the Indus, and then kept only the lands north of the Amu Darya to avoid overstretch ([May](https://journals.gmu.edu/whc/article/download/4894/2835?inline=1), A for the outline).

**The western raid (1220–1223).** While he campaigned in Khwarazm, his generals Jebe and Subutai led a force around the Caspian into the Caucasus and the steppe north of the Black Sea, defeating a Rus' and Cuman army at the Kalka in 1223 (B; covered in Subutai's profile).

**Xi Xia and death (1226–1227).** Returning to put down a rebellion in Xi Xia, he besieged its capital, Zhongxing, and died during the siege in 1227. May, following the *Secret History*, says he died from injuries after a fall from his horse while hunting. Other accounts differ, so the cause is graded C. His burial place is unknown (A that it is unknown).

## Major campaigns and battles

| Label | Engagement | Date | Kind | Opponent | Result | Grade |
| --- | --- | --- | --- | --- | --- | --- |
| GK-B01 | Defeat of Toghril and the Kereit | 1203 | unknown | Kereit | Victory | A |
| GK-B02 | Defeat of the Naiman | 1204 | unknown | Naiman | Victory | A |
| GK-W01 | Subjugation of Xi Xia | 1205–1209 | campaign (WAR) | Xi Xia | Submission | A |
| GK-W02 | War against the Jin | 1211–1234 | war (WAR) | Jin dynasty | Most territory taken by 1216; completed under Ögödei | A |
| GK-B03 | Fall of Zhongdu | 1215 | siege | Jin | Captured | B |
| GK-W03 | Invasion of Khwarazm | 1218–1221 | war (WAR) | Khwarazmian Empire | Victory | A |
| GK-B04 | Capture of Otrar | 1219–1220 | siege | Khwarazm | Captured | A |
| GK-B05 | Battle of the Indus | 1221 | field-battle | Jalal al-Din | Victory | A |
| GK-B06 | Siege of Zhongxing | 1227 | siege | Xi Xia | Fell after his death | B |

Army sizes: `unknown` throughout. The sources give figures, but none is reliable enough to store without a modern estimate attached; that can be added during verification.

## Leadership, strategy and technology

### Leadership and organisation

- **Breaking the tribes.** He dissolved old tribal lines and regrouped his people into an army built on a decimal system of units of 10, 100 and 1,000, with strict discipline ([May](https://journals.gmu.edu/whc/article/download/4894/2835?inline=1), A). Old tribal elites were removed and loyalty redirected to his family, the "golden lineage" (A).
- **Loyalty and merit.** Several of his greatest generals, Subutai and Jebe among them, rose from modest origins through service, not birth (B, to source in Subutai's profile).
- **A personal guard** (the keshig) that doubled as a training ground for commanders and administrators (B, to source).
- **Using the conquered.** The empire soon relied on a multi-ethnic administration of Chinese, Persian and Uighur officials (May, A; developed mainly under his successors).
- **Writing.** Though illiterate himself, after defeating the Naiman in 1204 he ordered a Mongolian script adapted from the Uighur alphabet; it was used in Mongolia into the 20th century and is still used in Inner Mongolia (May, A).

### Strategy

- **From raiding to ruling.** The Jin campaigns began as raids; the Mongols kept territory only as resistance collapsed (May, A).
- **Avoid overstretch.** In Khwarazm he annexed only the lands north of the Amu Darya (May, A).
- **Fear as a weapon.** Cities that resisted could be destroyed, and those that submitted spared, so news of each massacre encouraged the next city to surrender. May notes the Mongols cultivated the idea that they were God's punishment on the Muslim world (B as interpretation).
- **Trade first, war second.** He opened relations with Khwarazm to trade, and turned to war only after the Otrar massacre (May, A).

### Tactics

- **Coordinated multi-front campaigns.** May describes an army operating over several fronts in separate corps but in a coordinated effort, something other medieval armies could not match (A as interpretation by a specialist).
- **Feigned retreat.** Marco Polo described Mongol horsemen apparently fleeing, then wheeling round once the enemy thought the battle won (May quoting Polo; B; Polo wrote decades later).
- **Total war.** The only result that mattered was the enemy's defeat, by ruses and trickery as readily as by battle (May, A as interpretation).

### Weapons and technology

- **The mounted archer with a composite bow**, with each warrior keeping several horses so armies could move fast and far (B, to source).
- **Captured expertise.** Siege engineers and their machines, drawn from conquered Chinese and Muslim lands, let a steppe army take walled cities (B, to source).
- **Law.** Tradition credits him with a body of law, the yasa. Whether it was ever a single written code is debated (C).

## Achievements and controversies

### Political achievements

- **A nation from tribes.** May argues the modern Mongolian nation exists because of the empire he founded, which replaced separate tribes with one collective people ([May](https://journals.gmu.edu/whc/article/download/4894/2835?inline=1), A as interpretation).
- **A new source of legitimacy.** For centuries afterwards, descent from Chinggis Khan was the main claim to rule across much of Central Eurasia; Muscovite and Central Asian princes even forged genealogies to claim it (May, A).
- **The empire's framework.** His succession choice, his son Ögödei, kept the empire united for another generation, and his successors built the largest contiguous empire in history (A).
- **Trade and exchange.** The later Pax Mongolica, which carried goods and ideas across Eurasia, grew from the empire he founded, though it belongs mainly to his successors and was never wholly peaceful (May, A).

### Controversies, from more than one side

| Issue | How it is remembered | Grade | Perspective tag |
| --- | --- | --- | --- |
| Mass killing in the conquests | Real and large-scale. May notes that the death tolls in the sources are exaggerated, but that thousands died and the Mongols depopulated regions that rebelled or resisted | A for mass killing; D for specific totals | Khwarazm, Xi Xia, Jin |
| The destruction of Xi Xia | The *Secret History* records a deathbed order that the Tangut be wiped out; the Tangut state was destroyed in 1227 | A for the destruction; D for the exact words | Xi Xia |
| The Islamic world's experience | To many Muslims the conquest felt like divine punishment; the Mongols encouraged that idea | A | Khwarazm |
| Mongolia's memory | Denigrated as a "feudal oppressor" under communist rule; since 1990 honoured everywhere as the nation's father, and by some as a root of Mongolian democracy, a view May notes is contested because khans were chosen only from his descendants | A for both phases; C for the democracy link | Mongol Empire / Mongolia |
| His early violence | The *Secret History* has him kill his half-brother Begter as a youth | C (single source) | — |

The database records these as linked claims with `perspective_of`, so the app can show the conquest as the empire's founders, its victims and modern Mongolians each tell it.

## Legacy and myths

### Legacy

- **The map of Asia.** May argues that the states that emerged after the Mongol Empire, from the Ottomans and Mughals to Muscovy, all owed their existence to it in one form or another ([May](https://journals.gmu.edu/whc/article/download/4894/2835?inline=1), A as interpretation).
- **Religion.** By ending the Abbasid Caliphate (under his grandson, in 1258) and later backing Tibetan Buddhist leaders, the empire reshaped authority in two world religions (May, A; mostly after his death).
- **Modern Mongolia.** Airports, banks, banknotes, universities and products bear his name; he is the national founder (May, A).
- **Military thought.** The Mongol army's speed, coordination and use of intelligence remain standard case studies in military education (B, to source).

### Myths and misconceptions

| Label | Popular claim | Verdict | Evidence |
| --- | --- | --- | --- |
| GK-M01 | "Genghis Khan" was his name | **False (A)** | A title granted in 1206; his birth name was Temüjin |
| GK-M02 | The title means "oceanic ruler" | **Outdated (B)** | An early 20th-century theory; now read as firm, fierce or resolute (May, following de Rachewiltz) |
| GK-M03 | 16 million living men are his direct descendants | **Overstated (C)** | A 2003 study found a Y-chromosome lineage carried by about 0.5% of the world's men and proposed it spread with Genghis Khan's male-line kin; it may predate him, and it shows a lineage, not proof of individual descent (Zerjal et al. 2003, excerpts) |
| GK-M04 | The Mongols won by sheer numbers | **False (B)** | In Khwarazm the Khwarazm-shah's army was the larger; Mongol mobility and coordination decided it (May) |
| GK-M05 | At Bukhara he declared himself "the punishment of God", in those words | **Literary (D)** | Reported by Juvaini, writing about 40 years later in Mongol service (`patron-bias`) |
| GK-M06 | His tomb has been found | **False (A)** | The burial place remains unknown |
| GK-M07 | The famous portrait shows his real face | **Unproven (C)** | The best-known portrait was painted after his death (to verify date and source) |
| GK-M08 | The Mongols only destroyed and built nothing | **Misleading (B)** | Trade, administration, a script and exchange across Eurasia followed the conquests (May; Columbia teaching site, excerpt) |
| GK-M09 | He founded Mongolian democracy | **Disputed (C)** | A modern Mongolian view; May notes khans were chosen only from his family |
| GK-M10 | He died after falling from his horse | **Disputed (C)** | The *Secret History*'s account; other sources give different causes |

## Claims (conversion-ready)

**This table is the authority for grades.** In the sections above, "A" sometimes marks scholarly consensus; under our rule, a claim needs two independent sources, one of them opened, to be stored as A. Since only May is opened so far, most consensus events are entered here as **B**, with "A once a second source is opened". Myth rows GK-M01 to M10 above convert to claims as they stand, under the myth rule (verdict plus how sure we are of it).

| Label | Field | Statement | Type | Grade | Flags | Citations (access) | Perspective | Quiz |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GK-C01 | identity | Temüjin, titled Chinggis Khan, founded the Mongol Empire | event | B | — | S09 (opened); S11 (excerpt) | — | plain-fact |
| GK-C02 | active\_period | Active c. 1180s–1227 | event | B | — | S09 (opened) | — | — |
| GK-C03 | main\_battles | Led the steppe wars to 1206 and the campaigns against Xi Xia, the Jin and Khwarazm | event | B | — | S09 (opened) | — | plain-fact |
| GK-C04 | birth | Born 1162 | event | C | — | S11 (excerpt); S08 (excerpt) | — | debate |
| GK-C05 | birth | Born 1165 (alternative to C04) | event | C | — | S09 (opened) | — | debate |
| GK-C06 | title | Proclaimed Chinggis Khan in 1206 | event | B | — | S09 (opened); S01 (via-secondary) | — | plain-fact |
| GK-C07 | career | Defeated Toghril of the Kereit in 1203 | event | B | — | S09 (opened) | — | plain-fact |
| GK-C08 | organisation | Reorganised his people into decimal units of 10, 100 and 1,000 | event | B | — | S09 (opened) | — | plain-fact |
| GK-C09 | career | Xi Xia subdued by 1209 | event | B | — | S09 (opened) | — | plain-fact |
| GK-C10 | career | Invaded the Jin in 1211; most of the Jin empire taken by 1216 | event | B | — | S09 (opened) | — | plain-fact |
| GK-C11 | career | Zhongdu fell in 1215 | event | C | — | none yet | — | — |
| GK-C12 | career | The Otrar caravan massacre led to war with Khwarazm | event | B | — | S09 (opened); S02 (via-secondary) | — | plain-fact |
| GK-C13 | career | Defeated Jalal al-Din near the Indus in 1221 | event | B | — | S09 (opened) | — | plain-fact |
| GK-C14 | strategy | Annexed only the lands north of the Amu Darya | event | B | — | S09 (opened) | — | plain-fact |
| GK-C15 | death | Died in 1227 during the siege of Zhongxing | event | B | — | S09 (opened); S01 (via-secondary) | — | plain-fact |
| GK-C16 | death | The *Secret History* says he died after a fall from his horse | text | B | — | S09 (opened, quoting S01) | — | tradition |
| GK-C17 | burial | His burial place is unknown | event | B | — | S09 (opened, implicit); to strengthen | — | plain-fact |
| GK-C18 | legacy | Ordered a Mongolian script adapted from the Uighur alphabet after 1204 | event | B | — | S09 (opened) | — | plain-fact |
| GK-C19 | controversies | Source death tolls are exaggerated, but the conquests caused mass killing | interpretation | B | `inflated-numbers` | S09 (opened) | Khwarazm; Xi Xia; Jin | debate |
| GK-C20 | controversies | The *Secret History* records a deathbed order to destroy the Tangut | text | B | `patron-bias` | S09 (opened, quoting S01) | Xi Xia | — |
| GK-C21 | legacy | Denigrated under Mongolian communism; now honoured as national founder | event | B | — | S09 (opened) | Mongolia | plain-fact |
| GK-C22 | legacy | Descent from him became the main claim to rule across Central Eurasia | interpretation | B | — | S09 (opened) | — | plain-fact |
| GK-C23 | identity | "Chinggis" means firm, fierce or resolute | text | B | — | S09 (opened, citing de Rachewiltz 1989) | — | myth-busting |
| GK-C24 | legacy | A Y-chromosome lineage in about 0.5% of the world's men was proposed to have spread with his male-line kin | text | B | `popular-culture` | S10 (excerpt); S12 (excerpt) | — | myth-busting |
| GK-C25 | strategy | Juvaini reports his "punishment of God" speech at Bukhara | text | B | `patron-bias` | S09 (opened, quoting S02) | Khwarazm | — |

## Sources

| Label | Source | Type | Derives from | Opened? |
| --- | --- | --- | --- | --- |
| GK-S01 | *The Secret History of the Mongols* (13th c.) | primary-contemporary | — | Via May |
| GK-S02 | Juvaini, *History of the World Conqueror*, trans. J. A. Boyle (1997 repr.) | primary-later | — | Via May |
| GK-S03 | Rashid al-Din, *Compendium of Chronicles* | primary-later | Partly Mongol records shared with S01 | No |
| GK-S04 | *Yuan shi* and other Chinese records | primary-later | Yuan court records | No |
| GK-S05 | Juzjani, *Tabaqat-i Nasiri* | primary-contemporary | — | Via May |
| GK-S06 | Ibn al-Athir, *The Complete History* | primary-contemporary | — | No |
| GK-S07 | Carpini, Rubruck, Marco Polo | primary-later | — | Via May (Polo) |
| GK-S08 | Igor de Rachewiltz (trans.), [*The Secret History of the Mongols*](https://cedar.wwu.edu/cedarbooks/4), shorter version ed. J. C. Street (2015, open access) | translation | S01 | Catalogue page only |
| GK-S09 | Timothy May, ["The Mongol Empire in World History"](https://journals.gmu.edu/whc/article/download/4894/2835?inline=1), *World History Connected* 5.2 (2008) | journal-article | — | Yes, 13 Nov 2026 |
| GK-S10 | T. Zerjal et al., ["The Genetic Legacy of the Mongols"](https://pmc.ncbi.nlm.nih.gov/articles/PMC1180246/), *American Journal of Human Genetics* 72 (2003), doi:10.1086/367774 | journal-article | — | Excerpt |
| GK-S11 | Columbia University, [Asia for Educators: The Mongols in World History](https://afe.easia.columbia.edu/mongols/pop/figures/images_fig.htm) | reference | — | Excerpt |
| GK-S12 | Hillary Mayell, ["Genghis Khan a Prolific Lover, DNA Data Implies"](https://www.nationalgeographic.com/culture/article/mongolia-genghis-khan-dna), National Geographic (2003) | other | S10 | Excerpt (popular report) |

**To strengthen:** open the de Rachewiltz translation PDF itself (free from the CEDAR page), Paul Ratchnevsky's *Genghis Khan: His Life and Legacy* (1991), and May's *The Mongol Art of War* (2007). Opening the translation alone would move about ten claims from B to A.

## Learning aids

### Key takeaways

1. Temüjin united the tribes of the Mongolian steppe by 1204 and was proclaimed Chinggis Khan in 1206.
2. He rebuilt Mongol society around a disciplined decimal army loyal to his family, not the old tribes.
3. From 1209 to 1227 his armies subdued Xi Xia, took most of northern China from the Jin, and destroyed the Khwarazmian Empire.
4. The conquests caused mass killing; the sources exaggerate the totals, but not the reality.
5. His life is known mainly from the *Secret History* and from historians who served or suffered under his successors; almost every source has a stake.

### Compare with

- **Sundiata Keita:** another 13th-century founder who united rival groups into an empire, known through a heroic narrative from within his own people.
- **Alexander the Great:** a vast empire won in a single lifetime, but Genghis Khan's institutions outlasted him far longer.
- **Te Rauparaha:** a leader remembered as a hero by his own people and very differently by those he conquered.

## Notes for the rest of Batch 1

- **Shared records to create once:** the Mongol Empire (POL), the Khwarazmian Empire, the Jin dynasty, Xi Xia and the Mamluk Sultanate; the wars against the Jin and Khwarazm (WAR); and places such as Bukhara, Otrar and Zhongxing (PLC).
- **Next profiles:** Subutai (the western raid and Kalka, the 1241 invasion of Hungary), Baibars (Ain Jalut, 1260), Trần Hưng Đạo (the Mongol-Yuan invasions of Đại Việt) and Timur (who claimed the Mongol legacy without being a Chinggisid).
- **One quick win:** the de Rachewiltz translation of the *Secret History* is free to download from its CEDAR page. If you download it and either attach it to this chat or place it in `docs/sources/` for Claude Code, about ten claims here can move from B to A, and it will serve Subutai's profile too.

### Notes for the template

- **The conversion-ready format worked.** Temporary labels, explicit battle kinds, named sources with access levels, perspective tags and quiz kinds all give Claude Code something definite to convert.
- **No new fields needed.** This is the first profile that fitted the schema without proposing a change, a good sign that the foundation has settled.
