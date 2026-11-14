// Battle, war, source, polity, place, civilisation and work pages in the simplified Dossier pattern
// (docs/APP_BRIEF.md, "Battle, war, source, polity and place pages"): hero, chips (date with grade,
// kind, region), tabs where useful, and the record's own content. Also the Battles, Wars and Sources lists.
import { getJSON, record } from '../data.js';
import {
  el, gradeBadge, recordLink, datedValue, unknown, href, tierLabel, TIER_LABELS, GRADE_LABELS,
} from '../components.js';
import { claimCard } from '../claims.js';
import { markdownBlock } from '../markdown.js';
import { tabSet, heroBlock } from '../dossier.js';

const KIND_LABEL = (k) => (k ? k.replace(/-/g, ' ') : null);
// Links read from the battle or war: say what the person did there.
const RELATION_LABELS = {
  commanded_by: 'Commanded', participant: 'Took part', planned_by: 'Planned', died_there: 'Died here',
  wounded_there: 'Wounded here', affected: 'Affected by it',
};
const SOURCE_TYPE_LABELS = {
  'primary-contemporary': 'Primary source (contemporary)', 'primary-later': 'Primary source (later)',
  archaeological: 'Archaeological', 'oral-tradition': 'Oral tradition', 'academic-book': 'Academic book',
  'journal-article': 'Journal article', museum: 'Museum', reference: 'Reference work', statute: 'Statute',
  translation: 'Translation', 'ai-generated': 'AI-generated web page', other: 'Other',
};

// ------------------------------------------------------------------ shared pieces
function chipList(...items) {
  return el('ul', { class: 'chips', 'aria-label': 'Summary' }, items.flat().filter(Boolean).map((i) => el('li', { class: i.cls || '' }, i.node)));
}
const chip = (node, cls = 'chip') => ({ node, cls });
const regionChips = (regions) => (regions || []).map((r) => chip(r, `chip region-chip region-${r.toLowerCase()}`));
const researchChip = (r) => (r.status !== 'reviewed' ? chip('Research in progress — not yet reviewed', 'chip research-chip') : null);
const gradeChip = (g, what) => (g ? { node: gradeBadge(g, { label: true, title: `${what} ${g}: ${GRADE_LABELS[g]}` }), cls: '' } : null);

function altNames(r) {
  const others = (r.names || []).filter((n) => n.kind !== 'primary');
  return others.length ? el('p', { class: 'alt-names' }, others.map((n) => n.name).join(' · ')) : null;
}

function guidance(r) {
  return r.cultural_guidance ? el('section', { class: 'panel guidance', 'aria-label': 'Cultural guidance' },
    el('h2', { class: 'label' }, 'Cultural guidance'), el('p', {}, r.cultural_guidance)) : null;
}

function facts(...cells) {
  return el('dl', { class: 'record-facts' }, cells.filter(Boolean).map(([label, value]) =>
    el('div', { class: 'fact' }, el('dt', { class: 'label' }, label), el('dd', { class: 'fact-value' }, value))));
}

function section(title, ...content) {
  return el('section', { class: 'dossier-section' }, el('h2', {}, title), ...content);
}

function claimsBlock(claims, emptyText = 'None recorded yet.') {
  return claims.length ? el('div', { class: 'claims' }, claims.map((c) => claimCard(c, { subject: true }))) : unknown(emptyText);
}

function refList(items, emptyText = 'None recorded yet.') {
  return items.length ? el('ul', { class: 'ref-list' }, items.map((r) => el('li', {}, recordLink(r)))) : unknown(emptyText);
}

function peopleList(conns) {
  if (!conns.length) return unknown('No people linked yet.');
  return el('ul', { class: 'connections' }, conns.map((c) => el('li', {},
    recordLink(c.other), ' ', el('span', { class: 'conn-relation' }, `· ${RELATION_LABELS[c.relation] || c.relation.replace(/_/g, ' ')}`),
    ' ', gradeBadge(c.certainty), c.role ? el('div', { class: 'cell-note' }, c.role) : null)));
}

function connectionsList(conns) {
  if (!conns.length) return unknown('None recorded yet.');
  return el('ul', { class: 'connections' }, conns.map((c) => el('li', {},
    el('span', { class: 'conn-relation' }, c.relation.replace(/_/g, ' ')), ' ', recordLink(c.other), ' ', gradeBadge(c.certainty),
    c.role ? el('div', { class: 'cell-note' }, c.role) : null)));
}

