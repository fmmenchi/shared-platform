import {
  BORDER_WIDTH_TOKENS,
  COLOR_ROLES,
  DURATION_TOKENS,
  EASE_TOKENS,
  FONT_TOKENS,
  FONT_WEIGHT_TOKENS,
  RADIUS_TOKENS,
  SHADOW_TOKENS,
  SIZE_TOKENS,
  SPACE_TOKENS,
  TEXT_TOKENS,
  TRANSITION_TOKENS,
  Z_TOKENS,
} from './tokens.js';
import type { TokenRefGroup } from './refs.types.js';

/** One group: every name in it, mapped to the `var()` that reads it. */
const group = <const Names extends readonly string[]>(
  prefix: string,
  names: Names,
): TokenRefGroup<Names> =>
  // FROZEN HERE TOO, not only on the object below: freezing the outer one
  // leaves every group writable, which is the whole surface anybody would
  // actually reach for — `Object.assign(tokenVars.color, brand)` is what
  // somebody mistakes for a theming hook.
  Object.freeze(
    Object.fromEntries(
      names.map((name) => [name, `var(--fm-${prefix}-${name})`]),
    ),
  ) as TokenRefGroup<Names>;

/**
 * THE TOKENS, AS REFERENCES — for every consumer whose styles are written in
 * TypeScript rather than in CSS.
 *
 * `vars.color.primary` is the string `'var(--fm-color-primary)'`. Not the
 * value: the reference. Which is the whole point — a reference re-points when
 * `[data-theme]` changes, and a value copied into a template literal does not.
 *
 * WHY THIS EXISTS, given that a custom property is already the universal port.
 * Every CSS library on the web can read `var(--fm-*)`, so nothing here adds a
 * capability; what it adds is that a typo stops being a silent no-op. Written
 * by hand, `var(--fm-color-primry)` renders as nothing at all and the first
 * person to notice is looking at the screen. Written as `vars.color.primry` it
 * does not compile.
 *
 *     import { tokenVars } from '@fmmenchi/tokens';
 *
 *     const Panel = styled.section`
 *       background: ${tokenVars.color.card};
 *       color: ${tokenVars.color['card-foreground']};
 *       padding: ${tokenVars.space['inset-m']};
 *     `;
 *
 * The same string works in emotion, in vanilla-extract, in a `style={{}}` and
 * in anything else that takes a CSS value. There is no adapter per library and
 * there deliberately is not one: an adapter would mean this package importing
 * the consumer's styling library, which is what "framework-agnostic" forbids.
 *
 * NOT NAMED `t`, and not named `vars` either. `t` is what every i18n library
 * calls its translate function, and this platform ships beside one that does.
 * `vars` was worse in a quieter way: it is the canonical identifier of
 * vanilla-extract — `export const vars = createThemeContract(…)` is from their
 * own documentation — so the one audience this export names by name would have
 * collided with it on their first line. It also read ambiguously against this
 * package's own `styles/vars.css`.
 *
 * NOT VALUES. There is no `values.color.primary` here, and the reason is worth
 * knowing before asking for one: a value read at build time is the BASE theme's,
 * and a preset changes it at runtime, so the export would be right until
 * somebody switched theme. Where a real value is genuinely needed — a canvas, a
 * charting library — read it at the moment you need it:
 *
 *     getComputedStyle(el).getPropertyValue('--fm-color-primary').trim()
 *
 * with two things known first, because this package makes both of them worse
 * than they are elsewhere. A colour role is `@property`-registered, so the read
 * NEVER returns `''`: before the token stylesheet applies — or under an
 * ancestor with `all: initial` — it returns the registered `initial-value`,
 * `oklch(0 0 0)`. Registration turns a detectable failure into opaque black
 * with nothing falsy to branch on. And the serialisation is not uniform: a
 * registered role comes back computed and normalised, an unregistered token
 * comes back as the raw token stream, which Chrome and Safari prefix with a
 * space — hence the `.trim()`.
 *
 * NOT FOR REACT NATIVE. It has no custom properties at all, so
 * `'var(--fm-color-primary)'` is not a colour it can use and no DOM read exists
 * to fall back on. RN needs real values, which is a different export this
 * package does not have and would have to earn on its own terms.
 *
 * AND NOT IN A CONDITION. `var()` is invalid in a media or container query's
 * feature value, so `@media (min-width: ${tokenVars.size.container})` compiles
 * cleanly, is dropped whole by the browser, and never matches at any width —
 * the same silent class of failure this export exists to remove. Breakpoints
 * are exported as literals for exactly this: `BREAKPOINTS` and
 * `CONTAINER_BREAKPOINTS`.
 */
export const tokenVars = Object.freeze({
  color: group('color', COLOR_ROLES),
  radius: group('radius', RADIUS_TOKENS),
  space: group('space', SPACE_TOKENS),
  text: group('text', TEXT_TOKENS),
  /* The other half of the type pair. Never take one without the other — see
     the contract in AGENTS.md: an absolute leading is inherited as a frozen
     number and a descendant that changes its size keeps the ancestor's box. */
  leading: group('leading', TEXT_TOKENS),
  font: group('font', FONT_TOKENS),
  'font-weight': group('font-weight', FONT_WEIGHT_TOKENS),
  'border-width': group('border-width', BORDER_WIDTH_TOKENS),
  shadow: group('shadow', SHADOW_TOKENS),
  size: group('size', SIZE_TOKENS),
  duration: group('duration', DURATION_TOKENS),
  ease: group('ease', EASE_TOKENS),
  transition: group('transition', TRANSITION_TOKENS),
  z: group('z', Z_TOKENS),
} as const);
