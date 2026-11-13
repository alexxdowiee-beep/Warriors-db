// Search page: results grouped by type (docs/APP_BRIEF.md, "Search").
import { el, href } from '../components.js';
import { search } from '../search.js';

const GROUPS = [['person', 'People'], ['battle', 'Battles'], ['war', 'Wars'], ['place', 'Places'],
  ['polity', 'Polities'], ['civilisation', 'Civilisations'], ['source', 'Sources'], ['work', 'Works']];

export async function renderSearch(view) {
  const q = new URLSearchParams(location.hash.split('?')[1] || '').get('q') || '';
  document.title = `Search · Warriors & Leaders`;
  const input = el('input', { type: 'search', id: 'search-page-input', value: q, autocomplete: 'off',
    placeholder: 'Search names…' });
  const results = el('div', { class: 'search-results', 'aria-live': 'polite' });
  const form = el('form', { class: 'search-page-form', role: 'search', onsubmit: (e) => e.preventDefault() },
    el('label', { class: 'label', for: 'search-page-input' }, 'Search people, battles, wars, places and sources'), input);

  let pending = 0;
  async function run() {
    const ticket = ++pending;
    const text = input.value.trim();
    history.replaceState(null, '', text ? `#/search?q=${encodeURIComponent(text)}` : '#/search');
    const found = await search(text);
    if (ticket !== pending) return;
    results.replaceChildren();
    if (!text) { results.append(el('p', { class: 'notice' }, 'Type any name, in any spelling the database knows.')); return; }
    results.append(el('p', { class: 'filter-count' }, `${found.length} result${found.length === 1 ? '' : 's'} for “${text}”`));
    for (const [type, label] of GROUPS) {
      const group = found.filter((r) => r.type === type);
      if (!group.length) continue;
      results.append(el('section', { class: 'result-group', 'aria-label': label },
        el('h2', { class: 'label' }, `${label} (${group.length})`),
        el('ul', { class: 'result-list' }, group.map((r) => el('li', {},
          el('a', { class: 'result-row', href: href(r.id) }, el('span', { class: 'result-name' }, r.label),
            r.matched !== r.label ? el('span', { class: 'cell-note' }, ` matched “${r.matched}”`) : null))))));
    }
    if (!found.length) results.append(el('p', { class: 'unknown' }, 'Nothing in the database matches yet.'));
  }
  input.addEventListener('input', run);

  view.innerHTML = '';
  view.append(el('h1', { class: 'page-title' }, 'Search'), form, results);
  await run();
  input.focus();
}
