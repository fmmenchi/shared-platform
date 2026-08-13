import { useFormatter } from '../../formatting/use-formatter.js';
import type { NumericProps } from './numeric.types.js';

/**
 * A number the reader can read and a machine can parse — the same value, twice.
 *
 * `<data>` IS THE COMPONENT, and it is the exact counterpart of `<time>`: an
 * element whose `value` states the machine-readable form while its text says it
 * the way a language says it. `1.234,5` and `1,234.5` are the same number and
 * neither is parseable without knowing which locale wrote it; `value="1234.5"`
 * is, always. That matters the moment anything reads the DOM rather than looks
 * at it — a copy-to-clipboard, a chart built from a table, an end-to-end test
 * that would otherwise have to know the runtime's locale to assert an amount.
 *
 * IT IS A LEAF AND IT DRAWS NOTHING. No alignment and no tabular figures here,
 * for the reason `Time` gives: a value cannot know whether it stands in a
 * column or in a sentence, and the two want opposite treatment. `Table` applies
 * both from the column's `format`, which is the layer that can see the column.
 *
 * ZERO IS RENDERED. The formatter is the one that guarantees it, and it is
 * worth repeating where somebody might add a `value &&` guard: a balance of
 * zero shown as an empty cell reads as missing data.
 */
function Numeric(props: NumericProps) {
  const {
    value,
    format = 'number',
    currency,
    scale,
    grouping,
    minimumFractionDigits,
    maximumFractionDigits,
    currencyDisplay,
    fallback = null,
    ...rest
  } = props;

  const fmt = useFormatter();
  const digits = { minimumFractionDigits, maximumFractionDigits };

  const text =
    format === 'integer'
      ? fmt.integer(value, { grouping })
      : format === 'currency'
        ? fmt.currency(value, currency, {
            ...digits,
            display: currencyDisplay,
          })
        : format === 'percent'
          ? fmt.percent(value, { ...digits, scale })
          : fmt.number(value, { ...digits, grouping });

  // Empty means one of two things and both end here: there is no number, or
  // there is one and no currency to write it in — and an amount with a guessed
  // currency is a different number, so nothing is the honest output.
  if (text === '') return <>{fallback}</>;

  // NOT THE FORMATTED STRING. `value` is the machine's copy, so it is the
  // number as JavaScript writes it — never the reader's separators, which is
  // what makes it parseable at all.
  return (
    <data {...rest} value={String(value)}>
      {text}
    </data>
  );
}

export { Numeric };
