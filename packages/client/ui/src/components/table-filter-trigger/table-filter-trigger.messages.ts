import { defineMessages } from '../../i18n/messages.js';

/**
 * The trigger's own copy, and the reason it is not `table`'s: this control
 * exists once per filterable column and says nothing the table says. What it
 * shares with the toolbar is the FACT, not the sentence — the toolbar states
 * what is in force over the whole view, this one names one column's control.
 *
 * `activeName` PUTS THE STATE IN THE NAME, which is the whole accessibility
 * argument for the design. "Is this column filtered" rendered as a tinted glyph
 * is information carried by colour alone; carried by the accessible name it
 * reaches everybody, and the visible value beside it becomes a convenience
 * rather than the only channel.
 */
export const tableFilterTriggerMessages = defineMessages('tableFilterTrigger', {
  en: {
    name: 'Filter {column}',
    activeName: 'Filter {column}, currently {value}',
    heading: 'Filter {column}',
    apply: 'Apply',
    clear: 'Clear',
  },
  it: {
    name: 'Filtra {column}',
    activeName: 'Filtra {column}, attualmente {value}',
    heading: 'Filtra {column}',
    apply: 'Applica',
    clear: 'Annulla',
  },
  ar: {
    name: 'تصفية {column}',
    activeName: 'تصفية {column}، حاليًا {value}',
    heading: 'تصفية {column}',
    apply: 'تطبيق',
    clear: 'مسح',
  },
});
