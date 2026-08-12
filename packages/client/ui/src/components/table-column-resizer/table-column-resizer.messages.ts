import { defineMessages } from '../../i18n/messages.js';

/**
 * The handle's own copy.
 *
 * `hint` IS NOT DECORATION. Dragging a border is discoverable by looking at it;
 * the two ways that exist for people who cannot drag are not, and WCAG 2.5.7 is
 * satisfied by a path nobody can find only on paper. It is the control's
 * description, so it is announced after the name and read once.
 *
 * IT NAMES EVERY KEY, which the first version did not: it mentioned "arrow
 * keys" and stopped, leaving `Shift`, `Home`, `End` and `Enter` undocumented —
 * and `End` is the one that takes the whole table while `Enter` is the only way
 * back from it.
 *
 * AND ONLY THE KEYS THAT DO SOMETHING. `onReset` is optional, `Enter` is wired
 * to it and nothing else, so on a resizer without one the single hint promised
 * a way back from `End` that did not exist — announced to precisely the reader
 * who cannot check by looking. Two variants rather than one sentence appended,
 * because the clause sits mid-list in all three languages and moving it to the
 * end to make it removable would read worse in each of them.
 *
 * `value` says pixels because pixels are what the reader is choosing — the
 * width is measured off the rendered column, not converted into whatever unit
 * the column happened to declare.
 */
export const tableColumnResizerMessages = defineMessages('tableColumnResizer', {
  en: {
    name: 'Resize {column}',
    hint: 'Left and right arrows resize, with Shift for a larger step. Home for the narrowest, End for the widest. Or press the handle once, then press where the border should go.',
    hintWithReset:
      'Left and right arrows resize, with Shift for a larger step. Home for the narrowest, End for the widest, Enter to restore. Or press the handle once, then press where the border should go.',
    value: '{width} pixels',
    adjusting:
      'Placing the border of {column}. Press where it should go, or press Escape to cancel.',
  },
  it: {
    name: 'Ridimensiona {column}',
    hint: 'Frecce sinistra e destra ridimensionano, con Maiusc per un passo maggiore. Home per la più stretta, Fine per la più larga. Oppure premi la maniglia una volta, poi premi dove va il bordo.',
    hintWithReset:
      'Frecce sinistra e destra ridimensionano, con Maiusc per un passo maggiore. Home per la più stretta, Fine per la più larga, Invio per ripristinare. Oppure premi la maniglia una volta, poi premi dove va il bordo.',
    value: '{width} pixel',
    adjusting:
      'Posizionamento del bordo di {column}. Premi dove deve andare, o premi Esc per annullare.',
  },
  ar: {
    name: 'تغيير حجم {column}',
    hint: 'سهما اليسار واليمين يغيّران الحجم، ومع Shift بخطوة أكبر. Home للأضيق، End للأوسع. أو اضغط المقبض مرة، ثم اضغط حيث يجب أن يكون الحد.',
    hintWithReset:
      'سهما اليسار واليمين يغيّران الحجم، ومع Shift بخطوة أكبر. Home للأضيق، End للأوسع، Enter للاستعادة. أو اضغط المقبض مرة، ثم اضغط حيث يجب أن يكون الحد.',
    value: '{width} بكسل',
    adjusting:
      'تحديد موضع حد {column}. اضغط حيث يجب أن يكون، أو اضغط Escape للإلغاء.',
  },
});
