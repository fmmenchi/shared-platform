import { defineMessages } from '../../i18n/messages.js';

/**
 * The handle's own copy.
 *
 * `hint` IS NOT DECORATION. Dragging a border is discoverable by looking at it;
 * the two ways that exist for people who cannot drag are not, and WCAG 2.5.7 is
 * satisfied by a path nobody can find only on paper. It is the control's
 * description, so it is announced after the name and read once.
 *
 * `value` says pixels because pixels are what the reader is choosing — the
 * width is measured off the rendered column, not converted into whatever unit
 * the column happened to declare.
 */
export const tableColumnResizerMessages = defineMessages('tableColumnResizer', {
  en: {
    name: 'Resize {column}',
    hint: 'Arrow keys resize. Click once to adjust with the pointer, click again to finish.',
    value: '{width} pixels',
    adjusting:
      'Adjusting {column}. Move the pointer, then click to finish, or press Escape to cancel.',
  },
  it: {
    name: 'Ridimensiona {column}',
    hint: 'Le frecce ridimensionano. Un clic per regolare col puntatore, un altro per finire.',
    value: '{width} pixel',
    adjusting:
      'Regolazione di {column}. Muovi il puntatore, poi fai clic per finire, o premi Esc per annullare.',
  },
  ar: {
    name: 'تغيير حجم {column}',
    hint: 'مفاتيح الأسهم تغيّر الحجم. انقر مرة للضبط بالمؤشر، ثم انقر مرة أخرى للإنهاء.',
    value: '{width} بكسل',
    adjusting:
      'ضبط {column}. حرّك المؤشر ثم انقر للإنهاء، أو اضغط Escape للإلغاء.',
  },
});
