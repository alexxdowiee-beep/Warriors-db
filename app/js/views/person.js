// Person profile: the Dossier (docs/APP_BRIEF.md, "Person profile: the Dossier").
//   Left panel: hero, alternative names, chips, tabs (Overview · Campaigns · Evidence · Myths · Sources).
//   Right panel: the life slider (dated milestones), connections, cultural guidance.
//   Bottom strip: tabs with counts and a sideways-scrolling row of cards.
// Everything shown comes from the data bundle; the app writes no historical text.
import { record } from '../data.js';
import {
  el, gradeBadge, flagChip, recordLink, datedValue, unknown, langOf, href, tierLabel,
  ACCESS_LABELS, CLAIM_TYPE_LABELS, GRADE_LABELS,
} from '../components.js';
import { markdownBlock } from '../markdown.js';
import { claimCard, citationList, withheld, VERDICT_LABELS } from '../claims.js';

const ERA_LABELS = { ancient: 'Ancient', classical: 'Classical', medieval: 'Medieval', 'early-modern': 'Early modern',
  modern: 'Modern' };
const RELATION_LABELS = {
  commanded: 'Commanded', participated: 'Took part', planned: 'Planned', died_at: 'Died at', wounded_at: 'Wounded at',
  affected_by: 'Affected by',
};
// Narrative sections: Campaigns holds the career; Overview the life and its afterlife; Evidence the research note.
const CAMPAIGN_SECTIONS = [['military_career', 'Military career'], ['leadership', 'Leadership'],
  ['strategy_and_tactics', 'Strategy and tactics'], ['leadership_and_strategy', 'Leadership and strategy'],
  ['technology', 'Weapons and technology'], ['victories_and_defeats', 'Victories and defeats']];
const OVERVIEW_SECTIONS = [['early_life', 'Early life'], ['historical_context', 'Historical context'],
  ['political_achievements', 'Political achievements'], ['controversies', 'Controversies'], ['legacy', 'Legacy']];
// For a war that affected the person without their taking part, its result is not theirs.
function resultText(e) {
  if (!e.result) return unknown('result not recorded');
  return e.relation === 'affected_by' ? `Outcome of the war: ${e.result}` : e.result;
}

const TABS = [['overview', 'Overview'], ['campaigns', 'Campaigns'], ['evidence', 'Evidence'], ['myths', 'Myths'],
  ['sources', 'Sources']];

export async function renderPerson(view, id) {
  const p = await record(id);
  document.title = `${p.primary_name} · Warriors & Leaders`;
  const claimIndex = new Map([...p.claims, ...p.myths].map((c) => [c.id, c]));
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const ctx = { p, claimIndex, params };

  const tabs = tabSet('profile', TABS, {
    overview: () => overviewTab(ctx), campaigns: () => campaignsTab(ctx), evidence: () => evidenceTab(ctx),
    myths: () => mythsTab(ctx), sources: () => sourcesTab(ctx),
  }, params.get('tab') || 'overview');
  ctx.openTab = tabs.open;

  view.innerHTML = '';
  view.append(el('article', { class: 'dossier', 'aria-labelledby': 'person-name' },
    el('div', { class: 'dossier-main' },
      hero(p), names(p), chips(p),
      p.cultural_guidance ? guidance(p, 'guidance-top') : null,
      tabs.node),
    el('aside', { class: 'dossier-life', 'aria-label': 'Life and connections' },
      lifeSlider(ctx), connectionsPanel(p), p.cultural_guidance ? guidance(p, 'guidance-side') : null),
    bottomStrip(ctx)));
}

// ------------------------------------------------------------------ hero, names, chips
function hero(p) {
  const primary = p.names.find((n) => n.kind === 'primary') || {};
  const crumbs = [el('a', { href: '#/people' }, 'People')];
  if (p.polities[0]) crumbs.push(recordLink(p.polities[0]));
  // The image area is a neutral gradient until image records exist (no placeholder text or images).
  return el('header', { class: 'hero' },
    el('div', { class: 'hero-image', 'aria-hidden': 'true' }),
    el('div', { class: 'hero-text' },
      el('nav', { class: 'breadcrumb label', 'aria-label': 'Breadcrumb' }, el('ol', {}, crumbs.map((c) => el('li', {}, c)))),
      el('h1', { class: 'person-name', id: 'person-name', lang: langOf(primary.language) }, p.primary_name)));
}

