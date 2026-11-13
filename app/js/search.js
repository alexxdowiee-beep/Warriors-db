// Search over search.json: every name of every record, folded the same way as the exporter
// (lower case, diacritics removed), so "tran hung dao" finds Trần Hưng Đạo.
import { getJSON } from './data.js';

const SPECIAL = { đ: 'd', ð: 'd', ł: 'l', ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', þ: 'th', ı: 'i' };

export function fold(text) {
  return [...String(text).toLowerCase()].map((ch) => SPECIAL[ch] ?? ch).join('')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

// Every word of the query must appear in one of the record's names. Exact and prefix matches rank first.
export async function search(query) {
  const q = fold(query);
  if (!q) return [];
  const words = q.split(' ');
  const entries = await getJSON('search.json');
  const results = [];
  for (const e of entries) {
    let best = null;
    e.folded.forEach((name, i) => {
      if (!words.every((w) => name.includes(w))) return;
      const score = name === q ? 0 : name.startsWith(q) ? 1 : name.split(' ').some((t) => t.startsWith(words[0])) ? 2 : 3;
      if (best === null || score < best.score) best = { score, matched: e.names[i] };
    });
    if (best) results.push({ ...e, ...best });
  }
  return results.sort((a, b) => a.score - b.score || a.label.localeCompare(b.label));
}
