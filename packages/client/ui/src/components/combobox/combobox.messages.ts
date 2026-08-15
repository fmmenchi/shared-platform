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
 *
 * IT CARRIES THE QUERY, and that is not decoration either. `role="status"`
 * announces a text CHANGE, so two different searches that both leave one row
 * produced a byte-identical string, React committed no mutation, and the region
 * said nothing at all — the exact silence it exists to break.
 *
 * `list` names the listbox. On iOS VoiceOver `aria-activedescendant` is not
 * supported at all, so touch exploration is the only way through the rows, and
 * an unnamed "list box" is where they land.
 *
 * `created` IS THE COMPENSATION THE OFFER OWES. The create row wears
 * `role="option"` inside a listbox that expresses selection, so JAWS reads it as
 * "not selected" — an explicit promise that `Enter` will select it. `Enter`
 * instead closes the list and selects no option, and the field still reads the
 * text that was already there, so NOTHING changed for a screen-reader user to
 * hear: they were returned to a field with no confirmation that anything had
 * happened at all. Choosing an ordinary row needs no message because the field's
 * value changes and is announced; this is the one path where it does not.
 */
export const comboboxMessages = defineMessages('combobox', {
  en: {
    results: 'Results for “{query}”: {count}',
    empty: 'No results',
    list: 'Suggestions',
    create: 'Create “{query}”',
    created: 'Created “{query}”',
  },
  it: {
    results: 'Risultati per «{query}»: {count}',
    empty: 'Nessun risultato',
    list: 'Suggerimenti',
    create: 'Crea «{query}»',
    created: 'Creato «{query}»',
  },
  ar: {
    results: 'نتائج «{query}»: {count}',
    empty: 'لا توجد نتائج',
    list: 'اقتراحات',
    create: 'إنشاء «{query}»',
    created: 'تم إنشاء «{query}»',
  },
});
