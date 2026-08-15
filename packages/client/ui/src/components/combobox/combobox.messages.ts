import { defineMessages } from '../../i18n/messages.js';

/**
 * The combobox's own two words, and there are only two because everything else
 * it says is the consumer's: the field's label, the options' text.
 *
 * `results` IS THE COMPONENT'S REASON TO SPEAK. Typing narrows the list, and a
 * list narrowing is silent — the rows change and a screen-reader user is told
 * nothing at all. It goes to a live region beside the field.
 *
 * NO PLURAL, and that is a decision rather than an oversight: this package
 * defers plural rules (ADR-0026), and a message written "{count} results" is
 * wrong at one in English, wrong differently in Italian, and wrong six ways in
 * Arabic. Label-then-number inflects in none of them, says the same thing, and
 * needs no rule — so the deferral costs nothing here instead of being worked
 * around with a hand-rolled two-form plural that only covers two of the three
 * locales this catalogue already ships.
 */
export const comboboxMessages = defineMessages('combobox', {
  en: {
    results: 'Results: {count}',
    empty: 'No results',
  },
  it: {
    results: 'Risultati: {count}',
    empty: 'Nessun risultato',
  },
  ar: {
    results: 'النتائج: {count}',
    empty: 'لا توجد نتائج',
  },
});
