// Explore (home). Step 2: an empty page that confirms the data bundle loads.
// Step 4 adds the world timeline and the people grid.
import { manifest } from '../data.js';

const COUNT_LABELS = [
  ['people', 'People'], ['battles', 'Battles'], ['wars', 'Wars'], ['sources', 'Sources'],
  ['claims', 'Claims'], ['polities', 'Polities'], ['places', 'Places'], ['civilisations', 'Civilisations'],
];

export async function renderHome(view) {
  document.title = 'Warriors & Leaders';
  view.innerHTML = '';
  const h1 = document.createElement('h1');
  h1.className = 'page-title';
  h1.textContent = 'Explore';
  const note = document.createElement('p');
  note.className = 'notice';
  note.textContent = 'The world timeline and the people grid are built in step 4.';
  view.append(h1, note);

  const m = await manifest();
  const panel = document.createElement('section');
  panel.className = 'panel';
  panel.setAttribute('aria-labelledby', 'bundle-heading');
  const label = document.createElement('h2');
  label.className = 'label';
  label.id = 'bundle-heading';
  label.textContent = 'Data bundle loaded';
  const list = document.createElement('ul');
  list.className = 'counts';
  for (const [key, text] of COUNT_LABELS) {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = String(m.counts[key] ?? 0);
    li.append(strong, text);
    list.append(li);
  }
  const version = document.createElement('p');
  version.className = 'notice';
  version.textContent = `Bundle ${m.bundle_version}, from the database built ${m.generated_at}.`;
  panel.append(label, list, version);
  view.append(panel);
}
