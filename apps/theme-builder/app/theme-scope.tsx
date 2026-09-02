import { colorVar, type ColorRole, type Theme } from '@fmmenchi/theme';
import { useMemo, type CSSProperties, type ReactNode } from 'react';

import type { Scheme } from './declarations';

/**
 * RENDER A SUBTREE UNDER A THEME — the preview's whole mechanism.
 *
 * SCOPED, NEVER GLOBAL, and that is the point rather than a nicety: a theme with a
 * contrast pair below its floor must not take down the controls that would fix it. So
 * the wizard's own chrome stays on the reference theme and only what is inside here
 * renders under the one being built.
 *
 * IT TAKES THE RESOLVED THEME, NOT A STRING OF CSS, and the thing it replaced is
 * worth recording because the app had two docstrings arguing opposite sides.
 *
 * `draft-theme.tsx` used to hold the draft as a CSS STRING, on the argument that "the
 * wizard's state is the generated stylesheet, so what a person sees is byte-for-byte
 * what the generator writes". `export-theme.ts` says the opposite, and says it as a
 * rule: there is NO CSS emitter in this app, because the handoff is a JSON file of
 * declarations and the generator is the one thing that renders CSS — "a second
 * renderer for the same bytes would be two renderings of one decision".
 *
 * The second one is right, and the first one is why the preview never worked:
 * NOTHING EVER CALLED `setCss`. A provider, a scope, a `color-scheme` fix and three
 * specs, all for a string no code produced — the page said "No draft yet" for every
 * possible set of bases. Measured in a browser: zero elements carried the scope
 * attribute.
 *
 * So the draft is the `Theme` that `generateTheme` returns — the same object
 * `validateTheme` judges and the same one the exported declarations resolve to — and
 * it is applied as INLINE CUSTOM PROPERTIES. Three reasons that works:
 *
 *   the roles are already RESOLVED literals, so there is nothing left to cascade:
 *   a descendant's `var(--fm-color-primary)` reads what is set here and stops;
 *
 *   it renders no CSS text anywhere, so the rule in `export-theme.ts` holds and
 *   there is still exactly one renderer of a stylesheet, in the generator;
 *
 *   and the trap `scoped-theme.test.tsx` documents does not apply. A block
 *   overriding only a BASE is inert on a subtree, because the ramp already settled at
 *   `:root` — but this sets the ROLES, which is the layer components read.
 *
 * THERE IS NO PROVIDER, because there is nothing to hold. The theme is derived where
 * it is shown, from the bases and the ramp and the overrides that the build steps
 * actually write. A state container nobody writes is the thing that was here before.
 */
export function ThemeScope({
  theme,
  scheme,
  style,
  children,
  ...rest
}: {
  /** The resolved roles. `null` renders on the reference theme, untouched. */
  readonly theme: Theme | null;
  /**
   * What the BROWSER paints its own controls from — a select's popup, a native
   * checkbox. It reads nothing from the roles, so without it a dark theme previews
   * with white native lists on Safari and Firefox, which is a recorded defect of
   * hand-written presets.
   */
  readonly scheme: Scheme;
  readonly children: ReactNode;
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'children'>) {
  // MERGED, WITH THE CALLER'S STYLE FIRST. The scope has to be able to paint
  // `--fm-color-background` on itself — the page behind it belongs to the wizard's
  // chrome — and a caller writing `background: var(--fm-color-background)` needs the
  // custom properties to be set on the SAME element for that `var()` to resolve to
  // the theme rather than to the reference one. Setting them after also means a
  // caller cannot accidentally shadow a role.
  const applied = useMemo<CSSProperties>(() => {
    const merged: Record<string, unknown> = { ...style, colorScheme: scheme };
    if (theme) {
      for (const [role, value] of Object.entries(theme)) {
        merged[colorVar(role as ColorRole)] = value;
      }
    }
    return merged as CSSProperties;
  }, [theme, scheme, style]);

  return (
    // `data-theme` is NOT set: nothing selects on it here, and a value that matched
    // `[data-theme='dark']` would pull the shipped preset in over the inline
    // properties — a second theme fighting the one being previewed.
    <div {...rest} style={applied}>
      {children}
    </div>
  );
}
