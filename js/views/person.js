// Person profile (docs/APP_BRIEF.md, "Person profile" and "Evidence display rules").
import { getJSON, record } from '../data.js';
import {
  el, gradeBadge, statusChip, flagChip, recordLink, datedValue, unknown, langOf, panel, href,
  CLAIM_TYPE_LABELS, ACCESS_LABELS, tierLabel, GRADE_LABELS,
} from '../components.js';
import { markdownBlock } from '../markdown.js';
import { timelineStrip } from '../timeline.js';

// Profile sections in template order.
const SECTIONS = [
  ['early_life', 'Early life'], ['historical_context', 'Historical context'],
  ['military_career', 'Military career'], ['leadership', 'Leadership'],
  ['strategy_and_tactics', 'Strategy and tactics'], ['leadership_and_strategy', 'Leadership and strategy'],
  ['technology', 'Weapons and technology'], ['victories_and_defeats', 'Victories and defeats'],
  ['political_achievements', 'Political achievements'], ['controversies', 'Controversies'],
  ['legacy', 'Legacy'], ['evidence_note', 'The evidence'],
];
const RELATION_LABELS = {
  commanded: 'Commanded', participated: 'Took part', planned: 'Planned', died_at: 'Died at',
  wounded_at: 'Wounded at', affected_by: 'Affected by',
};
const VERDICT_LABELS = { accepted: 'Accepted', disputed: 'Disputed', 'rejected-myth': 'Rejected' };

export async function renderPerson(view, id) {
  const [p, timeline, vocab] = await Promise.all([record(id), getJSON('timeline.json'), getJSON('vocab.json')]);
  document.title = `${p.primary_name} · Warriors & Leaders`;
  const claimIndex = new Map([...p.claims, ...p.myths].map((c) => [c.id, c]));

  view.innerHTML = '';
  view.append(
    timelineStrip({ timeline, eras: vocab.eras.values, highlightId: p.id }),
    titleBand(p),
    keyFacts(p, claimIndex),
    el('div', { class: 'profile-grid' },
      sectionNav(p),
      readingColumn(p, claimIndex),
      rightRail(p, claimIndex, vocab)),
  );
  watchSections(view);
  // Deep link to a section: #/person/PER-000003?s=claims
  const section = new URLSearchParams(location.hash.split('?')[1] || '').get('s');
  if (section) requestAnimationFrame(() => document.getElementById(`sec-${section}`)?.scrollIntoView());
}

// ------------------------------------------------------------------ title band
function mainWar(p) {
  const counts = new Map();
  for (const e of p.engagements) {
    if (e.war) counts.set(e.war.id, { ref: e.war, n: (counts.get(e.war.id)?.n || 0) + 1 });
    if (e.type === 'war') counts.set(e.id, { ref: { id: e.id, name: e.name }, n: (counts.get(e.id)?.n || 0) + 1 });
  }
  return [...counts.values()].sort((a, b) => b.n - a.n)[0]?.ref || null;
}

function nameNode(name, language, tag = 'span', attrs = {}) {
  return el(tag, { ...attrs, lang: langOf(language) }, name);
}

function titleBand(p) {
  const primary = p.names.find((n) => n.kind === 'primary') || {};
  const war = mainWar(p);
  const crumbs = [el('a', { href: '#/people' }, 'People')];
  if (p.polities[0]) crumbs.push(recordLink(p.polities[0]));
  if (war) crumbs.push(recordLink(war));
  const breadcrumb = el('nav', { class: 'breadcrumb label', 'aria-label': 'Breadcrumb' },
    el('ol', {}, crumbs.map((c) => el('li', {}, c))));
  const others = p.names.filter((n) => n.kind !== 'primary');
  return el('header', { class: 'title-band' },
    breadcrumb,
    nameNode(p.primary_name, primary.language, 'h1', { class: 'person-name' }),
    others.length ? el('p', { class: 'aka' }, 'Also known as ',
      others.map((n, i) => [i ? ', ' : '', nameNode(n.name, n.language, 'span', { class: 'aka-name' }),
        n.kind !== 'other' ? el('span', { class: 'aka-kind' }, ` (${n.kind.replace('-', ' ')})`) : null])) : null,
    el('p', { class: 'title-meta' }, statusChip(p.status),
      p.era ? el('span', { class: 'meta-chip' }, eraLabel(p.era)) : null,
      ...(p.regions || []).map((r) => el('span', { class: 'meta-chip' }, r))),
    p.status !== 'reviewed'
      ? el('p', { class: 'research-banner', role: 'note' }, 'Research in progress — not yet reviewed.') : null,
  );
}

