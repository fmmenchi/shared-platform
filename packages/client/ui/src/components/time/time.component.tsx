import { useFormatter } from '../../formatting/use-formatter.js';
import type { TimeProps } from './time.types.js';

/**
 * A date the reader can read and a machine can parse — the same instant, twice.
 *
 * `<time>` IS THE COMPONENT. Its whole purpose is that the visible text may be
 * written any way a language writes it while `dateTime` states the instant in
 * the one grammar everything else understands: ISO 8601. Drop the attribute and
 * the element is a `<span>` with extra letters, which is what a hand-written
 * `{d.toLocaleDateString()}` leaves behind — and with it goes everything that
 * reads the attribute rather than the pixels: a calendar's "add to calendar",
 * a scraper, a translation tool, a test that wants to assert a date without
 * knowing which locale the suite happens to run in.
 *
 * THE VALUE, NOT THE STRING. There is no `children`: a component that formats
 * one thing and displays another has two answers to one question, and the one
 * on screen would be the one nobody checked. A consumer who wants a string they
 * built themselves does not want this component — they want `<time>`.
 *
 * IT DRAWS NOTHING. No class, no alignment, no tabular figures, and that is a
 * decision rather than an omission: a value cannot know whether it is standing
 * in a column of dates or inside a sentence, and those want opposite treatment.
 * The container knows — which is why `Table` applies both from the column's
 * `format`, and why this stays a bare element anywhere else.
 *
 * THE LOCALE IS THE READER'S, not the copy's: a date in a cell is not inside a
 * sentence the design system wrote. See `useFormatter`.
 */
function Time(props: TimeProps) {
  const {
    value,
    format = 'date',
    dateStyle = 'medium',
    timeStyle = 'short',
    timeZone,
    fallback = null,
    ...rest
  } = props;

  const fmt = useFormatter();

  const machine = fmt.machine(value, {
    // A DAY IS NOT AN INSTANT. `<time dateTime="2026-01-31">` says the day;
    // the full timestamp would claim a precision the reader was never shown,
    // and midnight in some zone is a moment nobody wrote down.
    dateOnly: format === 'date',
    timeZone,
  });

  const text =
    format === 'date'
      ? fmt.date(value, { dateStyle, timeZone })
      : format === 'time'
        ? fmt.time(value, { timeStyle, timeZone })
        : fmt.dateTime(value, { dateStyle, timeStyle, timeZone });

  // Both are empty for exactly the same reason — there is no instant — so one
  // check answers for both, and an element that would state nothing is never
  // rendered.
  if (machine === '') return <>{fallback}</>;

  return (
    <time {...rest} dateTime={machine}>
      {text}
    </time>
  );
}

export { Time };