function names(p) {
  const others = p.names.filter((n) => n.kind !== 'primary');
  if (!others.length) return null;
  return el('p', { class: 'alt-names' }, others.map((n, i) => [i ? ' · ' : '',
    el('span', { lang: langOf(n.language) }, n.name)]));
}

function chips(p) {
  return el('ul', { class: 'chips', 'aria-label': 'Summary' },
    el('li', {}, gradeBadge(p.certainty, { label: true, title: `Overall grade ${p.certainty}: ${GRADE_LABELS[p.certainty]}` })),
    el('li', { class: 'chip' }, el('span', { class: 'chip-label' }, 'Active '), datedValue(p.active_period)),
    ...(p.regions || []).map((r) => el('li', { class: `chip region-chip region-${r.toLowerCase()}` }, r)),
    p.era ? el('li', { class: 'chip' }, ERA_LABELS[p.era] || p.era) : null,
    p.status !== 'reviewed'
      ? el('li', { class: 'chip research-chip', role: 'note' }, 'Research in progress — not yet reviewed') : null);
}

function guidance(p, cls) {
  return el('section', { class: `panel guidance ${cls}`, 'aria-label': 'Cultural guidance' },
    el('h2', { class: 'label' }, 'Cultural guidance'), el('p', {}, p.cultural_guidance));
}

