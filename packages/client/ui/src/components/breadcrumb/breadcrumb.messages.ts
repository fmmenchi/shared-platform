import { defineMessages } from '../../i18n/messages.js';

/**
 * Breadcrumb's own micro-copy: the landmark's default name. "Breadcrumb" is
 * what the APG pattern names the landmark and what screen-reader users have
 * learned to listen for — not a metaphor to translate literally, so the
 * Italian and Arabic name the thing it is, a navigation path.
 */
export const breadcrumbMessages = defineMessages('breadcrumb', {
  en: { label: 'Breadcrumb' },
  it: { label: 'Percorso di navigazione' },
  ar: { label: 'مسار التنقل' },
});