const ERA_LABELS = { ancient: 'Ancient', classical: 'Classical', medieval: 'Medieval', 'early-modern': 'Early modern',
  modern: 'Modern' };
const eraLabel = (key) => ERA_LABELS[key] || key;

// ------------------------------------------------------------------ key facts
function keyFacts(p, claimIndex) {
  const identity = p.core.claim_ids.map((i) => claimIndex.get(i)).filter((c) => c && c.field === 'identity');
  const roleGrade = identity.length
    ? identity.map((c) => c.certainty).sort().slice(-1)[0] : null;
  const cell = (label, ...value) => el('div', { class: 'fact' }, el('div', { class: 'label' }, label),
    el('div', { class: 'fact-value' }, ...value));
  return el('section', { class: 'key-facts', 'aria-label': 'Key facts' },
    cell('Born', datedValue(p.birth)),
    cell('Died', datedValue(p.death)),
    cell('Role', p.roles?.length ? p.roles.map((r) => r.replace(/-/g, ' ')).join(', ') : unknown('not yet recorded'),
      ' ', roleGrade ? gradeBadge(roleGrade, { title: `Identity claims graded ${roleGrade}` })
        : el('span', { class: 'unknown' }, '(no identity claim yet)')),
    cell('Certainty', gradeBadge(p.certainty, { label: true })),
  );
}

// ------------------------------------------------------------------ section navigation
function sectionList(p) {
  const list = [['summary', 'Summary']];
  if (p.engagements.length) list.push(['career', 'Career timeline'], ['battles', 'Battles and wars']);
  for (const [key, label] of SECTIONS) if (p.profile?.[key]) list.push([key, label]);
  if (p.profile?.key_takeaways?.length) list.push(['takeaways', 'Key takeaways']);
  if (p.myths.length) list.push(['myths', 'Myths']);
  list.push(['claims', 'All claims']);
  return list;
}

function sectionNav(p) {
  const wide = window.matchMedia('(min-width: 768px)').matches;
  return el('nav', { class: 'section-nav', 'aria-label': 'On this page' },
    el('details', { open: wide },
      el('summary', { class: 'label' }, 'On this page'),
      el('ol', {}, sectionList(p).map(([key, label]) =>
        el('li', {}, el('a', { href: `#sec-${key}`, 'data-target': `sec-${key}`, onclick: jump }, label))))));
}

// In-page links must not change the hash route, so scroll and move focus instead.
function jump(event) {
  event.preventDefault();
  const target = document.getElementById(event.currentTarget.dataset.target);
  if (!target) return;
  target.scrollIntoView({ block: 'start' });
  target.focus({ preventScroll: true });
}

function watchSections(view) {
  const links = new Map([...view.querySelectorAll('.section-nav a')].map((a) => [a.dataset.target, a]));
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((a) => a.removeAttribute('aria-current'));
      links.get(entry.target.id)?.setAttribute('aria-current', 'true');
    }
  }, { rootMargin: '-20% 0px -70% 0px' });
  view.querySelectorAll('.profile-section').forEach((s) => observer.observe(s));
}