function table(headers, rows, caption) {
  return el('div', { class: 'table-scroll' }, el('table', { class: 'data-table' },
    caption ? el('caption', { class: 'visually-hidden' }, caption) : null,
    el('thead', {}, el('tr', {}, headers.map((h) => el('th', { scope: 'col' }, h)))),
    el('tbody', {}, rows)));
}

// The page: hero, alternative names, chips, cultural guidance, then tabs (or one body when there is
// only one tab's worth of content).
function page(view, r, crumbs, chips, tabs, initial) {
  document.title = `${r.primary_name} · Warriors & Leaders`;
  const list = tabs.filter(([, , render]) => render);
  const body = list.length > 1
    ? tabSet('record', list.map(([k, l]) => [k, l]), Object.fromEntries(list.map(([k, , f]) => [k, f])), initial || list[0][0],
      { label: 'Sections', counts: Object.fromEntries(list.filter((t) => t[3] != null).map((t) => [t[0], t[3]])) }).node
    : list[0][2]();
  view.innerHTML = '';
  view.append(el('article', { class: 'record-page', 'aria-labelledby': 'record-name' },
    heroBlock(r.primary_name, crumbs, { small: true }), altNames(r), chips, guidance(r), body));
}

const initialTab = () => new URLSearchParams(location.hash.split('?')[1] || '').get('tab');

// Quantity ranges with their basis; unknown values say "unknown" in words.
function number(n) {
  return Number(n).toLocaleString('en-NZ');
}

function quantity(q, openClaim) {
  if (!q || q === 'unknown') return [unknown('unknown')];
  const list = Array.isArray(q) ? q : [q];
  const lines = list.map((r) => {
    if (r === 'unknown') return unknown('unknown');
    let value;
    if (r.ancient_claim != null) value = number(r.ancient_claim);
    else if (r.best != null) value = number(r.best);
    else if (r.low != null && r.high != null) value = `${number(r.low)}–${number(r.high)}`;
    else if (r.low != null) value = `at least ${number(r.low)}`;
    else if (r.high != null) value = `up to ${number(r.high)}`;
    else return el('div', {}, `${r.unit}: `, unknown('unknown'));
    const basis = r.basis ? `${r.basis[0].toUpperCase()}${r.basis.slice(1)}` : 'Basis not recorded';
    return el('div', {}, `${basis}: ${value} ${r.unit}`,
      r.claim_ids?.length ? [' ', el('a', { href: `#claim-${r.claim_ids[0]}`, class: 'cite-meta',
        onclick: (e) => { e.preventDefault(); openClaim(r.claim_ids[0]); } }, '(see claim)')] : null);
  });
  if (!list.some((r) => r && r.basis === 'modern estimate')) {
    lines.push(el('div', { class: 'cell-note' }, 'Modern estimate: ', unknown('not recorded')));
  }
  return lines;
}

