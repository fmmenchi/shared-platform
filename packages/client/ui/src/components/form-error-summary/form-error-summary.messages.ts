import { defineMessages } from '../../i18n/messages.js';

/**
 * The summary's one piece of internal copy: the heading over the list.
 *
 * It existed as an English literal in the component — the only DS default
 * shipped outside a catalog — so an Italian app that did not pass `heading`
 * had its most critical form surface (the box that takes focus on failure)
 * announce itself in English. The prop remains the per-form override; this is
 * the default the locale resolves.
 */
export const formErrorSummaryMessages = defineMessages('formErrorSummary', {
  en: { heading: 'There is a problem' },
  it: { heading: "C'è un problema" },
  ar: { heading: 'توجد مشكلة' },
});
