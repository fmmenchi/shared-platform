import { Button } from '@fmmenchi/ui/button';

import { useScheme } from './theme-choice';

/**
 * THE SHELL'S THEME, SWITCHED — light or dark, in the header beside the preview link.
 *
 * IT WAS A SEGMENTED CONTROL of three, and the reason it is not is recorded in
 * `theme-choice.ts`: `system` is what you get by not choosing, so it was costing a
 * third of the control to say nothing. Two states left, and one target at icon size,
 * which is what a piece of header chrome should cost.
 *
 * THE ICON SHOWS WHAT YOU WILL GET, NOT WHAT YOU HAVE — a sun while dark, a moon
 * while light — and that decision is what picks the component. A control whose face
 * advertises its ACTION is a button; a control whose face advertises its STATE is a
 * toggle, and carries `aria-pressed` to say which way. Doing both is the trap: an
 * icon-as-action on a `Toggle` would show a sun while a screen reader announced
 * "Dark theme, pressed", which is two accounts of one control disagreeing — the
 * ADR-0024 class of defect that is invisible until someone listens to it.
 *
 * So it is a plain `Button`, and the ACCESSIBLE NAME SAYS THE SAME THING THE ICON
 * DOES: "Switch to light theme" over the sun. The name changes with the state
 * because the action changes with the state, which is exactly when a changing name
 * is right rather than confusing — there is no `aria-pressed` here for it to
 * contradict. `Button` warns when an icon-only button has no discernible text, so
 * an omission here fails loudly rather than silently.
 *
 * IT IS CHROME, so it wears the shell's theme, never the draft's — which is the whole
 * point: a person switching the shell to dark to see how the builder reads in dark
 * gets the design system's dark, and the rail beside it keeps showing THEIR dark.
 */
export function ThemeSwitcher() {
  const [scheme, setScheme] = useScheme();
  const dark = scheme === 'dark';
  const next = dark ? 'light' : 'dark';

  return (
    <Button
      variant="ghost"
      type="button"
      aria-label={`Switch to ${next} theme`}
      icon={dark ? <SunIcon /> : <MoonIcon />}
      onClick={() => setScheme(next)}
    />
  );
}

/*
 * The two icons, inline. The design system ships NO icons by design — they arrive
 * through the injected-icon contract — so a consumer that needs two draws them, and
 * two paths are not a reason to take an icon library. Both are 1em on `currentColor`
 * so they inherit the button's size and role colour, and neither carries a title:
 * `Button` owns the accessible name.
 */

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}