// ------------------------------------------------------------------ battle
export async function renderBattle(view, id) {
  const b = await record(id);
  let tabs;
  const openClaim = (cid) => tabs.open('claims', { then: () => document.getElementById(`claim-${cid}`)?.scrollIntoView({ block: 'center' }) });
  const perspectiveClaims = (polityIds) => b.related_claims.filter((c) => c.perspective.some((p) => polityIds.includes(p.id)));
  const sideRows = () => (b.sides || []).map((s) => {
    const pc = perspectiveClaims(s.polity_ids || []);
    return el('tr', {},
      el('th', { scope: 'row' }, s.label, s.polities.length ? el('div', { class: 'cell-note' },
        s.polities.map((p, i) => [i ? ', ' : '', recordLink(p)])) : null,
      pc.length ? el('div', { class: 'cell-note' }, el('a', { href: `#claim-${pc[0].id}`, onclick: (e) => { e.preventDefault(); openClaim(pc[0].id); } },
        `${pc.length} claim${pc.length > 1 ? 's' : ''} from this side's perspective`)) : null),
      el('td', {}, s.commanders.length ? s.commanders.map((c, i) => [i ? ', ' : '', recordLink(c)]) : unknown('not recorded')),
      el('td', {}, quantity(s.strength, openClaim)),
      el('td', {}, quantity(s.casualties, openClaim)),
      el('td', {}, s.result || unknown('not recorded')));
  });
  const chips = chipList(gradeChip(b.certainty, 'Record graded'),
    chip([el('span', { class: 'chip-label' }, 'Date '), datedValue(b.date)]),
    KIND_LABEL(b.kind) ? chip(KIND_LABEL(b.kind)) : null, regionChips(b.regions), researchChip(b));
  const tabList = [
    ['overview', 'Overview', () => el('div', {},
      b.summary ? el('p', { class: 'lead' }, b.summary) : null,
      facts(['Date', datedValue(b.date)],
        ['Place', [recordLink(b.place), b.site_certainty ? [' · site ', gradeBadge(b.site_certainty, { title: `Site graded ${b.site_certainty}` })] : null]],
        ['Kind', KIND_LABEL(b.kind) || unknown('not recorded')],
        ['Part of', b.war ? recordLink(b.war) : unknown('no war recorded')]),
      section('Outcome', el('p', {}, b.outcome || unknown('not recorded')),
        b.tactical_summary ? markdownBlock(b.tactical_summary) : null))],
    ['sides', 'Sides', () => (b.sides?.length
      ? table(['Side', 'Commanders', 'Strength', 'Casualties', 'Result'], sideRows(), 'Sides')
      : unknown('Sides not recorded yet.')), (b.sides || []).length],
    ['people', 'People', () => peopleList(b.people), b.people.length],
    ['claims', 'Claims', () => claimsBlock(b.related_claims), b.related_claims.length],
  ];
  document.title = `${b.primary_name} · Warriors & Leaders`;
  const crumbs = [el('a', { href: '#/battles' }, 'Battles'), b.war ? recordLink(b.war) : null].filter(Boolean);
  // keep a handle on the tabs so "(see claim)" links can open the Claims tab
  view.innerHTML = '';
  tabs = tabSet('record', tabList.map(([k, l]) => [k, l]), Object.fromEntries(tabList.map(([k, , f]) => [k, f])),
    initialTab() || 'overview', { label: 'Sections', counts: Object.fromEntries(tabList.filter((t) => t[3] != null).map((t) => [t[0], t[3]])) });
  view.append(el('article', { class: 'record-page', 'aria-labelledby': 'record-name' },
    heroBlock(b.primary_name, crumbs, { small: true }), altNames(b), chips, guidance(b), tabs.node));
}

// ------------------------------------------------------------------ war
export async function renderWar(view, id) {
  const w = await record(id);
  const rows = () => w.battles.map((b) => el('tr', {},
    el('th', { scope: 'row' }, el('a', { href: href(b.id) }, b.name), el('div', { class: 'cell-note' }, KIND_LABEL(b.kind))),
    el('td', {}, datedValue(b.date)), el('td', {}, b.result || unknown('not recorded')), el('td', {}, gradeBadge(b.certainty))));
  const chips = chipList(gradeChip(w.certainty, 'Record graded'),
    chip([el('span', { class: 'chip-label' }, 'Span '), datedValue(w.span)]),
    KIND_LABEL(w.kind) ? chip(KIND_LABEL(w.kind)) : null, regionChips(w.regions), researchChip(w));
  page(view, w, [el('a', { href: '#/wars' }, 'Wars'), w.parent_war ? recordLink(w.parent_war) : null].filter(Boolean), chips, [
    ['overview', 'Overview', () => el('div', {},
      w.summary ? el('p', { class: 'lead' }, w.summary) : null,
      facts(['Span', datedValue(w.span)], ['Kind', KIND_LABEL(w.kind) || unknown('not recorded')],
        ['Part of', w.parent_war ? recordLink(w.parent_war) : unknown('no wider war recorded')],
        ['Outcome', w.outcome || unknown('not recorded')]),
      section('Belligerents', refList(w.belligerents, 'Not recorded yet (taken from the sides of its battles).')),
      w.sub_wars.length ? section('Campaigns within this war', refList(w.sub_wars)) : null)],
    ['battles', 'Battles', () => (w.battles.length ? table(['Battle', 'Date', 'Result', 'Grade'], rows(), 'Battles')
      : unknown('No battles recorded yet.')), w.battles.length],
    ['people', 'People', () => peopleList(w.people), w.people.length],
    ['claims', 'Claims', () => claimsBlock(w.related_claims), w.related_claims.length],
  ], initialTab());
}

