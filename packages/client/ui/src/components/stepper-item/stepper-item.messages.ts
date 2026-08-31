import { defineMessages } from '../../i18n/messages.js';

/**
 * StepperItem's own micro-copy: the words that tell a reader what a step's
 * paint is telling everyone else.
 *
 * Two statuses need one. The CURRENT step is announced by
 * `aria-current="step"`, which every screen reader already renders in its own
 * words and the reader's own language — a second word beside it would be the
 * same fact twice, in a voice they did not choose. And an UPCOMING step is the
 * unmarked default: saying "not started" on every step ahead is noise that
 * grows with the sequence.
 */
export const stepperItemMessages = defineMessages('stepperItem', {
  en: { complete: 'Completed', error: 'Has an error' },
  it: { complete: 'Completato', error: 'Contiene un errore' },
  ar: { complete: 'مكتمل', error: 'يحتوي على خطأ' },
});
