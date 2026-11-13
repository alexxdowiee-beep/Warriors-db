// A small Markdown renderer for the profile text in the data bundle. It escapes HTML first,
// then supports what the profiles use: paragraphs, **bold**, *italic*, [links](https://…),
// lists, tables and "**Heading**" paragraphs. A bare single-grade marker in brackets, e.g. "(B)",
// becomes an inline grade badge; other markers such as "(A as tradition)" are left as written.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (s) => s.replace(/[&<>"']/g, (c) => ESC[c]);
const LABELS = { A: 'Established', B: 'Probable', C: 'Disputed', D: 'Weak', E: 'Legendary or false' };

function badge(g) {
  return `<span class="grade grade-${g.toLowerCase()} grade-inline" title="Grade ${g}: ${LABELS[g]}">` +
    `<span class="grade-letter" aria-hidden="true">${g}</span>` +
    `<span class="visually-hidden">grade ${g}, ${LABELS[g]}</span></span>`;
}

function inline(text) {
  let s = escape(text.replace(/\\([_*|])/g, '$1'));
  // links: only http(s); opened in a new tab
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_m, t, u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\(([A-E])\)/g, (_m, g) => badge(g));
  return s;
}

function table(lines) {
  const rows = lines.filter((l) => !/^[\s|:-]+$/.test(l)); // drop the | --- | separator row
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => inline(c.trim()));
  const [head, ...body] = rows;
  return '<div class="table-scroll"><table class="data-table"><thead><tr>' +
    cells(head).map((c) => `<th scope="col">${c}</th>`).join('') + '</tr></thead><tbody>' +
    body.map((r) => '<tr>' + cells(r).map((c) => `<td>${c}</td>`).join('') + '</tr>').join('') +
    '</tbody></table></div>';
}

export function renderMarkdown(text, { headingLevel = 3 } = {}) {
  const blocks = String(text || '').replace(/\r\n/g, '\n').split(/\n{2,}/);
  const out = [];
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;
    const lines = block.split('\n');
    if (lines.every((l) => l.trim().startsWith('|'))) {
      out.push(table(lines));
    } else if (lines.every((l) => /^\s*[-*] /.test(l) || /^\s{2,}\S/.test(l))) {
      out.push('<ul>' + joinItems(lines, /^\s*[-*] /).map((i) => `<li>${inline(i)}</li>`).join('') + '</ul>');
    } else if (lines.every((l) => /^\s*\d+\. /.test(l) || /^\s{2,}\S/.test(l))) {
      out.push('<ol>' + joinItems(lines, /^\s*\d+\. /).map((i) => `<li>${inline(i)}</li>`).join('') + '</ol>');
    } else if (/^\*\*[^*]+\*\*$/.test(block)) {
      out.push(`<h${headingLevel} class="sub-heading">${inline(block.slice(2, -2))}</h${headingLevel}>`);
    } else if (/^#{1,6} /.test(block)) {
      out.push(`<h${headingLevel} class="sub-heading">${inline(block.replace(/^#{1,6} /, ''))}</h${headingLevel}>`);
    } else {
      out.push(`<p>${lines.map(inline).join('<br>')}</p>`);
    }
  }
  return out.join('\n');
}

function joinItems(lines, marker) {
  const items = [];
  for (const l of lines) {
    if (marker.test(l)) items.push(l.replace(marker, ''));
    else items[items.length - 1] += ` ${l.trim()}`;
  }
  return items;
}

export function markdownBlock(text, opts) {
  const div = document.createElement('div');
  div.className = 'prose';
  div.innerHTML = renderMarkdown(text, opts);
  return div;
}
