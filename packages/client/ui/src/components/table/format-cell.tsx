import type { ReactNode } from 'react';
import { Time } from '../time/time.component.js';
import { Numeric } from '../numeric/numeric.component.js';
import type { ColumnFormat } from './column-format.types.js';
import type { TableAlign } from './table.types.js';

/**
 * A column's `format`, turned into a cell.
 *
 * ONE PLACE, because the same three answers are needed twice — the value, the
 * alignment, and whether the digits are tabular — and computed in three places
 * they would drift the first time one of them gained a kind.
 */

/**
 * Which edge a formatted column sits against, when it has not been told.
 *
 * NUMBERS GO TO THE END and everything else starts where the text starts. This
 * is the fact that made `format` worth having beyond a formatter call: today a
 * caller writes `align: 'end'` beside every numeric column, which is one
 * decision copied per column, and the column list exists precisely so that a
 * per-column decision is declared once.
 *
 * A date is deliberately NOT an end-aligned column. Its formatted text is
 * words plus digits of uneven length, and pushed to the end it makes a ragged
 * left edge the reader scans against — which is why every reference table
 * (Material, Carbon, Fluent) aligns dates like text and only numbers like
 * numbers.
 *
 * `align` on the column still wins. A stated decision beats a derived one.
 */
export function alignFor(format: ColumnFormat): TableAlign {
  return format.kind === 'date' ||
    format.kind === 'dateTime' ||
    format.kind === 'time'
    ? 'start'
    : 'end';
}

/**
 * Nothing here sets TABULAR FIGURES, and the reason is worth writing down
 * because the opposite looks obviously right: `.table` already sets
 * `font-variant-numeric: tabular-nums` on itself, so every cell in every table
 * has them. Marking a formatted cell as well would be a second owner for a fact
 * that already has one — and the first thing a second owner does is disagree.
 *
 * The property still belongs to the COLUMN rather than to the value, which is
 * why neither `Time` nor `Numeric` sets it either: in running text the same
 * feature is wrong, and a leaf cannot know which of the two it is standing in.
 */

/** The cell's content for a formatted column. */
export function formatCell(format: ColumnFormat, value: unknown): ReactNode {
  switch (format.kind) {
    case 'date':
    case 'dateTime':
    case 'time':
      return (
        <Time
          value={value as never}
          format={format.kind}
          dateStyle={format.dateStyle}
          timeStyle={format.timeStyle}
          timeZone={format.timeZone}
        />
      );
    case 'currency':
      return (
        <Numeric
          value={value as number | null | undefined}
          format="currency"
          currency={format.currency}
          currencyDisplay={format.display}
          minimumFractionDigits={format.minimumFractionDigits}
          maximumFractionDigits={format.maximumFractionDigits}
        />
      );
    case 'percent':
      return (
        <Numeric
          value={value as number | null | undefined}
          format="percent"
          scale={format.scale}
          minimumFractionDigits={format.minimumFractionDigits}
          maximumFractionDigits={format.maximumFractionDigits}
        />
      );
    default:
      return (
        <Numeric
          value={value as number | null | undefined}
          format={format.kind}
          grouping={format.grouping}
          minimumFractionDigits={format.minimumFractionDigits}
          maximumFractionDigits={format.maximumFractionDigits}
        />
      );
  }
}
