/**
 * WHAT YOU DO WITH A THEME — the four operations, and nothing else.
 *
 *   parseTheme(...css)    stylesheets  -> the `--fm-*` declarations in them
 *   toTheme(declared)     declarations -> a theme: every role, resolved
 *   toCssVars(theme)      a theme      -> a stylesheet
 *   validateTheme(theme)  a theme      -> what is wrong with it
 *
 * A pipeline one way and one function back out. Everything else in this folder is
 * HOW they work — reading declarations, resolving a `var()` chain, measuring a
 * contrast — and none of it is a concept a caller needs a name for. That is why
 * they are in here rather than in folders of their own: `read-vars` and `resolve`
 * were top-level for a while, and promoting plumbing to a concept is what made
 * this package unreadable.
 *
 * A barrel: re-exports only.
 */

export { parseTheme, toTheme, toCssVars } from './operations.js';
export { validateTheme, themeAdvisories, CONTRAST_PAIRS } from './validate.js';
export type {
  ThemeViolation,
  ThemeAdvisory,
  ViolationKind,
} from './validate.types.js';
