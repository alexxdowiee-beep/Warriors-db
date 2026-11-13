// Router and page loading. Routes are hash-based (#/person/PER-000003) so they work offline
// and on any static host.
import { resolveId } from './data.js';
import { renderHome } from './views/home.js';
import { renderPending } from './views/pending.js';
import { renderPerson } from './views/person.js';

const view = document.getElementById('view');
const ROUTE_KINDS = { person: 'PER', battle: 'BAT', war: 'WAR', source: 'SRC', polity: 'POL', place: 'PLC',
  civilisation: 'CIV', work: 'WRK' };

// Pages not built yet say which build step adds them.
const routes = [
  { pattern: /^$/, section: 'explore', render: () => renderHome(view) },
  { pattern: /^people$/, section: 'people', render: () => renderPending(view, 'People', 4) },
  { pattern: /^battles$/, section: 'battles', render: () => renderPending(view, 'Battles', 5) },
  { pattern: /^wars$/, section: 'wars', render: () => renderPending(view, 'Wars', 5) },
  { pattern: /^sources$/, section: 'sources', render: () => renderPending(view, 'Sources', 5) },
  { pattern: /^search$/, section: null, render: () => renderPending(view, 'Search', 5) },
  {
    pattern: /^(person|battle|war|source|polity|place|civilisation|work)\/([A-Z]{3}-\d{6})$/,
    section: null,
    render: async (m) => {
      const [, kind, id] = m;
      const target = await resolveId(id);
      if (target !== id) {
        const newKind = Object.keys(ROUTE_KINDS).find((k) => ROUTE_KINDS[k] === target.slice(0, 3));
        location.replace(`#/${newKind}/${target}`);
        return;
      }
      window.scrollTo(0, 0);
      if (kind === 'person') await renderPerson(view, id);
      else renderPending(view, `${kind[0].toUpperCase()}${kind.slice(1)} ${id}`, 5);
    },
  },
];

function currentPath() {
  return location.hash.replace(/^#\/?/, '').split('?')[0];
}

function setActiveNav(section) {
  document.querySelectorAll('.main-nav a').forEach((a) => {
    if (a.dataset.section === section) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

async function route() {
  const path = currentPath();
  closeMenus();
  for (const r of routes) {
    const m = path.match(r.pattern);
    if (m) {
      setActiveNav(r.section);
      try {
        await r.render(m);
      } catch (err) {
        view.innerHTML = '';
        const p = document.createElement('p');
        p.className = 'notice';
        p.textContent = `This page could not be loaded (${err.message}).`;
        view.append(p);
      }
      return;
    }
  }
  setActiveNav(null);
  renderPending(view, 'Page not found', null);
}

// ------------------------------------------------------------------ header behaviour
function toggle(button, target) {
  const open = !target.classList.contains('open');
  target.classList.toggle('open', open);
  button.setAttribute('aria-expanded', String(open));
  return open;
}

function closeMenus() {
  document.querySelectorAll('[data-toggle]').forEach((b) => {
    document.getElementById(b.getAttribute('aria-controls')).classList.remove('open');
    b.setAttribute('aria-expanded', 'false');
  });
}

document.querySelectorAll('[data-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    const target = document.getElementById(button.getAttribute('aria-controls'));
    if (toggle(button, target) && button.dataset.toggle === 'search') {
      document.getElementById('search-input').focus();
    }
  });
});

const searchInput = document.getElementById('search-input');
document.getElementById('search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const q = searchInput.value.trim();
  if (q) location.hash = `#/search?q=${encodeURIComponent(q)}`;
});

// "/" focuses the search box, unless the reader is already typing somewhere.
document.addEventListener('keydown', (event) => {
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    const form = document.getElementById('search-form');
    if (getComputedStyle(form).display === 'none') {
      toggle(document.querySelector('[data-toggle="search"]'), form);
    }
    searchInput.focus();
  }
});

// The skip link moves focus to the page content without changing the route.
document.querySelector('[data-skip]').addEventListener('click', (event) => {
  event.preventDefault();
  document.getElementById('main').focus();
});

window.addEventListener('hashchange', route);
route();
