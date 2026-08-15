import type { ComponentPropsWithRef } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { inputVariants } from './input.variants.js';

/** Variant axis (`size`), derived from the cva definition. */
export type InputVariants = VariantProps<typeof inputVariants>;

/**
 * Public Input props: a transparent native `<input>` (ADR-0013). Every native
 * attribute and `ref` passes through, and `value`/`onChange` are never hijacked,
 * so it drops into any form library. `size` is the DS sizing axis and therefore
 * shadows the (rarely-used) native `size` attribute. Set `aria-invalid` for the
 * error styling.
 */
/**
 * Every native input type except `date` and `time`, written out rather than
 * derived.
 *
 * `Exclude<HTMLInputTypeAttribute, 'date'>` looks like the way to say this and
 * removes nothing: React closes that union with `(string & {})`, so `"date"`
 * stays assignable and the `Omit` would be decoration. Checked in the installed
 * `@types/react` rather than recalled.
 *
 * The cost of an allowlist is that it must be extended by hand the day the
 * platform adds a type, and that is stated in ADR-0027 alongside the reason it
 * is worth paying: neither native control can be told which locale to lay its
 * segments out in, so on a page whose language the app declares each
 * contradicts every other date or time on it — silently, with no test going
 * red. `DateInput` and `TimeInput` are the replacements.
 *
 * TIME WAS ADDED SECOND, and on its own measurement rather than on the date's
 * precedent, which is what the first exception asked of the next one. Measured:
 * a native time field draws `14:30` under `en-US`, `it-IT`, `ja-JP` and `ar-EG`
 * alike while `Intl` writes `02:30 PM` for the first and `٠٢:٣٠ م` for the last
 * — and it does not follow even the locale the engine reports, but the
 * operating system's regional format. That last part makes it worse than the
 * date case: a developer whose machine matches their page sees nothing wrong.
 */
export type InputType =
  | 'button'
  | 'checkbox'
  | 'color'
  | 'datetime-local'
  | 'email'
  | 'file'
  | 'hidden'
  | 'image'
  | 'month'
  | 'number'
  | 'password'
  | 'radio'
  | 'range'
  | 'reset'
  | 'search'
  | 'submit'
  | 'tel'
  | 'text'
  | 'url'
  | 'week';

export type InputProps = InputVariants &
  Omit<ComponentPropsWithRef<'input'>, keyof InputVariants | 'type'> & {
    /**
     * Every native type but `date` and `time` — reach for `DateInput` and
     * `TimeInput` (ADR-0027).
     *
     * This is the one exception to the transparency the rest of this contract
     * is built on, and it stays narrow: `checkbox`, `range` and `radio` still
     * pass through though `Checkbox`, `Slider` and `Radio` exist, because those
     * are duplicative rather than wrong on the page.
     */
    type?: InputType;
  };
