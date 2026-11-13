// Claim cards and citation lists, shared by every page that shows claims.
import { el, gradeBadge, flagChip, recordLink, href, CLAIM_TYPE_LABELS, ACCESS_LABELS, tierLabel } from './components.js';

export const VERDICT_LABELS = { accepted: 'Accepted', disputed: 'Disputed', 'rejected-myth': 'Rejected' };

export function withheld(c) {
  return el('span', { class: 'withheld' }, 'Statement withheld: ', c.restricted_reason || 'restricted material.');
}

export function citationList(cites) {
  return el('ul', { class: 'citations' }, cites.map((s) => el('li', {},
    el('a', { href: href(s.source_id) }, s.title || s.source_id),
    el('span', { class: 'cite-meta' }, ` · ${tierLabel(s.tier)} · ${ACCESS_LABELS[s.access] || 'Access not recorded'}`),
    s.locator ? el('span', { class: 'cite-meta' }, ` · ${s.locator}`) : null,
    s.note ? el('span', { class: 'cite-note' }, ` (${s.note})`) : null)));
}

export function claimCard(c, { subject = false } = {}) {
  const tradition = c.claim_type === 'tradition';
  const cites = c.citations.filter((s) => s.source_type !== 'ai-generated');
  return el('article', { class: `claim${tradition ? ' claim-tradition' : ''}`, id: `claim-${c.id}`, 'data-grade': c.certainty,
    'data-type': c.claim_type, 'data-perspective': c.perspective.map((x) => x.id).join(' ') },
    el('div', { class: 'claim-head' },
      gradeBadge(c.certainty),
      el('span', { class: `type-tag type-${c.claim_type}` }, CLAIM_TYPE_LABELS[c.claim_type] || c.claim_type),
      c.verdict !== 'accepted' ? el('span', { class: `verdict-chip verdict-${c.verdict}` }, VERDICT_LABELS[c.verdict]) : null,
      el('span', { class: 'claim-field' }, (c.field || '').replace(/_/g, ' '))),
    subject && c.subject ? el('p', { class: 'claim-subject' }, 'About ', recordLink(c.subject)) : null,
    el('p', { class: 'claim-statement' }, c.restricted ? withheld(c)
      : [tradition ? el('span', { class: 'tradition-intro' }, 'Tradition: ') : null, c.statement]),
    c.bias_flags.length ? el('p', { class: 'flags' }, c.bias_flags.map(flagChip)) : null,
    c.perspective.length ? el('p', { class: 'perspective' }, 'From the perspective of: ',
      c.perspective.map((x, i) => [i ? ', ' : '', recordLink(x)])) : null,
    cites.length ? citationList(cites) : null,
    c.citations.some((s) => s.source_type === 'ai-generated')
      ? el('p', { class: 'ai-origin' }, 'Origin of this myth: AI-generated web page (not evidence)')
      : (cites.length ? null : el('p', { class: 'unknown' }, 'No source cited yet.')),
    c.evidence_status ? el('p', { class: 'evidence-status' }, c.evidence_status) : null);
}