// ------------------------------------------------------------------ source
export async function renderSource(view, id) {
  const s = await record(id);
  const ai = s.source_type === 'ai-generated';
  const groups = () => (s.cited_by.length ? s.cited_by.map((g) => el('section', { class: 'cited-group', 'aria-label': `Claims about ${g.subject.name}` },
    el('h3', {}, recordLink(g.subject)),
    el('div', { class: 'claims' }, g.claims.map((x) => claimCard(x.claim)))))
    : [unknown('No claims cite it yet.')]);
  const cited = s.cited_by.reduce((n, g) => n + g.claims.length, 0);
  const chips = chipList(
    chip(tierLabel(s.reliability_tier), `chip tier-badge tier-${s.reliability_tier || 'primary'}`),
    chip(SOURCE_TYPE_LABELS[s.source_type] || s.source_type),
    gradeChip(s.certainty, 'Authorship and date graded'),
    chip(s.opened ? 'Opened for this database' : 'Not yet opened'), researchChip(s));
  page(view, s, [el('a', { href: '#/sources' }, 'Sources')], chips, [
    ['overview', 'Overview', () => el('div', {},
      ai ? el('p', { class: 'research-banner ai-banner', role: 'note' },
        'AI-generated web page. It is recorded only as the origin of a myth, never as evidence.') : null,
      s.summary ? el('p', { class: 'lead' }, s.summary) : null,
      facts(['Authors', s.authors?.length ? s.authors.join(', ') : unknown('not recorded')],
        ['Written', s.date_written || (s.year != null ? String(s.year) : null) || unknown('not recorded')],
        ['Opened', s.opened ? 'Yes, opened for this database' : 'No, not yet opened'],
        ['Authorship and date', gradeBadge(s.certainty, { label: true })],
        s.title && s.title !== s.primary_name ? ['Title', s.title] : null,
        s.edition ? ['Edition', s.edition] : null, s.publisher ? ['Publisher', s.publisher] : null,
        s.isbn_doi ? ['ISBN or DOI', s.isbn_doi] : null,
        s.url ? ['Link', el('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, 'Open the source ↗')] : null,
        s.accessed ? ['Accessed', s.accessed] : null),
      section('Bias and reliability',
        el('p', {}, el('strong', {}, 'Bias: '), s.bias_notes || unknown('not recorded')),
        el('p', {}, el('strong', {}, 'Reliability: '), s.reliability_notes || unknown('not recorded'))),
      section('Derives from', s.derives_from.length
        ? el('p', {}, 'This source copies or depends on ', s.derives_from.map((d, i) => [i ? ', ' : '', recordLink(d)]),
          '. For grading, they count as one source.')
        : el('p', {}, 'Not recorded as depending on another source in this database.'),
      s.derived_by.length ? el('p', {}, 'Sources that depend on it: ', s.derived_by.map((d, i) => [i ? ', ' : '', recordLink(d)])) : null))],
    ['cited', ai ? 'Myths traced to it' : 'Cited by', () => el('div', {}, ...groups()), cited],
  ], initialTab());
}

// ------------------------------------------------------------------ polity, place, civilisation, work
export async function renderLinked(view, id) {
  const r = await record(id);
  const typeLabel = { polity: 'Polity', place: 'Place', civilisation: 'Civilisation', work: 'Work' }[r.type];
  const cells = [];
  const chips = [gradeChip(r.certainty, 'Record graded')];
  if (r.type === 'polity') {
    if (r.span) chips.push(chip([el('span', { class: 'chip-label' }, 'Span '), datedValue(r.span)]));
    if (r.polity_type) chips.push(chip(r.polity_type));
    chips.push(...regionChips(r.regions));
    cells.push(['Span', datedValue(r.span)], ['Type', r.polity_type || unknown('not recorded')],
      ['Regions', r.regions?.length ? r.regions.join(', ') : unknown('not yet recorded')]);
  } else if (r.type === 'place') {
    if (r.place_type) chips.push(chip(r.place_type));
    if (r.location_certainty) chips.push(chip([el('span', { class: 'chip-label' }, 'Location '), gradeBadge(r.location_certainty)]));
    const coords = r.latitude != null && r.longitude != null ? `${r.latitude}, ${r.longitude}` : null;
    cells.push(['Coordinates', coords || unknown('not yet recorded')],
      ['Location', r.location_certainty ? gradeBadge(r.location_certainty, { label: true }) : unknown('not graded')],
      ['Type', r.place_type || unknown('not recorded')],
      ['Modern country', r.modern_country || unknown('not yet recorded')]);
  } else if (r.type === 'civilisation') {
    if (r.region) chips.push(chip(r.region));
    cells.push(['Region', r.region || unknown('not recorded')], ['Span', datedValue(r.span)]);
  } else if (r.type === 'work') {
    if (r.composed) chips.push(chip([el('span', { class: 'chip-label' }, 'Composed '), datedValue(r.composed)]));
    cells.push(['Composed', datedValue(r.composed)],
      ['Authorship', r.authorship_certainty ? gradeBadge(r.authorship_certainty, { label: true }) : unknown('not graded')],
      ['Earliest copy', r.earliest_witness || unknown('not recorded')]);
  }
  chips.push(researchChip(r));
  const linkedCount = r.people.length + r.battles.length + r.wars.length + r.connections.length;
  const claims = [...(r.perspective_claims || []), ...(r.claims || [])];
  page(view, r, [el('span', {}, typeLabel)], chipList(chips), [
    ['overview', 'Overview', () => el('div', {},
      r.summary ? el('p', { class: 'lead' }, r.summary) : null,
      facts(...cells),
      r.type === 'work' && r.structure ? section('Structure', markdownBlock(r.structure)) : null,
      r.type === 'work' && r.versions_and_translations?.length
        ? section('Versions and translations', el('ul', {}, r.versions_and_translations.map((v) => el('li', {}, v)))) : null)],
    ['linked', 'Linked records', () => el('div', {},
      section('People', refList(r.people)), section('Battles', refList(r.battles)), section('Wars', refList(r.wars)),
      section('Connections', connectionsList(r.connections))), linkedCount],
    ['claims', 'Claims', claims.length ? () => el('div', {},
      r.perspective_claims?.length ? section('Claims from this perspective', claimsBlock(r.perspective_claims)) : null,
      r.claims?.length ? section('Claims about it', claimsBlock(r.claims)) : null) : null, claims.length],
  ], initialTab());
}

// ------------------------------------------------------------------ lists
export async function renderList(view, kind) {
  const lists = await getJSON('lists.json');
  const rows = lists[kind];
  const titles = { battles: 'Battles', wars: 'Wars', sources: 'Sources' };
  let headers;
  let body;
  if (kind === 'battles') {
    headers = ['Battle', 'Date', 'Kind', 'Part of', 'Result', 'Grade'];
    body = rows.map((b) => el('tr', {}, el('th', { scope: 'row' }, el('a', { href: href(b.id) }, b.name)),
      el('td', {}, datedValue(b.date)), el('td', {}, KIND_LABEL(b.kind) || unknown('not recorded')),
      el('td', {}, b.war ? recordLink(b.war) : unknown('—')), el('td', {}, b.result || unknown('not recorded')),
      el('td', {}, gradeBadge(b.certainty))));
  } else if (kind === 'wars') {
    headers = ['War or campaign', 'Span', 'Kind', 'Part of', 'Outcome', 'Grade'];
    body = rows.map((w) => el('tr', {}, el('th', { scope: 'row' }, el('a', { href: href(w.id) }, w.name)),
      el('td', {}, datedValue(w.span)), el('td', {}, KIND_LABEL(w.kind) || unknown('not recorded')),
      el('td', {}, w.parent_war ? recordLink(w.parent_war) : unknown('—')), el('td', {}, w.result || unknown('not recorded')),
      el('td', {}, gradeBadge(w.certainty))));
  } else {
    headers = ['Source', 'Type', 'Reliability tier', 'Opened', 'Cited by'];
    body = rows.slice().sort((a, b) => a.name.localeCompare(b.name)).map((s) => el('tr', {},
      el('th', { scope: 'row' }, el('a', { href: href(s.id) }, s.name)),
      el('td', {}, SOURCE_TYPE_LABELS[s.source_type] || s.source_type),
      el('td', {}, el('span', { class: `tier-badge tier-${s.tier || 'primary'}` }, s.tier ? TIER_LABELS[s.tier] : 'Primary material')),
      el('td', {}, s.opened ? 'Yes' : 'No'),
      el('td', {}, s.source_type === 'ai-generated' ? 'myths only' : `${s.cited} claim${s.cited === 1 ? '' : 's'}`)));
  }
  document.title = `${titles[kind]} · Warriors & Leaders`;
  view.innerHTML = '';
  view.append(el('div', { class: 'record-page' },
    el('h1', { class: 'page-title' }, titles[kind]),
    el('p', { class: 'notice' }, `${rows.length} ${titles[kind].toLowerCase()} in the database.`,
      kind === 'battles' ? [' ', el('a', { href: '#/wars' }, 'See the wars and campaigns.')] : null,
      kind === 'wars' ? [' ', el('a', { href: '#/battles' }, 'See the battles.')] : null),
    table(headers, body, titles[kind])));
}
