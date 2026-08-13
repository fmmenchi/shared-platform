import { useMemo } from 'react';
import { createFormatter, type Formatter } from '@fmmenchi/formatting';
import {
  useCopyLocale,
  useFormattingDefaults,
  useUiAdapters,
} from '../i18n/provider.js';

/**
 * The shared formatter, bound to the locale the provider already holds.
 *
 * THE DESIGN SYSTEM DOES NOT FORMAT ANYTHING ITSELF — `@fmmenchi/formatting`
 * does, because an export, a PDF and a screen have to produce the same string
 * and only one of the three can afford React. This file is the binding and
 * nothing else: it answers the locale question, which is the one thing a pure
 * package cannot.
 *
 * BOTH ARE TOLERANT OF NO PROVIDER, like `useDirection` and unlike `useUi`.
 * `Table` renders without one, and a formatted column must not be the single
 * thing in it that suddenly requires the wrapper — the reader would meet a
 * blank page, not a fallback.
 *
 * TWO HOOKS, BECAUSE THERE ARE TWO LOCALE QUESTIONS, and they have different
 * right answers. See `useCopyLocale` for the full argument; in short, with
 * `de-DE` injected and no German catalog the copy falls back to English while
 * `Intl` still writes `2.450`, which an English reader parses as
 * two-point-four-five.
 *
 * - `useFormatter` — the READER's locale. For a value that stands on its own:
 *   a cell, a badge, an amount, a date.
 * - `useCopyFormatter` — the SENTENCE's locale. For a value interpolated into
 *   the design system's own copy.
 */

/** For a value that stands on its own. */
export function useFormatter(): Formatter {
  const locale = useUiAdapters()?.i18n.locale;
  const formatting = useFormattingDefaults();
  return useMemo(
    () => createFormatter(locale, formatting),
    [locale, formatting],
  );
}

/** For a value going inside a sentence the design system wrote. */
export function useCopyFormatter(): Formatter {
  const locale = useCopyLocale();
  const formatting = useFormattingDefaults();
  return useMemo(
    () => createFormatter(locale, formatting),
    [locale, formatting],
  );
}
