import { SegmentedControl } from '@fmmenchi/ui/segmented-control';
import { SegmentedControlItem } from '@fmmenchi/ui/segmented-control-item';

import {
  THEME_CHOICES,
  THEME_CHOICE_LABELS,
  isThemeChoice,
  useThemeChoice,
} from './theme-choice';

/**
 * THE SHELL'S THEME, CHOSEN — System / Light / Dark, in the header beside the preview
 * toggle.
 *
 * A `SegmentedControl`, and this time it IS the right component: the preview toggle
 * beside it is a link because it navigates (ADR-0025's line — "a tab list navigates
 * the page, a radio group answers a question"), and this answers a question. Nothing
 * moves; the page you are on changes its coat. Three radios named `theme`, which is
 * also what a screen reader announces: a group called "Theme", one of three checked.
 *
 * IT IS CHROME, so it wears the shell's theme, never the draft's — which is the whole
 * point: a person switching the shell to dark to see how the builder reads in dark
 * gets the design system's dark, and the rail beside it keeps showing THEIR dark.
 */
export function ThemeSwitcher() {
  const [choice, setChoice] = useThemeChoice();

  return (
    <SegmentedControl
      label="Theme"
      name="theme"
      value={choice}
      onValueChange={(next) => {
        if (isThemeChoice(next)) setChoice(next);
      }}
    >
      {THEME_CHOICES.map((value) => (
        <SegmentedControlItem key={value} value={value}>
          {THEME_CHOICE_LABELS[value]}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}
