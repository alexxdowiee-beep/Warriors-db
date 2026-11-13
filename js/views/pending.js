// Placeholder for pages that later build steps add (docs/APP_BRIEF.md, "Build steps").
export function renderPending(view, title, step) {
  view.innerHTML = '';
  const h1 = document.createElement('h1');
  h1.className = 'page-title';
  h1.textContent = title;
  const p = document.createElement('p');
  p.className = 'notice';
  p.textContent = step ? `This page is built in step ${step}.` : 'There is no page at this address.';
  view.append(h1, p);
  document.title = `${title} · Warriors & Leaders`;
}
