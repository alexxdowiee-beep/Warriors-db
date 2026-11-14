// Shared parts of the Dossier pattern (docs/APP_BRIEF.md, "Person profile: the Dossier" and
// "Battle, war, source, polity and place pages"): the hero and accessible tabs.
import { el } from './components.js';

// Hero: an image area that is a neutral gradient until image records exist (no placeholder text or
// images), with the breadcrumb and the name over its lower edge.
export function heroBlock(name, crumbs, { lang = null, id = 'record-name', small = false } = {}) {
  return el('header', { class: `hero${small ? ' hero-small' : ''}` },
    el('div', { class: 'hero-image', 'aria-hidden': 'true' }),
    el('div', { class: 'hero-text' },
      el('nav', { class: 'breadcrumb label', 'aria-label': 'Breadcrumb' }, el('ol', {}, crumbs.map((c) => el('li', {}, c)))),
      el('h1', { class: `person-name${small ? ' record-name' : ''}`, id, lang }, name)));
}

// Accessible tabs: arrow keys move between tabs; the profile's tab is kept in the address (?tab=…).
export function tabSet(name, list, renderers, initial, { counts = {}, urlKey = 'tab', label = null } = {}) {
  const tablist = el('div', { class: `tablist tablist-${name}`, role: 'tablist',
    'aria-label': label || (name === 'profile' ? 'Profile sections' : name === 'strip' ? 'Lists' : 'Sections') });
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

