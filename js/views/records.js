// Battle, war, source, polity, place, civilisation and work pages, and the Battles, Wars and
// Sources lists (docs/APP_BRIEF.md, "Battle and war pages", "Source page", "Polity, place and
// civilisation pages").
import { getJSON, record } from '../data.js';
import {
  el, gradeBadge, statusChip, recordLink, datedValue, unknown, href, panel, tierLabel, TIER_LABELS,
} from '../components.js';
import { claimCard } from '../claims.js';
import { markdownBlock } from '../markdown.js';

const KIND_LABEL = (k) => (k ? k.replace(/-/g, ' ') : null);
const RELATION_LABELS = {
  commanded: 'Commanded', participated: 'Took part', planned: 'Planned', died_at: 'Died here', wounded_at: 'Wounded here',
  affected_by: 'Affected by it',
  // reverse links, read from the battle or war: say what the person did
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
function header(r, crumbs, ...meta) {
  return el('header', { class: 'title-band' },
    el('nav', { class: 'breadcrumb label', 'aria-label': 'Breadcrumb' }, el('ol', {}, crumbs.map((c) => el('li', {}, c)))),
    el('h1', { class: 'person-name record-name' }, r.primary_name),
    otherNames(r),
    el('p', { class: 'title-meta' }, statusChip(r.status), ...meta),
    r.status !== 'reviewed' ? el('p', { class: 'research-banner', role: 'note' }, 'Research in progress — not yet reviewed.') : null);
}

function otherNames(r) {
  const others = (r.names || []).filter((n) => n.kind !== 'primary');
  return others.length ? el('p', { class: 'aka' }, 'Also known as ', others.map((n) => n.name).join(', ')) : null;
}

function facts(...cells) {
  return el('dl', { class: 'record-facts' }, cells.filter(Boolean).map(([label, value]) =>
    el('div', { class: 'fact' }, el('dt', { class: 'label' }, label), el('dd', { class: 'fact-value' }, value))));
}

function block(title, id, ...content) {
  return el('section', { class: 'record-section', 'aria-labelledby': id }, el('h2', { id }, title), ...content);
}

function claimsBlock(title, claims, emptyText = 'None recorded yet.') {
  const id = `h-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return block(title, id, claims.length
    ? el('div', { class: 'claims' }, claims.map((c) => claimCard(c, { subject: true }))) : unknown(emptyText));
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

// Quantity ranges: shown with their basis; unknown values say "unknown" in words.
function number(n) {
  return Number(n).toLocaleString('en-NZ');
}

function quantity(q) {
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
        onclick: (e) => { e.preventDefault(); document.getElementById(`claim-${r.claim_ids[0]}`)?.scrollIntoView(); } }, '(see claim)')] : null);
  });
  if (!list.some((r) => r && r.basis === 'modern estimate')) {
    lines.push(el('div', { class: 'cell-note' }, 'Modern estimate: ', unknown('not recorded')));
  }
  return lines;
}

function page(view, title, ...children) {
  document.title = `${title} · Warriors & Leaders`;
  view.innerHTML = '';
  view.append(el('div', { class: 'record-page' }, ...children));
}

// ------------------------------------------------------------------ battle
export async function renderBattle(view, id) {
  const b = await record(id);
  const perspectiveCount = (polityIds) => b.related_claims.filter((c) => c.perspective.some((p) => polityIds.includes(p.id)));
  const sideRows = (b.sides || []).map((s) => {
    const pc = perspectiveCount(s.polity_ids || []);
    return el('tr', {},
      el('th', { scope: 'row' }, s.label, s.polities.length ? el('div', { class: 'cell-note' },
        s.polities.map((p, i) => [i ? ', ' : '', recordLink(p)])) : null,
      pc.length ? el('div', { class: 'cell-note' }, el('a', { href: `#claim-${pc[0].id}`, onclick: (e) => {
        e.preventDefault(); document.getElementById(`claim-${pc[0].id}`)?.scrollIntoView();
      } }, `${pc.length} claim${pc.length > 1 ? 's' : ''} from this side's perspective`)) : null),
      el('td', {}, s.commanders.length ? s.commanders.map((c, i) => [i ? ', ' : '', recordLink(c)]) : unknown('not recorded')),
      el('td', {}, quantity(s.strength)),
      el('td', {}, quantity(s.casualties)),
      el('td', {}, s.result || unknown('not recorded')));
  });
  page(view, b.primary_name,
    header(b, [el('a', { href: '#/battles' }, 'Battles'), b.war ? recordLink(b.war) : null].filter(Boolean),
      KIND_LABEL(b.kind) ? el('span', { class: 'meta-chip' }, KIND_LABEL(b.kind)) : null,
      el('span', { class: 'meta-chip' }, 'Overall ', gradeBadge(b.certainty))),
    facts(['Date', datedValue(b.date)],
      ['Place', [recordLink(b.place), b.site_certainty ? [' · site ', gradeBadge(b.site_certainty)] : null]],
      ['Kind', KIND_LABEL(b.kind) || unknown('not recorded')],
      ['Part of', b.war ? recordLink(b.war) : unknown('no war recorded')]),
    b.summary ? el('p', { class: 'lead' }, b.summary) : null,
    block('Sides', 'h-sides', b.sides?.length
      ? table(['Side', 'Commanders', 'Strength', 'Casualties', 'Result'], sideRows, 'Sides')
      : unknown('Sides not recorded yet.')),
    block('Outcome', 'h-outcome', el('p', {}, b.outcome || unknown('not recorded')),
      b.tactical_summary ? markdownBlock(b.tactical_summary) : null),
    block('People involved', 'h-people', peopleList(b.people)),
    claimsBlock('Related claims', b.related_claims));
}