function section(key, title, ...content) {
  return el('section', { class: 'profile-section', id: `sec-${key}`, tabindex: '-1', 'aria-labelledby': `h-${key}` },
    el('h2', { id: `h-${key}` }, title), ...content);
}

// ------------------------------------------------------------------ reading column
function readingColumn(p, claimIndex) {
  const col = el('div', { class: 'reading' });
  col.append(section('summary', 'Summary', el('p', { class: 'lead' }, p.summary || 'No summary yet.')));
  if (p.engagements.length) {
    col.append(section('career', 'Career timeline', careerTimeline(p)));
    col.append(section('battles', 'Battles and wars', battlesTable(p)));
  }
  for (const [key, label] of SECTIONS) {
    if (p.profile?.[key]) col.append(section(key, label, markdownBlock(p.profile[key])));
  }
  if (p.profile?.key_takeaways?.length) {
    col.append(section('takeaways', 'Key takeaways',
      el('ol', { class: 'takeaways' }, p.profile.key_takeaways.map((t) => el('li', {}, markdownBlock(t))))));
  }
  if (p.myths.length) col.append(section('myths', 'Myths and misconceptions', mythsTable(p)));
  col.append(section('claims', 'All claims', claimsList(p, claimIndex)));
  return col;
}

function careerTimeline(p) {
  const items = [];
  if (p.birth) items.push({ date: p.birth, text: 'Born' });
  for (const e of p.engagements) {
    if (e.date) items.push({ date: e.date, text: [`${RELATION_LABELS[e.relation] || e.relation}: `, recordLink(e)] });
  }
  if (p.death) items.push({ date: p.death, text: 'Died' });
  items.sort((a, b) => (a.date.earliest ?? 1e9) - (b.date.earliest ?? 1e9));
  return el('ol', { class: 'career' }, items.map((i) => el('li', {},
    el('span', { class: 'career-date' }, datedValue(i.date)), el('span', { class: 'career-text' }, i.text))));
}

function battlesTable(p) {
  const rows = p.engagements.map((e) => el('tr', {},
    el('th', { scope: 'row' }, recordLink(e), el('div', { class: 'cell-note' }, e.type === 'war' ? 'War' : (e.kind || '').replace(/-/g, ' '))),
    el('td', {}, datedValue(e.date)),
    el('td', {}, RELATION_LABELS[e.relation] || e.relation, e.role ? el('div', { class: 'cell-note' }, e.role) : null),
    el('td', {}, e.result || unknown()),
    el('td', {}, gradeBadge(e.certainty, { title: `This part is graded ${e.certainty}` }))));
  return el('div', { class: 'table-scroll' }, el('table', { class: 'data-table' },
    el('thead', {}, el('tr', {}, ['Engagement', 'Date', 'Part', 'Result', 'Grade'].map((h) => el('th', { scope: 'col' }, h)))),
    el('tbody', {}, rows)));
}

// The myths table keeps the doc's verdict word (stored as "Myths table verdict: X (G)" in the
// claim's evidence status); otherwise the verdict label is used.
function mythParts(c) {
  const status = c.evidence_status || '';
  const m = /Myths table verdict: (.+?) \(([A-E])\)\. Evidence: ([\s\S]*)$/.exec(status);
  if (m) {
    const note = status.slice(0, m.index).trim(); // e.g. "Pilot doc grade A; restore when cited."
    return { word: m[1], evidence: m[3], note: note || null };
  }
  return { word: VERDICT_LABELS[c.verdict] || c.verdict, evidence: status };
}

