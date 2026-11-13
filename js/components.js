// Shared building blocks. Everything is built with DOM methods (textContent), so data is never
// interpreted as HTML except through markdown.js, which escapes first.

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export const GRADE_LABELS = { A: 'Established', B: 'Probable', C: 'Disputed', D: 'Weak', E: 'Legendary or false' };

// Grade badge: always shows the letter; the label is shown where space allows and is always
// available to screen readers.
export function gradeBadge(grade, { label = false, title = null } = {}) {
  if (!grade) {
    return el('span', { class: 'grade grade-none', title: 'No grade recorded' }, 'not graded');
  }
  const text = GRADE_LABELS[grade] || '';
  return el('span', { class: `grade grade-${grade.toLowerCase()}`, title: title || `Grade ${grade}: ${text}` },
    el('span', { class: 'grade-letter', 'aria-hidden': 'true' }, grade),
    label ? el('span', { class: 'grade-label', 'aria-hidden': 'true' }, text) : null,
    el('span', { class: 'visually-hidden' }, `grade ${grade}, ${text}`));
}

export const STATUS_LABELS = { draft: 'Draft', sourced: 'Sourced', verified: 'Verified', reviewed: 'Reviewed' };

export function statusChip(status) {
  return el('span', { class: `status-chip status-${status}` }, STATUS_LABELS[status] || status || 'Unknown');
}

export function flagChip(flag) {
  return el('span', { class: 'flag-chip' }, flag.replace(/-/g, ' '));
}

export const CLAIM_TYPE_LABELS = { event: 'Event', tradition: 'Tradition', text: 'Text', interpretation: 'Interpretation' };
export const ACCESS_LABELS = {
  opened: 'Opened', excerpt: 'Excerpt', 'via-secondary': 'Via a secondary source', 'not-opened': 'Not yet consulted',
};
export const TIER_LABELS = {
  scholarly: 'Scholarly', reference: 'Reference', popular: 'Popular', aggregator: 'Aggregator',
  'ai-generated': 'AI-generated',
};

export function tierLabel(tier) {
  return tier ? TIER_LABELS[tier] || tier : 'Primary material';
}

const ROUTE_OF = { PER: 'person', BAT: 'battle', WAR: 'war', SRC: 'source', POL: 'polity', PLC: 'place',
  CIV: 'civilisation', WRK: 'work' };

export function href(id) {
  return `#/${ROUTE_OF[id.slice(0, 3)]}/${id}`;
}

export function recordLink(ref) {
  if (!ref) return el('span', { class: 'unknown' }, 'not yet recorded');
  return el('a', { href: href(ref.id) }, ref.name || ref.id);
}

// A date or period with its own grade: "c. 1162 or 1165 · C". Astronomical years are never shown.
export function datedValue(date) {
  if (!date || !date.display) return el('span', { class: 'unknown' }, 'not yet recorded');
  return el('span', { class: 'dated' }, el('span', {}, date.display), ' ', gradeBadge(date.certainty));
}

export function unknown(text = 'unknown') {
  return el('span', { class: 'unknown' }, text);
}

// BCP 47 codes for the language names used in the data, so names get a correct lang attribute.
const LANG_CODES = {
  Vietnamese: 'vi', Māori: 'mi', Mongolian: 'mn', Chinese: 'zh', Persian: 'fa', Arabic: 'ar', Latin: 'la',
  Greek: 'el', French: 'fr', Japanese: 'ja', Spanish: 'es', Ukrainian: 'uk',
};

export function langOf(language) {
  return LANG_CODES[language] || null;
}

export function panel(title, ...children) {
  const id = `panel-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return el('section', { class: 'panel rail-panel', 'aria-labelledby': id },
    el('h2', { class: 'label', id }, title), ...children);
}
