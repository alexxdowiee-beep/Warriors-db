// Explore (home): the world timeline and the people grid (docs/APP_BRIEF.md, "Explore").
// Also used for the People page (grid only). Filters: region (a person matches if ANY of their
// regions matches) and era (a display convention: the era containing the midpoint of the active
// period). Selecting an era zooms the timeline to it; bars keep their full active period.
import { getJSON } from '../data.js';
import { el, gradeBadge, statusChip, href, datedValue, langOf } from '../components.js';
import { domain, yearLabel } from '../timeline.js';

const REGIONS = ['Africa', 'Asia', 'Europe', 'Americas', 'Pacific'];
const state = { region: null, era: null }; // kept while the app is open

export async function renderHome(view, { timelineOn = true } = {}) {
  const [index, timeline, vocab] = await Promise.all([getJSON('index.json'), getJSON('timeline.json'),
    getJSON('vocab.json')]);
  const eras = vocab.eras.values;
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  state.region = REGIONS.includes(params.get('region')) ? params.get('region') : null;
  state.era = eras.some((e) => e.key === params.get('era')) ? params.get('era') : null;
  document.title = timelineOn ? 'Warriors & Leaders' : 'People · Warriors & Leaders';

  const timelineHost = el('div', { class: 'world-timeline' });
  const gridHost = el('div');
  const count = el('p', { class: 'filter-count', 'aria-live': 'polite' });

  const chipRow = (label, values, key) => el('div', { class: 'chip-row', role: 'group', 'aria-label': label },
    el('span', { class: 'label chip-row-label' }, label),
    values.map(([value, text]) => el('button', {
      type: 'button', class: 'filter-chip', 'data-key': key, 'data-value': value ?? '',
      'aria-pressed': String(state[key] === value),
      onclick: () => { state[key] = value; update(); },
    }, text)));

  const filters = el('div', { class: 'explore-filters' },
    chipRow('Region', [[null, 'All'], ...REGIONS.map((r) => [r, r])], 'region'),
    chipRow('Era', [[null, 'All'], ...eras.map((e) => [e.key, e.label])], 'era'));

  function matches(p) {
    return (!state.region || (p.regions || []).includes(state.region)) && (!state.era || p.era === state.era);
  }

  function update() {
    const q = new URLSearchParams();
    if (state.region) q.set('region', state.region);
    if (state.era) q.set('era', state.era);
    const base = location.hash.split('?')[0] || '#/';
    history.replaceState(null, '', q.toString() ? `${base}?${q}` : base);
    filters.querySelectorAll('.filter-chip').forEach((b) => {
      const v = b.dataset.value || null;
      b.setAttribute('aria-pressed', String(state[b.dataset.key] === v));
    });
    const people = index.filter(matches);
    count.textContent = `${people.length} of ${index.length} people shown`;
    if (timelineOn) {
      timelineHost.replaceChildren(worldTimeline(timeline.people.filter((t) => people.some((p) => p.id === t.id)),
        timeline.people, eras));
    }
    gridHost.replaceChildren(peopleGrid(people, eras));
  }

  view.innerHTML = '';
  view.append(
    el('h1', { class: 'page-title explore-title' }, timelineOn ? 'Explore' : 'People'),
    el('p', { class: 'notice' }, 'Every person in the database, placed by their active period. ',
      'Eras and regions are display filters, not historical claims.'),
    filters, count,
    timelineOn ? el('section', { 'aria-labelledby': 'tl-heading' },
      el('h2', { id: 'tl-heading', class: 'label section-label' }, 'World timeline'), timelineHost) : null,
    el('section', { 'aria-labelledby': 'grid-heading' },
      el('h2', { id: 'grid-heading', class: 'label section-label' }, 'People'), gridHost));
  update();
}

