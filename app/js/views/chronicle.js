// Home: the Chronicle timeline (docs/APP_BRIEF.md, "Home: the Chronicle timeline").
// Dated battles and wars in date order on a gold spine that scrolls sideways; cards alternate above
// and below it. Each card's sentence is the statement of the event's main claim (from the data), or
// its outcome when it has none; the badge is that claim's grade, or the record's grade otherwise.
// An era overview strip along the bottom shows a dot per card and scrolls the spine to an era.
import { getJSON } from '../data.js';
import { el, gradeBadge, href, langOf, GRADE_LABELS } from '../components.js';
import { withheld } from '../claims.js';

export const REGIONS = ['Africa', 'Asia', 'Europe', 'Americas', 'Pacific'];

export function regionChips(active, onPick, label = 'All regions') {
  return el('div', { class: 'region-filter', role: 'group', 'aria-label': 'Filter by region' },
    [[null, label], ...REGIONS.map((r) => [r, r])].map(([value, text]) => el('button', {
      type: 'button', class: `filter-chip${value ? ` region-text-${value.toLowerCase()}` : ''}`,
      'aria-pressed': String(active === value), 'data-value': value ?? '', onclick: () => onPick(value),
    }, text)));
}

export async function renderChronicle(view, headerTools) {
  const [timeline, vocab] = await Promise.all([getJSON('timeline.json'), getJSON('vocab.json')]);
  const eras = vocab.eras.values;
  document.title = 'Chronicle · Warriors & Leaders';
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  let region = REGIONS.includes(params.get('region')) ? params.get('region') : null;

  const events = timeline.events.slice().sort((a, b) => a.earliest - b.earliest || a.latest - b.latest || a.id.localeCompare(b.id));
  const spine = el('ol', { class: 'spine' });
  const scroller = el('div', { class: 'spine-scroll', tabindex: '0', role: 'region',
    'aria-label': 'Chronicle of dated events, in date order. Scroll sideways to move through time.' }, spine);
  const strip = el('div', { class: 'era-strip', role: 'group', 'aria-label': 'Eras: jump to an era' });
  const count = el('p', { class: 'filter-count chronicle-count', 'aria-live': 'polite' });

  function render() {
    const shown = events.filter((e) => !region || e.regions.includes(region));
    spine.replaceChildren(...shown.map((e, i) => eventItem(e, i % 2 === 0 ? 'above' : 'below')));
    if (!shown.length) spine.append(el('li', { class: 'spine-empty' }, 'No dated events in this region yet.'));
    count.textContent = `${shown.length} of ${events.length} dated events${region ? ` in ${region}` : ''}`;
    strip.replaceChildren(...eras.map((era) => {
      const inEra = shown.filter((e) => e.era === era.key);
      return el('button', { type: 'button', class: 'era-band', 'data-era': era.key, disabled: !inEra.length,
        'aria-label': `${era.label} (${era.display}): ${inEra.length} event${inEra.length === 1 ? '' : 's'}`,
        onclick: () => scrollToEra(era.key) },
      el('span', { class: 'era-name' }, era.label),
      el('span', { class: 'era-dots', 'aria-hidden': 'true' }, inEra.map(() => el('span', { class: 'era-dot' }))));
    }));
    scroller.scrollLeft = 0;
    markEraInView();
    headerTools.replaceChildren(regionChips(region, pick));
  }

  function pick(value) {
    region = value;
    history.replaceState(null, '', value ? `#/?region=${encodeURIComponent(value)}` : '#/');
    render();
  }

  function scrollToEra(key) {
    const first = spine.querySelector(`[data-era="${key}"]`);
    if (first) scroller.scrollTo({ left: Math.max(first.offsetLeft - 24, 0), behavior: 'auto' });
  }

  // The band of the event nearest the middle of the visible spine is highlighted.
  function markEraInView() {
    const mid = scroller.scrollLeft + scroller.clientWidth / 2;
    let best = null;
    for (const li of spine.children) {
      if (!li.dataset.era) continue;
      const centre = li.offsetLeft + 120;
      if (!best || Math.abs(centre - mid) < Math.abs(best.c - mid)) best = { c: centre, era: li.dataset.era };
    }
    strip.querySelectorAll('.era-band').forEach((b) => b.setAttribute('aria-current', String(best?.era === b.dataset.era)));
  }
  let raf = 0;
  scroller.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(markEraInView); });
  scroller.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 320, ArrowLeft: -320 }[e.key];
    if (step && e.target === scroller) { e.preventDefault(); scroller.scrollBy({ left: step }); }
  });

  view.innerHTML = '';
  view.append(el('div', { class: 'chronicle' },
    el('section', { class: 'intro-card', 'aria-labelledby': 'chronicle-title' },
      el('h1', { id: 'chronicle-title' }, 'The Chronicle'),
      el('p', {}, 'Dated battles and wars in date order: each card shows where it happened, what the record says, ',
        'who was involved, and how certain the evidence is (the grade).')),
    count, scroller, strip));
  render();
  requestAnimationFrame(markEraInView);
}

function eventItem(e, side) {
  const region = e.regions[0];
  const claim = e.main_claim;
  const sentence = claim
    ? (claim.restricted ? withheld(claim) : el('span', { class: claim.claim_type === 'tradition' ? 'is-tradition' : null },
      claim.claim_type === 'tradition' ? el('span', { class: 'tradition-intro' }, 'Tradition: ') : null, claim.statement))
    : (e.outcome ? e.outcome : el('span', { class: 'unknown' }, 'No statement or outcome recorded yet.'));
  const grade = claim ? claim.certainty : e.record_certainty;
  const weakDate = e.certainty && 'CDE'.includes(e.certainty);
  const card = el('article', { class: `event-card${region ? ` region-border-${region.toLowerCase()}` : ''}` },
    el('div', { class: 'card-image', 'aria-hidden': 'true' }),
    el('div', { class: 'card-body' },
      el('p', { class: 'card-region' }, e.regions.length
        ? e.regions.map((r, i) => [i ? ' · ' : '', el('span', { class: `region-text-${r.toLowerCase()}` }, r)])
        : el('span', { class: 'unknown' }, 'Region not recorded')),
      el('h2', { class: 'card-title' }, el('a', { href: href(e.id) }, e.name)),
      el('p', { class: 'card-sentence' }, sentence, ' ',
        gradeBadge(grade, { title: claim ? `Claim graded ${grade}: ${GRADE_LABELS[grade]}` : `Record graded ${grade}: ${GRADE_LABELS[grade]}` })),
      e.people.length ? el('p', { class: 'card-people' }, e.people.map((p, i) => [i ? ', ' : '',
        el('a', { href: href(p.id), lang: langOf(p.language) }, p.name)])) : null));
  return el('li', { class: `spine-item spine-${side}`, 'data-era': e.era || '' },
    el('div', { class: 'spine-slot spine-slot-above' }, side === 'above' ? card : null),
    el('div', { class: 'spine-node' },
      el('span', { class: 'node-dot', 'aria-hidden': 'true' }),
      el('span', { class: 'node-date' }, e.display, weakDate ? [' ', gradeBadge(e.certainty, { title: `Date graded ${e.certainty}` })] : null)),
    el('div', { class: 'spine-slot spine-slot-below' }, side === 'below' ? card : null));
}