// ------------------------------------------------------------------ tabs (shared by panel and strip)
// Accessible tabs: arrow keys move between tabs; the profile's tab is kept in the address (?tab=…).
function tabSet(name, list, renderers, initial, { counts = {}, urlKey = 'tab' } = {}) {
  const tablist = el('div', { class: `tablist tablist-${name}`, role: 'tablist',
    'aria-label': name === 'profile' ? 'Profile sections' : 'Lists' });
  const panel = el('div', { class: `tabpanel tabpanel-${name}`, role: 'tabpanel', tabindex: '0', id: `panel-${name}` });
  const buttons = new Map();
  for (const [key, label] of list) {
    const b = el('button', { type: 'button', role: 'tab', class: 'tab', id: `tab-${name}-${key}`,
      'aria-controls': `panel-${name}`, onclick: () => open(key) },
    label, counts[key] != null ? el('span', { class: 'tab-count' }, String(counts[key])) : null);
    buttons.set(key, b);
    tablist.append(b);
  }
  tablist.addEventListener('keydown', (e) => {
    const keys = [...buttons.keys()];
    const i = keys.findIndex((k) => buttons.get(k) === document.activeElement);
    if (i < 0) return;
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: keys.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    open(keys[(next + keys.length) % keys.length], { focus: true });
  });
  function open(key, { focus = false, then } = {}) {
    if (!renderers[key]) key = list[0][0];
    buttons.forEach((b, k) => {
      b.setAttribute('aria-selected', String(k === key));
      b.tabIndex = k === key ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', `tab-${name}-${key}`);
    panel.replaceChildren(...[renderers[key]()].filter(Boolean));
    if (focus) buttons.get(key).focus();
    if (urlKey) {
      const [base, query] = location.hash.split('?');
      const q = new URLSearchParams(query || '');
      if (key === list[0][0]) q.delete(urlKey); else q.set(urlKey, key);
      history.replaceState(null, '', q.toString() ? `${base}?${q}` : base);
    }
    if (then) requestAnimationFrame(() => then(panel));
  }
  open(initial);
  return { node: el('div', { class: `tabs tabs-${name}` }, tablist, panel), open };
}

function section(title, ...content) {
  return el('section', { class: 'dossier-section' }, el('h2', {}, title), ...content);
}

// ------------------------------------------------------------------ Overview
function overviewTab({ p, claimIndex }) {
  const identity = p.core.claim_ids.map((i) => claimIndex.get(i)).filter((c) => c && c.field === 'identity');
  const roleGrade = identity.length ? identity.map((c) => c.certainty).sort().slice(-1)[0] : null;
  const main = p.polities[0];
  const mainLinks = main ? p.connections.filter((c) => c.other.id === main.id && c.certainty) : [];
  const mainGrade = mainLinks.length ? mainLinks.map((c) => c.certainty).sort()[0] : null;
  const cell = (label, ...value) => el('div', { class: 'fact' }, el('div', { class: 'label' }, label),
    el('div', { class: 'fact-value' }, ...value));
  return el('div', {},
    el('p', { class: 'lead' }, p.summary || 'No summary yet.'),
    el('div', { class: 'key-facts', role: 'group', 'aria-label': 'Key facts' },
      cell('Born', datedValue(p.birth)),
      cell('Died', datedValue(p.death)),
      cell('Role', p.roles?.length ? p.roles.map((r) => r.replace(/-/g, ' ')).join(', ') : unknown('not yet recorded'),
        ' ', roleGrade ? gradeBadge(roleGrade, { title: `Identity claims graded ${roleGrade}` })
          : unknown('(no identity claim yet)')),
      cell('Main polity', main ? [recordLink(main), ' ', mainGrade
        ? gradeBadge(mainGrade, { title: `Link to ${main.name} graded ${mainGrade}` }) : unknown('(link not graded)')]
        : unknown('not yet recorded'))),
    ...OVERVIEW_SECTIONS.filter(([k]) => p.profile?.[k]).map(([k, label]) => section(label, markdownBlock(p.profile[k]))),
    p.profile?.key_takeaways?.length ? section('Key takeaways',
      el('ol', { class: 'takeaways' }, p.profile.key_takeaways.map((t) => el('li', {}, markdownBlock(t))))) : null);
}

// ------------------------------------------------------------------ Campaigns
function campaignsTab({ p }) {
  const rows = p.engagements.map((e) => el('tr', {},
    el('th', { scope: 'row' }, recordLink(e),
      el('div', { class: 'cell-note' }, e.type === 'war' ? 'War or campaign' : (e.kind || '').replace(/-/g, ' '))),
    el('td', {}, datedValue(e.date)),
    el('td', {}, RELATION_LABELS[e.relation] || e.relation, e.role ? el('div', { class: 'cell-note' }, e.role) : null),
    el('td', {}, resultText(e)),
    el('td', {}, gradeBadge(e.certainty, { title: `This part is graded ${e.certainty}` }))));
  return el('div', {},
    section('Battles and wars', p.engagements.length ? el('div', { class: 'table-scroll' }, el('table', { class: 'data-table' },
      el('thead', {}, el('tr', {}, ['Engagement', 'Date', 'Part', 'Result', 'Grade'].map((h) => el('th', { scope: 'col' }, h)))),
      el('tbody', {}, rows))) : unknown('None recorded yet.')),
    ...CAMPAIGN_SECTIONS.filter(([k]) => p.profile?.[k]).map(([k, label]) => section(label, markdownBlock(p.profile[k]))));
}

// ------------------------------------------------------------------ Evidence
function jumpTo(id) {
  return (e) => {
    e.preventDefault();
    const t = document.getElementById(id);
    if (t) {
      t.scrollIntoView({ block: 'center' });
      t.setAttribute('tabindex', '-1');
      t.focus({ preventScroll: true });
    }
  };
}

function evidenceTab({ p, claimIndex, params }) {
  const weakest = p.core.weakest_claim_ids.map((i) => claimIndex.get(i)).filter(Boolean);
  return el('div', {},
    section('What sets the overall grade',
      el('p', {}, gradeBadge(p.certainty, { label: true }), ' The overall grade is the weakest of the core claims (',
        p.core.claim_set || 'no core set', ': ', p.core.fields.map((f) => f.replace(/_/g, ' ')).join(', '), ').'),
      weakest.length ? el('ul', { class: 'core-list' }, weakest.map((c) => el('li', {}, gradeBadge(c.certainty), ' ',
        el('a', { href: `#claim-${c.id}`, onclick: jumpTo(`claim-${c.id}`) }, c.statement || 'withheld statement')))) : null,
      p.core.missing_fields.length ? el('p', { class: 'unknown' }, 'No core claim yet for: ',
        p.core.missing_fields.map((f) => f.replace(/_/g, ' ')).join(', ')) : null,
      p.bias_flags_present.length ? el('p', { class: 'flags' }, el('span', { class: 'label' }, 'Bias flags present '),
        p.bias_flags_present.map(flagChip)) : null),
    section('All claims', claimsList(p, claimIndex, params.get('perspective'))),
    p.profile?.evidence_note ? section('About the evidence', markdownBlock(p.profile.evidence_note)) : null);
}

function claimsList(p, claimIndex, initialPerspective) {
  const perspectives = new Map();
  for (const c of p.claims) for (const x of c.perspective) perspectives.set(x.id, x.name);
  const list = el('div', { class: 'claims' });
  const shown = new Set();
  for (const c of p.claims) {
    if (shown.has(c.id)) continue;
    const alts = (c.alternative_claim_ids || []).map((i) => claimIndex.get(i)).filter(Boolean);
    if (alts.length) {
      const group = [c, ...alts];
      group.forEach((g) => shown.add(g.id));
      list.append(el('div', { class: 'disagree', role: 'group', 'aria-label': 'Sources disagree' },
        el('p', { class: 'label disagree-label' }, 'Sources disagree'),
        el('div', { class: 'disagree-grid' }, group.map((g) => claimCard(g)))));
    } else {
      shown.add(c.id);
      list.append(claimCard(c));
    }
  }
  const select = (label, name, options, value = '') => el('label', { class: 'filter' }, el('span', { class: 'label' }, label),
    el('select', { name, onchange: apply }, options.map(([v, t]) => el('option', { value: v, selected: v === value }, t))));
  const filters = el('form', { class: 'filters', 'aria-label': 'Filter claims', onsubmit: (e) => e.preventDefault() },
    select('Grade', 'grade', [['', 'All grades'], ...Object.keys(GRADE_LABELS).map((g) => [g, `${g} · ${GRADE_LABELS[g]}`])]),
    select('Type', 'type', [['', 'All types'], ...Object.entries(CLAIM_TYPE_LABELS)]),
    perspectives.size ? select('Perspective', 'perspective',
      [['', 'All perspectives'], ...[...perspectives].sort((a, b) => a[1].localeCompare(b[1]))], initialPerspective || '') : null);
  const count = el('p', { class: 'filter-count', 'aria-live': 'polite' });
  function apply() {
    const f = Object.fromEntries(new FormData(filters));
    let n = 0;
    list.querySelectorAll('.claim').forEach((card) => {
      const ok = (!f.grade || card.dataset.grade === f.grade) && (!f.type || card.dataset.type === f.type) &&
        (!f.perspective || card.dataset.perspective.split(' ').includes(f.perspective));
      card.hidden = !ok;
      if (ok) n += 1;
    });
    list.querySelectorAll('.disagree').forEach((g) => { g.hidden = !g.querySelector('.claim:not([hidden])'); });
    count.textContent = `${n} of ${list.querySelectorAll('.claim').length} claims shown`;
  }
  apply();
  return el('div', {}, filters, count, list);
}

// ------------------------------------------------------------------ Myths
// The myths table keeps the doc's verdict word, stored as "Myths table verdict: X (G). Evidence: …".
function mythParts(c) {
  const status = c.evidence_status || '';
  const m = /Myths table verdict: (.+?) \(([A-E])\)\. Evidence: ([\s\S]*)$/.exec(status);
  if (m) return { word: m[1], evidence: m[3], note: status.slice(0, m.index).trim() || null };
  return { word: VERDICT_LABELS[c.verdict] || c.verdict, evidence: status };
}

function mythsTab({ p }) {
  if (!p.myths.length) return unknown('No myths recorded yet.');
  const rows = p.myths.map((c) => {
    const parts = c.restricted ? { word: VERDICT_LABELS[c.verdict] } : mythParts(c);
    const ai = c.citations.filter((s) => s.source_type === 'ai-generated');
    const evidence = c.citations.filter((s) => s.source_type !== 'ai-generated');
    return el('tr', { id: `myth-${c.id}` },
      el('th', { scope: 'row', class: 'myth-claim' }, c.restricted ? withheld(c) : c.statement),
      el('td', {}, el('span', { class: `verdict-chip verdict-${c.verdict}` }, parts.word), ' ', gradeBadge(c.certainty)),
      el('td', {},
        parts.evidence ? markdownBlock(parts.evidence) : null,
        parts.note ? el('p', { class: 'evidence-status' }, parts.note) : null,
        evidence.length ? citationList(evidence) : null,
        ai.map((s) => el('p', { class: 'ai-origin' }, 'Origin of this myth: AI-generated web page (',
          el('a', { href: href(s.source_id) }, s.title), ')'))));
  });
  return el('div', { class: 'table-scroll' }, el('table', { class: 'data-table myths' },
    el('thead', {}, el('tr', {}, ['Popular claim', 'Verdict', 'Evidence'].map((h) => el('th', { scope: 'col' }, h)))),
    el('tbody', {}, rows)));
}

// ------------------------------------------------------------------ Sources
// Every source cited by this person's claims (myths included), with tier and the access levels used.
function sourcesFor(p) {
  const map = new Map();
  for (const c of [...p.claims, ...p.myths]) {
    for (const s of c.citations) {
      const e = map.get(s.source_id) || { s, claims: new Set(), access: new Set(), mythOnly: true };
      e.claims.add(c.id);
      if (s.access) e.access.add(s.access);
      if (c.field !== 'myth') e.mythOnly = false;
      map.set(s.source_id, e);
    }
  }
  return [...map.values()].sort((a, b) => b.claims.size - a.claims.size || (a.s.title || '').localeCompare(b.s.title || ''));
}

function sourcesTab({ p }) {
  const sources = sourcesFor(p);
  if (!sources.length) return unknown('No sources cited yet.');
  return el('div', { class: 'table-scroll' }, el('table', { class: 'data-table' },
    el('thead', {}, el('tr', {}, ['Source', 'Reliability tier', 'Access', 'Claims'].map((h) => el('th', { scope: 'col' }, h)))),
    el('tbody', {}, sources.map(({ s, claims, access, mythOnly }) => el('tr', {},
      el('th', { scope: 'row' }, el('a', { href: href(s.source_id) }, s.title || s.source_id),
        s.source_type === 'ai-generated' ? el('div', { class: 'ai-origin' }, 'Origin of a myth only; not evidence') : null),
      el('td', {}, el('span', { class: `tier-badge tier-${s.tier || 'primary'}` }, tierLabel(s.tier))),
      el('td', {}, access.size ? [...access].map((a) => ACCESS_LABELS[a] || a).join(', ') : unknown('not recorded')),
      el('td', {}, `${claims.size}${mythOnly ? ' (myths only)' : ''}`))))));
}

// ------------------------------------------------------------------ life slider
// Milestones: birth, every dated battle or war in order, death. Each shows the claim linked to it
// (its statement and grade) when there is one, its date with the date's grade, and the record linked.
function milestones({ p, claimIndex }) {
  const out = [];
  const firstClaim = (ids) => (ids || []).map((i) => claimIndex.get(i)).find(Boolean);
  const add = (date, kind, claim, extra = {}) => {
    if (date && Number.isInteger(date.earliest)) out.push({ date, kind, claim, ...extra });
  };
  if (p.birth) add(p.birth, 'Born', firstClaim(p.birth.claim_ids));
  for (const e of p.engagements) add(e.date, RELATION_LABELS[e.relation] || e.relation, firstClaim(e.claim_ids), { event: e });
  if (p.death) add(p.death, 'Died', firstClaim(p.death.claim_ids));
  const rank = (m) => (m.kind === 'Born' ? 0 : m.kind === 'Died' ? 2 : 1);
  return out.sort((a, b) => a.date.earliest - b.date.earliest || rank(a) - rank(b));
}

function lifeSlider(ctx) {
  const items = milestones(ctx);
  const panelEl = el('section', { class: 'panel life', 'aria-labelledby': 'life-heading' },
    el('h2', { class: 'label', id: 'life-heading' }, 'Life'));
  if (!items.length) {
    panelEl.append(unknown('No dated milestones recorded yet.'));
    return panelEl;
  }
  const card = el('div', { class: 'milestone-card', 'aria-live': 'polite' });
  const track = el('ol', { class: 'life-track', 'aria-label': 'Milestones in order; use the arrow keys to move' });
  const buttons = items.map((m, i) => el('button', {
    type: 'button', class: 'milestone-dot',
    'aria-label': `${m.date.display}: ${m.kind}${m.event ? ` ${m.event.name}` : ''}`,
    title: `${m.date.display}: ${m.kind}${m.event ? ` ${m.event.name}` : ''}`, onclick: () => select(i),
  }));
  buttons.forEach((b, i) => track.append(el('li', { style: `left:${items.length > 1 ? (i / (items.length - 1)) * 100 : 50}%` }, b)));
  let current = 0;
  function select(i) {
    current = (i + items.length) % items.length;
    buttons.forEach((b, j) => {
      b.setAttribute('aria-pressed', String(j === current));
      b.tabIndex = j === current ? 0 : -1;
    });
    const m = items[current];
    const c = m.claim;
    card.replaceChildren(...[
      el('p', { class: 'milestone-kind label' }, m.kind, m.event ? [': ', recordLink(m.event)] : null),
      el('p', { class: 'milestone-date' }, datedValue(m.date)),
      c ? el('p', { class: `milestone-statement${c.claim_type === 'tradition' ? ' is-tradition' : ''}` },
        c.claim_type === 'tradition' ? el('span', { class: 'tradition-intro' }, 'Tradition: ') : null,
        c.restricted ? withheld(c) : c.statement, ' ', gradeBadge(c.certainty), ' ',
        el('span', { class: 'type-tag' }, CLAIM_TYPE_LABELS[c.claim_type]))
        : (m.event ? el('p', { class: 'milestone-statement' }, resultText(m.event), ' ',
          gradeBadge(m.event.certainty, { title: `This part is graded ${m.event.certainty}` })) : null),
      c?.alternative_claim_ids?.length ? el('p', { class: 'cell-note' }, 'Sources disagree: see the Evidence tab.') : null,
      el('p', { class: 'milestone-count cell-note' }, `${current + 1} of ${items.length}`)].filter(Boolean));
  }
  track.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    select(current + step);
    buttons[current].focus();
  });
  panelEl.append(
    el('div', { class: 'life-ends cell-note', 'aria-hidden': 'true' },
      el('span', {}, items[0].date.display), el('span', {}, items[items.length - 1].date.display)),
    el('div', { class: 'life-track-wrap' }, track),
    el('div', { class: 'life-nav' },
      el('button', { type: 'button', class: 'btn-secondary', onclick: () => select(current - 1) }, '‹ Earlier'),
      el('button', { type: 'button', class: 'btn-secondary', onclick: () => select(current + 1) }, 'Later ›')),
    card);
  select(0);
  return panelEl;
}

