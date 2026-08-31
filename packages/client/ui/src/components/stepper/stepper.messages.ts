import { defineMessages } from '../../i18n/messages.js';

/**
 * Stepper's own micro-copy: the landmark's default name.
 *
 * "Progress" names what the reader is being told — where they are in a
 * sequence they are working through. Not "Stepper": that is the name of the
 * widget, and a landmark is announced to someone who cannot see it, for whom
 * "navigation, Stepper" says nothing about what it navigates.
 */
export const stepperMessages = defineMessages('stepper', {
  en: { label: 'Progress' },
  it: { label: 'Avanzamento' },
  ar: { label: 'التقدم' },
});