// ------------------------------------------------------------------ world timeline
function worldTimeline(people, allPeople, eras) {
  if (!people.length) return el('p', { class: 'unknown' }, 'No one matches these filters yet.');
  // Zoom to the selected era if one is chosen; otherwise show every person in the database.
  let [lo, hi] = domain(allPeople);
  if (state.era) {
    const era = eras.find((e) => e.key === state.era);
    const [plo, phi] = domain(people);
    lo = Math.max(era.earliest ?? plo, plo);
    hi = Math.min((era.latest ?? phi) + 1, phi);
  }
  const span = hi - lo;
  const pos = (y) => ((Math.min(Math.max(y, lo), hi) - lo) / span) * 100;

  const bands = eras.map((e) => {
    const a = Math.max(e.earliest ?? lo, lo);
    const b = Math.min((e.latest ?? hi) + 1, hi);
    if (b <= a) return null;
    return el('div', { class: `wt-band${state.era === e.key ? ' wt-band-active' : ''}`,
      style: `left:${pos(a)}%;width:${pos(b) - pos(a)}%` },
    el('span', { class: 'wt-band-label' }, e.label));
  });

  const step = niceStep(span);
  const roundTicks = [];
  for (let d = Math.ceil(displayYear(lo) / step) * step; ; d += step) {
    const y = d <= 0 ? d + 1 : d; // display year d (negative = BCE) -> astronomical
    if (y > hi) break;
    if (y >= lo) roundTicks.push(y);
  }
  const axis = el('div', { class: 'wt-axis', 'aria-hidden': 'true' },
    roundTicks.map((y) => el('span', {
      class: `wt-tick${pos(y) > 95 ? ' wt-tick-end' : ''}${pos(y) < 4 ? ' wt-tick-start' : ''}`,
      style: `left:${pos(y)}%`,
    }, yearLabel(y))));

  const rows = people.slice().sort((a, b) => a.earliest - b.earliest || a.id.localeCompare(b.id)).map((p) => {
    const left = pos(p.earliest);
    const right = pos(p.latest + 1);
    const labelRight = left > 62; // put the label on the left of bars near the right edge
    return el('li', { class: 'wt-row' },
      el('a', {
        class: `wt-bar${labelRight ? ' wt-label-left' : ''}`, href: href(p.id),
        style: `left:${left}%;width:max(6px, ${right - left}%)`,
        'aria-label': `${p.name}, active ${p.display}, grade ${p.certainty}`,
      }, el('span', { class: 'wt-name' }, el('span', { lang: langOf(p.name_language) }, p.name), ' ',
        gradeBadge(p.certainty))));
  });

  return el('div', { class: 'wt' },
    el('div', { class: 'wt-plot' }, el('div', { class: 'wt-bands', 'aria-hidden': 'true' }, bands),
      el('ol', { class: 'wt-rows', 'aria-label': 'People by active period' }, rows)),
    axis,
    el('p', { class: 'wt-note' }, 'The axis is proportional to real dates; bars show each person\'s active ',
      'period, with its grade.'));
}

function displayYear(y) {
  return y <= 0 ? y - 1 : y; // astronomical -> signed display year (-500 = 500 BCE)
}

function niceStep(span) {
  if (span > 2000) return 500;
  if (span > 800) return 200;
  if (span > 300) return 100;
  return 50;
}

// ------------------------------------------------------------------ people grid
function peopleGrid(people, eras) {
  if (!people.length) return el('p', { class: 'unknown' }, 'No one matches these filters yet.');
  const eraLabel = Object.fromEntries(eras.map((e) => [e.key, e.label]));
  return el('ul', { class: 'people-grid' }, people.map((p) => el('li', {},
    el('a', { class: 'person-card', href: href(p.id) },
      el('span', { class: 'card-top' }, statusChip(p.status), gradeBadge(p.certainty, { label: true })),
      el('span', { class: 'card-name', lang: langOf(p.name_language) }, p.primary_name),
      el('span', { class: 'card-line' }, p.polities.map((x) => x.name).join(', ') || 'Polity not yet recorded'),
      el('span', { class: 'card-line card-muted' }, eraLabel[p.era] ? `${eraLabel[p.era]} · ` : '',
        datedValue(p.active_period)),
      el('span', { class: 'card-line card-muted' }, (p.roles || []).map((r) => r.replace(/-/g, ' ')).join(', '))))));
}
