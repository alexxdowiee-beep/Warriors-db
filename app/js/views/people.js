// People index (docs/APP_BRIEF.md, "People index"): a grid of person cards with name, polity, era,
// regions, overall grade badge and status chip. The region filter matches a person if ANY of their
// regions matches; eras are a display convention (the era containing the midpoint of the active period).
import { getJSON } from '../data.js';
import { el, gradeBadge, statusChip, href, datedValue, langOf } from '../components.js';
import { regionChips, REGIONS } from './chronicle.js';

export async function renderPeople(view, headerTools) {
  const [index, vocab] = await Promise.all([getJSON('index.json'), getJSON('vocab.json')]);
  const eraLabel = Object.fromEntries(vocab.eras.values.map((e) => [e.key, e.label]));
  document.title = 'People · Warriors & Leaders';
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  let region = REGIONS.includes(params.get('region')) ? params.get('region') : null;
  const grid = el('ul', { class: 'people-grid' });
  const count = el('p', { class: 'filter-count', 'aria-live': 'polite' });

  function render() {
    const people = index.filter((p) => !region || (p.regions || []).includes(region));
    count.textContent = `${people.length} of ${index.length} people${region ? ` active in ${region}` : ''}`;
    grid.replaceChildren(...people.map((p) => el('li', {},
      el('a', { class: 'person-card', href: href(p.id) },
        el('span', { class: 'card-top' }, statusChip(p.status), gradeBadge(p.certainty, { label: true })),
        el('span', { class: 'card-name', lang: langOf(p.name_language) }, p.primary_name),
        el('span', { class: 'card-line' }, p.polities.map((x) => x.name).join(', ') || 'Polity not yet recorded'),
        el('span', { class: 'card-line card-muted' }, eraLabel[p.era] ? `${eraLabel[p.era]} · ` : '',
          datedValue(p.active_period)),
        el('span', { class: 'card-regions' }, (p.regions || []).length
          ? p.regions.map((r) => el('span', { class: `chip region-chip region-${r.toLowerCase()}` }, r))
          : el('span', { class: 'unknown' }, 'Regions not yet recorded'))))));
    if (!people.length) grid.append(el('li', { class: 'unknown' }, 'No one is recorded in this region yet.'));
    headerTools.replaceChildren(regionChips(region, pick));
  }
  function pick(value) {
    region = value;
    history.replaceState(null, '', value ? `#/people?region=${encodeURIComponent(value)}` : '#/people');
    render();
  }

  view.innerHTML = '';
  view.append(el('h1', { class: 'page-title' }, 'People'),
    el('p', { class: 'notice' }, 'Everyone in the database. Regions are where each person acted: a display filter, not a historical claim.'),
    count, grid);
  render();
}