// ------------------------------------------------------------------ war
export async function renderWar(view, id) {
  const w = await record(id);
  const rows = w.battles.map((b) => el('tr', {},
    el('th', { scope: 'row' }, el('a', { href: href(b.id) }, b.name), el('div', { class: 'cell-note' }, KIND_LABEL(b.kind))),
    el('td', {}, datedValue(b.date)), el('td', {}, b.result || unknown('not recorded')), el('td', {}, gradeBadge(b.certainty))));
  page(view, w.primary_name,
    header(w, [el('a', { href: '#/wars' }, 'Wars'), w.parent_war ? recordLink(w.parent_war) : null].filter(Boolean),
      KIND_LABEL(w.kind) ? el('span', { class: 'meta-chip' }, KIND_LABEL(w.kind)) : null,
      el('span', { class: 'meta-chip' }, 'Overall ', gradeBadge(w.certainty))),
    facts(['Span', datedValue(w.span)], ['Kind', KIND_LABEL(w.kind) || unknown('not recorded')],
      ['Part of', w.parent_war ? recordLink(w.parent_war) : unknown('no wider war recorded')],
      ['Outcome', w.outcome || unknown('not recorded')]),
    w.summary ? el('p', { class: 'lead' }, w.summary) : null,
    block('Belligerents', 'h-bell', refList(w.belligerents, 'Not recorded yet (taken from the sides of its battles).')),
    w.sub_wars.length ? block('Campaigns within this war', 'h-sub', refList(w.sub_wars)) : null,
    block('Battles', 'h-battles', w.battles.length ? table(['Battle', 'Date', 'Result', 'Grade'], rows, 'Battles')
      : unknown('No battles recorded yet.')),
    block('People involved', 'h-people', peopleList(w.people)),
    claimsBlock('Related claims', w.related_claims));
}

