// Timeline drawing shared by the profile strip (step 3) and the world timeline (step 4).
// The axis is proportional to real dates (astronomical years, used only for positions).
import { el } from './components.js';

export function domain(people) {
  const starts = people.map((p) => p.earliest).filter(Number.isInteger);
  const ends = people.map((p) => p.latest).filter(Number.isInteger);
  // Round outward to whole centuries as displayed (700 BCE is astronomical -699).
  const lo = Math.floor((Math.min(...starts) - 100) / 100) * 100 + 1;
  const hi = Math.ceil((Math.max(...ends) + 100) / 100) * 100;
  return [lo, hi];
}

export function yearLabel(y) {
  // astronomical year -> display year, for axis ticks only
  return y <= 0 ? `${1 - y} BCE` : `${y} CE`;
}

// Slim strip: era bands, every person as a faint tick, one person highlighted.
export function timelineStrip({ timeline, eras, highlightId }) {
  const people = timeline.people;
  const [lo, hi] = domain(people);
  const pos = (y) => ((y - lo) / (hi - lo)) * 100;
  const target = people.find((p) => p.id === highlightId);
  const strip = el('div', { class: 'tl-strip', role: 'img',
    'aria-label': target ? `Timeline: ${target.name}, active ${target.display}, grade ${target.certainty}` : 'Timeline' });
  for (const era of eras) {
    const a = Math.max(era.earliest ?? lo, lo);
    const b = Math.min((era.latest ?? hi) + 1, hi);
    if (b <= a) continue;
    strip.append(el('div', {
      class: `tl-era${target && target.era === era.key ? ' tl-era-active' : ''}`,
      style: `left:${pos(a)}%;width:${pos(b) - pos(a)}%`,
    }, el('span', { class: 'tl-era-label' }, era.label)));
  }
  for (const p of people) {
    if (!Number.isInteger(p.earliest) || !Number.isInteger(p.latest)) continue;
    const hl = p.id === highlightId;
    strip.append(el('div', {
      class: hl ? 'tl-bar tl-bar-active' : 'tl-bar',
      style: `left:${pos(p.earliest)}%;width:max(4px, ${pos(p.latest + 1) - pos(p.earliest)}%)`,
      title: `${p.name}: ${p.display}`,
    }));
  }
  const axis = el('div', { class: 'tl-axis', 'aria-hidden': 'true' },
    el('span', {}, yearLabel(lo)), el('span', {}, yearLabel(hi)));
  return el('div', { class: 'tl-wrap' }, strip, axis);
}
