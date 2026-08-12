/**
 * The formatters, built once and kept.
 *
 * `Intl.DateTimeFormat` and `Intl.NumberFormat` are expensive to construct and
 * cheap to reuse — the same trade `Intl.Collator` makes, and the reason this
 * file exists rather than each caller writing `new Intl.…` where it stands. A
 * table of a thousand rows with three formatted columns constructs three
 * thousand of them per render otherwise; the cost is measured in the spec
 * beside this file rather than asserted here.
 *
 * THE TAG IS CANONICALISED, because `de-DE`, `de-de` and `DE-de` are one locale
 * and three cache keys otherwise — and because `en_US`, the form that arrives
 * from a Java or POSIX backend, makes the constructor THROW. Uncaught inside a
 * cell renderer that is an exception mid-render; here it falls back to the
 * runtime default instead.
 *
 * AND THE CACHE IS CAPPED, for the reason the collator's is: this package is
 * committed to running in a long-lived Node process, where the locale can come
 * from `Accept-Language` — which is to say from the request.
 * `de-DE-u-nu-arab-x-a…` are all valid, all distinct, and an unbounded map
 * keyed on request input is unbounded growth keyed on request input.
 */

/**
 * `Intl.NumberFormatOptions`, plus the `useGrouping` the runtime accepts.
 *
 * ES2023 widened `useGrouping` from a boolean to `'auto' | 'always' | 'min2' |
 * boolean`, and the distinction is load-bearing here — `true` means ALWAYS and
 * overrides the `minimumGroupingDigits` a language declares, which is a
 * separator an Italian reader is not supposed to see (see
 * `FormatNumberOptions.grouping`). The workspace compiles against `lib:
 * es2022`, so the type is stated here rather than by widening the lib for
 * every package to type one option in this one.
 */
export type NumberFormatOptions = Omit<
  Intl.NumberFormatOptions,
  'useGrouping'
> & {
  useGrouping?: boolean | 'auto' | 'always' | 'min2';
};

/** How many of each kind to keep. */
const MAX_CACHED_FORMATS = 50;

const dateFormats = new Map<string, Intl.DateTimeFormat>();
const numberFormats = new Map<string, Intl.NumberFormat>();

/**
 * The locale as `Intl` would agree to spell it, or `undefined` for "whatever
 * this runtime defaults to".
 */
export function canonicalLocale(locale?: string): string | undefined {
  if (locale === undefined) return undefined;
  try {
    return Intl.getCanonicalLocales(locale)[0];
  } catch {
    return undefined;
  }
}

/**
 * One string for one formatter.
 *
 * The entries are SORTED, because `{ dateStyle, timeZone }` and
 * `{ timeZone, dateStyle }` describe the same formatter and would otherwise
 * build two — and `undefined` entries are dropped, so an option left out and
 * an option passed explicitly as `undefined` do not build two either.
 */
function keyOf(
  tag: string | undefined,
  options: Record<string, unknown>,
): string {
  const entries = Object.entries(options)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, value]) => `${name}=${String(value)}`);
  return `${tag ?? ''}|${entries.join(',')}`;
}

/**
 * OLDEST OUT, one at a time. Emptying the map instead is a cache that stops
 * working under exactly the load it was capped for. A `Map` iterates in
 * insertion order, so its first key is the oldest.
 */
function keep<T>(store: Map<string, T>, key: string, value: T): T {
  if (store.size >= MAX_CACHED_FORMATS) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, value);
  return value;
}

/** A date formatter, reused. */
export function getDateTimeFormat(
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const tag = canonicalLocale(locale);
  const key = keyOf(tag, options as Record<string, unknown>);
  const cached = dateFormats.get(key);
  if (cached) return cached;
  return keep(dateFormats, key, new Intl.DateTimeFormat(tag, options));
}

/** A number formatter, reused. */
export function getNumberFormat(
  locale: string | undefined,
  options: NumberFormatOptions,
): Intl.NumberFormat {
  const tag = canonicalLocale(locale);
  const key = keyOf(tag, options as Record<string, unknown>);
  const cached = numberFormats.get(key);
  if (cached) return cached;
  return keep(
    numberFormats,
    key,
    new Intl.NumberFormat(tag, options as Intl.NumberFormatOptions),
  );
}

/** Forget everything — so a test measures what it thinks it is measuring. */
export function clearFormatCache(): void {
  dateFormats.clear();
  numberFormats.clear();
}