// ------------------------------------------------------------------ source
export async function renderSource(view, id) {
  const s = await record(id);
  const ai = s.source_type === 'ai-generated';
  const groups = s.cited_by.map((g) => el('section', { class: 'cited-group', 'aria-label': `Claims about ${g.subject.name}` },
    el('h3', {}, recordLink(g.subject)),
    el('div', { class: 'claims' }, g.claims.map((x) => claimCard(x.claim)))));
  page(view, s.primary_name,
    header(s, [el('a', { href: '#/sources' }, 'Sources')],
      el('span', { class: `tier-badge tier-${s.reliability_tier || 'primary'}` }, tierLabel(s.reliability_tier)),
      el('span', { class: 'meta-chip' }, SOURCE_TYPE_LABELS[s.source_type] || s.source_type)),
    ai ? el('p', { class: 'research-banner ai-banner', role: 'note' },
      'AI-generated web page. It is recorded only as the origin of a myth, never as evidence.') : null,
    facts(['Authors', s.authors?.length ? s.authors.join(', ') : unknown('not recorded')],
      ['Written', s.date_written || (s.year != null ? String(s.year) : null) || unknown('not recorded')],
      ['Opened', s.opened ? 'Yes, opened for this database' : 'No, not yet opened'],
      ['Authorship and date', gradeBadge(s.certainty, { label: true })],
      s.title && s.title !== s.primary_name ? ['Title', s.title] : null,
      s.edition ? ['Edition', s.edition] : null, s.publisher ? ['Publisher', s.publisher] : null,
      s.isbn_doi ? ['ISBN or DOI', s.isbn_doi] : null,
      s.url ? ['Link', el('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, 'Open the source', ' ↗')] : null,
      s.accessed ? ['Accessed', s.accessed] : null),
    s.summary ? el('p', { class: 'lead' }, s.summary) : null,
    s.cultural_guidance ? panel('Cultural guidance', el('p', {}, s.cultural_guidance)) : null,
    block('Bias and reliability', 'h-bias',
      el('p', {}, el('strong', {}, 'Bias: '), s.bias_notes || unknown('not recorded')),
      el('p', {}, el('strong', {}, 'Reliability: '), s.reliability_notes || unknown('not recorded'))),
    block('Derives from', 'h-derives', s.derives_from.length
      ? el('p', {}, 'This source copies or depends on ', s.derives_from.map((d, i) => [i ? ', ' : '', recordLink(d)]),
        '. For grading, they count as one source.')
      : el('p', {}, 'Not recorded as depending on another source in this database.'),
    s.derived_by.length ? el('p', {}, 'Sources that depend on it: ', s.derived_by.map((d, i) => [i ? ', ' : '', recordLink(d)])) : null),
    block(ai ? 'Myths that trace to this page' : 'Claims that cite this source', 'h-cited',
      groups.length ? groups : unknown('No claims cite it yet.')));
}

// ------------------------------------------------------------------ polity, place, civilisation, work
export async function renderLinked(view, id) {
  const r = await record(id);
  const typeLabel = { polity: 'Polity', place: 'Place', civilisation: 'Civilisation', work: 'Work' }[r.type];
  const meta = [];
  const cells = [];
  if (r.type === 'polity') {
    if (r.polity_type) meta.push(el('span', { class: 'meta-chip' }, r.polity_type));
    cells.push(['Span', datedValue(r.span)], ['Type', r.polity_type || unknown('not recorded')],
      ['Regions', r.regions?.length ? r.regions.join(', ') : unknown('not yet recorded')]);
  } else if (r.type === 'place') {
    const coords = r.latitude != null && r.longitude != null ? `${r.latitude}, ${r.longitude}` : null;
    cells.push(['Coordinates', coords || unknown('not yet recorded')],
      ['Location', r.location_certainty ? gradeBadge(r.location_certainty, { label: true }) : unknown('not graded')],
      ['Type', r.place_type || unknown('not recorded')],
      ['Modern country', r.modern_country || unknown('not yet recorded')]);
  } else if (r.type === 'civilisation') {
    cells.push(['Region', r.region || unknown('not recorded')], ['Span', datedValue(r.span)]);
  } else if (r.type === 'work') {
    cells.push(['Composed', datedValue(r.composed)],
      ['Authorship', r.authorship_certainty ? gradeBadge(r.authorship_certainty, { label: true }) : unknown('not graded')],
      ['Earliest copy', r.earliest_witness || unknown('not recorded')]);
  }
  meta.push(el('span', { class: 'meta-chip' }, 'Record ', gradeBadge(r.certainty)));
  page(view, r.primary_name,
    header(r, [el('span', {}, typeLabel)], ...meta),
    facts(...cells),
    r.summary ? el('p', { class: 'lead' }, r.summary) : null,
    r.cultural_guidance ? panel('Cultural guidance', el('p', {}, r.cultural_guidance)) : null,
    r.type === 'work' && r.structure ? block('Structure', 'h-structure', markdownBlock(r.structure)) : null,
    r.type === 'work' && r.versions_and_translations?.length
      ? block('Versions and translations', 'h-versions', el('ul', {}, r.versions_and_translations.map((v) => el('li', {}, v)))) : null,
    block('People', 'h-people', refList(r.people)),
    block('Battles', 'h-battles', refList(r.battles)),
    block('Wars', 'h-wars', refList(r.wars)),
    block('Connections', 'h-conn', connectionsList(r.connections)),
    r.perspective_claims?.length ? claimsBlock('Claims from this perspective', r.perspective_claims) : null,
    r.claims?.length ? claimsBlock('Claims about it', r.claims) : null);
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
  page(view, titles[kind],
    el('h1', { class: 'page-title' }, titles[kind]),
    el('p', { class: 'notice' }, `${rows.length} ${titles[kind].toLowerCase()} in the database.`),
    table(headers, body, titles[kind]));
}