function mythsTable(p) {
  const rows = p.myths.map((c) => {
    const parts = c.restricted ? { word: VERDICT_LABELS[c.verdict] } : mythParts(c);
    const ai = c.citations.filter((s) => s.source_type === 'ai-generated');
    const evidence = c.citations.filter((s) => s.source_type !== 'ai-generated');
    return el('tr', {},
      el('th', { scope: 'row', class: 'myth-claim' }, c.restricted
        ? withheld(c) : c.statement),
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

function withheld(c) {
  return el('span', { class: 'withheld' }, 'Statement withheld: ', c.restricted_reason || 'restricted material.');
}

// ------------------------------------------------------------------ claims
function citationList(cites) {
  return el('ul', { class: 'citations' }, cites.map((s) => el('li', {},
    el('a', { href: href(s.source_id) }, s.title || s.source_id),
    el('span', { class: 'cite-meta' }, ` · ${tierLabel(s.tier)} · ${ACCESS_LABELS[s.access] || 'Access not recorded'}`),
    s.locator ? el('span', { class: 'cite-meta' }, ` · ${s.locator}`) : null,
    s.note ? el('span', { class: 'cite-note' }, ` (${s.note})`) : null)));
}

function claimCard(c) {
  const tradition = c.claim_type === 'tradition';
  const cites = c.citations.filter((s) => s.source_type !== 'ai-generated');
  return el('article', { class: `claim${tradition ? ' claim-tradition' : ''}`, id: `claim-${c.id}`, 'data-grade': c.certainty,
    'data-type': c.claim_type, 'data-perspective': c.perspective.map((x) => x.id).join(' ') },
    el('div', { class: 'claim-head' },
      gradeBadge(c.certainty),
      el('span', { class: `type-tag type-${c.claim_type}` }, CLAIM_TYPE_LABELS[c.claim_type] || c.claim_type),
      c.verdict !== 'accepted' ? el('span', { class: `verdict-chip verdict-${c.verdict}` }, VERDICT_LABELS[c.verdict]) : null,
      el('span', { class: 'claim-field' }, (c.field || '').replace(/_/g, ' '))),
    el('p', { class: 'claim-statement' }, c.restricted ? withheld(c)
      : [tradition ? el('span', { class: 'tradition-intro' }, 'Tradition: ') : null, c.statement]),
    c.bias_flags.length ? el('p', { class: 'flags' }, c.bias_flags.map(flagChip)) : null,
    c.perspective.length ? el('p', { class: 'perspective' }, 'From the perspective of: ',
      c.perspective.map((x, i) => [i ? ', ' : '', recordLink(x)])) : null,
    cites.length ? citationList(cites) : el('p', { class: 'unknown' }, 'No source cited yet.'),
    c.evidence_status ? el('p', { class: 'evidence-status' }, c.evidence_status) : null);
}

function claimsList(p, claimIndex) {
  const claims = p.claims;
  const perspectives = new Map();
  for (const c of [...p.claims]) for (const x of c.perspective) perspectives.set(x.id, x.name);

  const list = el('div', { class: 'claims' });
  const shown = new Set();
  for (const c of claims) {
    if (shown.has(c.id)) continue;
    const alts = (c.alternative_claim_ids || []).map((i) => claimIndex.get(i)).filter(Boolean);
    if (alts.length) {
      const group = [c, ...alts];
      group.forEach((g) => shown.add(g.id));
      list.append(el('div', { class: 'disagree', role: 'group', 'aria-label': 'Sources disagree' },
        el('p', { class: 'label disagree-label' }, 'Sources disagree'),
        el('div', { class: 'disagree-grid' }, group.map(claimCard))));
    } else {
      shown.add(c.id);
      list.append(claimCard(c));
    }
  }

  const select = (label, name, options) => el('label', { class: 'filter' }, el('span', { class: 'label' }, label),
    el('select', { name, onchange: apply }, options.map(([v, t]) => el('option', { value: v }, t))));
  const filters = el('form', { class: 'filters', 'aria-label': 'Filter claims', onsubmit: (e) => e.preventDefault() },
    select('Grade', 'grade', [['', 'All grades'], ...Object.keys(GRADE_LABELS).map((g) => [g, `${g} · ${GRADE_LABELS[g]}`])]),
    select('Type', 'type', [['', 'All types'], ...Object.entries(CLAIM_TYPE_LABELS)]),
    perspectives.size ? select('Perspective', 'perspective',
      [['', 'All perspectives'], ...[...perspectives].sort((a, b) => a[1].localeCompare(b[1]))]) : null);
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

// ------------------------------------------------------------------ right rail
function rightRail(p, claimIndex, vocab) {
  const rail = el('aside', { class: 'rail', 'aria-label': 'Evidence and connections' });
  if (p.cultural_guidance) {
    rail.append(el('section', { class: 'panel rail-panel guidance', 'aria-labelledby': 'panel-guidance' },
      el('h2', { class: 'label', id: 'panel-guidance' }, 'Cultural guidance'), el('p', {}, p.cultural_guidance)));
  }
  rail.append(evidencePanel(p, claimIndex, vocab), keySources(p), connections(p),
    el('button', { class: 'btn-secondary', type: 'button', disabled: true }, 'Test yourself · Quizzes coming'));
  return rail;
}

function evidencePanel(p, claimIndex, vocab) {
  const meaning = vocab.grades[p.certainty]?.meaning;
  const weakest = p.core.weakest_claim_ids.map((i) => claimIndex.get(i)).filter(Boolean);
  return panel('Evidence',
    el('p', { class: 'evidence-grade' }, gradeBadge(p.certainty, { label: true })),
    meaning ? el('p', { class: 'muted-text' }, meaning) : null,
    el('p', {}, `The overall grade is the weakest of the core claims (${p.core.claim_set || 'no core set'}: `,
      p.core.fields.map((f) => f.replace(/_/g, ' ')).join(', '), ').'),
    weakest.length ? el('ul', { class: 'core-list' }, weakest.map((c) => el('li', {}, gradeBadge(c.certainty), ' ',
      el('a', { href: `#claim-${c.id}`, onclick: (e) => { e.preventDefault(); document.getElementById(`claim-${c.id}`)?.scrollIntoView(); } },
        c.statement || 'withheld statement')))) : null,
    p.core.missing_fields.length ? el('p', { class: 'unknown' }, 'No core claim yet for: ',
      p.core.missing_fields.map((f) => f.replace(/_/g, ' ')).join(', ')) : null,
    p.bias_flags_present.length ? el('div', {}, el('p', { class: 'label' }, 'Bias flags present'),
      el('p', { class: 'flags' }, p.bias_flags_present.map(flagChip))) : null);
}

function keySources(p) {
  const seen = new Map();
  for (const c of p.claims) {
    if (c.verdict === 'rejected-myth') continue;
    for (const s of c.citations) {
      if (s.source_type === 'ai-generated') continue;
      const entry = seen.get(s.source_id) || { s, n: 0 };
      entry.n += 1;
      seen.set(s.source_id, entry);
    }
  }
  const top = [...seen.values()].sort((a, b) => b.n - a.n || a.s.source_id.localeCompare(b.s.source_id)).slice(0, 8);
  return panel('Key sources', top.length ? el('ul', { class: 'source-list' }, top.map(({ s, n }) => el('li', {},
    el('a', { href: href(s.source_id) }, s.title || s.source_id),
    el('span', { class: 'cite-meta' }, ` · ${tierLabel(s.tier)} · cited ${n}×`)))) : unknown('No sources cited yet.'));
}

function connections(p) {
  const items = p.connections.filter((c) => !['battle', 'war'].includes(c.other.type));
  if (!items.length) return panel('Connections', unknown('None recorded yet.'));
  return panel('Connections', el('ul', { class: 'connections' }, items.map((c) => el('li', {},
    el('span', { class: 'conn-relation' }, c.relation.replace(/_/g, ' ')), ' ', recordLink(c.other), ' ',
    gradeBadge(c.certainty),
    c.role ? el('div', { class: 'cell-note' }, c.role) : null))));
}
