/**
 * A group of token references: the token's own name, mapped to the `var()`
 * that reads it.
 *
 * The key is the TOKEN NAME, kebab and all — `'primary-foreground'`, not
 * `primaryForeground`. Searching `primary-foreground` finds the CSS, the
 * contract in `tokens.ts` and the call site in a consumer's styled-component,
 * because all three spell it the same. A camelCase key would read better and
 * would be a second vocabulary to keep in step with the first, which is the
 * kind of translation that quietly diverges.
 */
export type TokenRefGroup<Names extends readonly string[]> = {
  readonly [K in Names[number]]: string;
};