function connectionsPanel(p) {
  const items = p.connections.filter((c) => !['battle', 'war'].includes(c.other.type));
  return el('section', { class: 'panel', 'aria-labelledby': 'conn-heading' },
    el('h2', { class: 'label', id: 'conn-heading' }, 'Connections'),
    items.length ? el('ul', { class: 'connections' }, items.map((c) => el('li', {},
      el('span', { class: 'conn-relation' }, c.relation.replace(/_/g, ' ')), ' ', recordLink(c.other), ' ',
      gradeBadge(c.certainty), c.role ? el('div', { class: 'cell-note' }, c.role) : null)))
      : unknown('None recorded yet.'));
}

// ------------------------------------------------------------------ bottom strip
function bottomStrip(ctx) {
  const { p } = ctx;
  const sources = sourcesFor(p);
  const conns = p.connections.filter((c) => !['battle', 'war'].includes(c.other.type));
  const persp = new Map();
  for (const c of p.claims) {
    for (const x of c.perspective) {
      const e = persp.get(x.id) || { ref: x, claims: [] };
      e.claims.push(c);
      persp.set(x.id, e);
    }
  }
  const counts = { battles: p.engagements.length, claims: p.claims.length, sources: sources.length,
    myths: p.myths.length, connections: conns.length, perspectives: persp.size };
  const row = (cards, empty) => (cards.length ? el('ul', { class: 'card-row' }, cards.map((c) => el('li', {}, c)))
    : unknown(empty));
  const showInTab = (tab, targetId, perspective) => (e) => {
    e.preventDefault();
    if (perspective) ctx.params.set('perspective', perspective);
    ctx.openTab(tab, { then: () => {
      const t = document.getElementById(targetId) || document.getElementById(`tab-profile-${tab}`);
      t?.scrollIntoView({ block: 'center' });
    } });
  };
  const strip = tabSet('strip', [['battles', 'Battles'], ['claims', 'Claims'], ['sources', 'Sources'], ['myths', 'Myths'],
    ['connections', 'Connections'], ['perspectives', 'Perspectives']], {
    battles: () => row(p.engagements.map((e) => el('a', { class: 'strip-card', href: href(e.id) },
      el('span', { class: 'strip-date' }, datedValue(e.date)),
      el('span', { class: 'strip-title' }, e.name),
      ['commanded', 'participated', 'planned'].includes(e.relation) && e.opponents?.length
        ? el('span', { class: 'cell-note' }, `Against: ${e.opponents.join(', ')}`) : null,
      el('span', { class: 'cell-note' }, `${RELATION_LABELS[e.relation] || e.relation}${e.role ? ` · ${e.role}` : ''}`),
      el('span', {}, resultText(e), ' ',
        gradeBadge(e.certainty, { title: `This part is graded ${e.certainty}` })))), 'No battles recorded yet.'),
    claims: () => row(p.claims.map((c) => el('a', { class: 'strip-card', href: `#claim-${c.id}`,
      onclick: showInTab('evidence', `claim-${c.id}`) },
    el('span', {}, gradeBadge(c.certainty), ' ', el('span', { class: `type-tag type-${c.claim_type}` }, CLAIM_TYPE_LABELS[c.claim_type])),
    el('span', { class: `strip-text${c.claim_type === 'tradition' ? ' is-tradition' : ''}` },
      c.restricted ? withheld(c) : c.statement))), 'No claims recorded yet.'),
    sources: () => row(sources.map(({ s, claims }) => el('a', { class: 'strip-card', href: href(s.source_id) },
      el('span', {}, el('span', { class: `tier-badge tier-${s.tier || 'primary'}` }, tierLabel(s.tier))),
      el('span', { class: 'strip-title' }, s.title),
      el('span', { class: 'cell-note' }, `Cited by ${claims.size} claim${claims.size === 1 ? '' : 's'}`))), 'No sources cited yet.'),
    myths: () => row(p.myths.map((c) => el('a', { class: 'strip-card', href: `#myth-${c.id}`, onclick: showInTab('myths', `myth-${c.id}`) },
      el('span', {}, el('span', { class: `verdict-chip verdict-${c.verdict}` }, c.restricted ? VERDICT_LABELS[c.verdict] : mythParts(c).word),
        ' ', gradeBadge(c.certainty)),
      el('span', { class: 'strip-text' }, c.restricted ? withheld(c) : c.statement))), 'No myths recorded yet.'),
    connections: () => row(conns.map((c) => el('a', { class: 'strip-card', href: href(c.other.id) },
      el('span', { class: 'cell-note' }, c.relation.replace(/_/g, ' ')), el('span', { class: 'strip-title' }, c.other.name),
      el('span', {}, gradeBadge(c.certainty)))), 'None recorded yet.'),
    perspectives: () => row([...persp.values()].map(({ ref, claims }) => el('a', { class: 'strip-card', href: href(ref.id),
      onclick: showInTab('evidence', 'tab-profile-evidence', ref.id) },
    el('span', { class: 'cell-note' }, 'From the perspective of'), el('span', { class: 'strip-title' }, ref.name),
    el('span', { class: 'cell-note' }, `${claims.length} claim${claims.length === 1 ? '' : 's'} · show them in Evidence`))),
    'No claims carry a perspective yet.'),
  }, 'battles', { counts, urlKey: null });
  return el('section', { class: 'dossier-strip', 'aria-label': 'Lists' }, strip.node);
}
