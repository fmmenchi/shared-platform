import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * THE DRAFT THEME — the thing being built, and the wizard's whole state.
 *
 * It is a STRING OF CSS, not an object, and that is the decision ADR-0033 rests
 * on: the wizard's state is the generated stylesheet, so what a person sees in
 * the preview is byte-for-byte what the generator will write into a repo. Any
 * other shape means the preview shows a rendering of the state while the file
 * shows a rendering of a rendering, and the two can disagree without anything
 * failing.
 *
 * SCOPED, NOT GLOBAL. The CSS is emitted inside `[data-theme='draft']` and
 * applied to a subtree, never to `:root`. That is what lets the wizard's own
 * chrome stay on the reference theme while the preview renders under the draft:
 * a theme with a failing contrast pair must not take down the controls that would
 * fix it.
 *
 * The mechanic is measured, not assumed — `scoped-theme.test.tsx` in
 * `@fmmenchi/ui` proves it, and proves the trap next to it: a custom property
 * resolves WHERE IT IS DECLARED, so a block overriding only a BASE is inert on a
 * subtree, because the ramp already settled at `:root`. A draft therefore has to
 * carry its bases AND its ramp AND its roles, which is exactly what the generator
 * emits, so nothing special is needed here beyond scoping it.
 */
interface DraftTheme {
  /** The generated stylesheet. Empty means "no draft yet": the reference theme shows. */
  readonly css: string;
  readonly setCss: (css: string) => void;
}

const DraftThemeContext = createContext<DraftTheme | undefined>(undefined);

export function DraftThemeProvider({ children }: { children: ReactNode }) {
  const [css, setCss] = useState('');
  const value = useMemo(() => ({ css, setCss }), [css]);

  return (
    <DraftThemeContext.Provider value={value}>
      {children}
    </DraftThemeContext.Provider>
  );
}

/**
 * THROWS outside the provider rather than handing back a silent default. A draft
 * that is quietly empty looks exactly like a draft that is quietly not wired, and
 * the second is a bug the preview cannot show.
 */
export function useDraftTheme(): DraftTheme {
  const value = useContext(DraftThemeContext);
  if (!value) {
    throw new Error('useDraftTheme must be used inside a DraftThemeProvider.');
  }
  return value;
}

/**
 * Render a subtree under the draft theme.
 *
 * The `<style>` goes INSIDE the scope rather than in `<head>`: React owns this
 * subtree, so the stylesheet arrives and leaves with the element it applies to,
 * and nothing has to remember to clean up a global rule. React 19 hoists it, and
 * hoisting is fine — the SELECTOR is what scopes the theme, not the tag's
 * position.
 *
 * `color-scheme` is set alongside, because the parts the BROWSER paints — a
 * select's popup, a native checkbox — take their palette from that and never from
 * the roles. Without it a dark draft previews with white native lists on Safari
 * and Firefox, which is a recorded defect of hand-written presets.
 */
export function DraftThemeScope({
  children,
  scheme = 'light',
}: {
  children: ReactNode;
  scheme?: 'light' | 'dark';
}) {
  const { css } = useDraftTheme();

  return (
    <div data-theme={css ? 'draft' : undefined} style={{ colorScheme: scheme }}>
      {css ? <style>{css}</style> : null}
      {children}
    </div>
  );
}
