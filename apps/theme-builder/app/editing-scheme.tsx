import { SegmentedControl } from '@fmmenchi/ui/segmented-control';
import { SegmentedControlItem } from '@fmmenchi/ui/segmented-control-item';
import { useCallback, useId } from 'react';
import { useLocation, useNavigate } from 'react-router';

import type { Scheme } from './declarations';

/**
 * WHICH OF THE TWO THEMES YOU ARE WORKING ON — one question, asked once.
 *
 * IT WAS ASKED FOUR TIMES. Step one, step two and step three each held their own
 * `Tabs` with their own state, and the preview rail held a fourth in a `useState`.
 * Set step one to dark, walk to step three, and you were editing light again with
 * nothing on screen admitting the jump. The complaint was that there were too many
 * switches; the actual defect is that ONE question was drawn four times, so it read
 * as four questions with four answers.
 *
 * A RADIO GROUP AND NOT `Tabs`, which is ADR-0025's line — "a tab list navigates the
 * page, a radio group answers a question". Those tab lists navigated nothing: both
 * panels were the same step, and the design system's own rule says what that is. So
 * the four become one `SegmentedControl` over one piece of state, and the component
 * changes for the same reason the count does.
 *
 * IN THE URL, alongside `preview`, and for the identical reasons `preview-open.ts`
 * gives: it survives a reload, it is a link somebody can send, and it costs no
 * store. It also arrives free — `useStepLink` carries the whole query across a step
 * change, so the scheme follows you between steps with no plumbing at all, which was
 * the bug this replaces.
 *
 * REPLACE, NOT PUSH. Switching the theme you are looking at is not somewhere you
 * went, and a history stacked with it would make Back mean "the other theme"
 * instead of "the previous step".
 *
 * THE SHELL'S OWN THEME IS A DIFFERENT QUESTION and keeps its own control
 * (`theme-switcher.tsx`, an icon button in the header). That one asks what the app
 * wears while you work; this one asks what you are working ON. They are told apart
 * by shape and by place rather than by wording, which is the only way that survives
 * somebody skimming.
 */
const PARAM = 'scheme';

/** The value, spelled one way, so "absent" has exactly one spelling too. */
const DARK = 'dark';

export function editingScheme(search: string): Scheme {
  return new URLSearchParams(search).get(PARAM) === DARK ? 'dark' : 'light';
}

/**
 * The same path pointed at the other theme — everything else in the query kept,
 * `preview` above all, because these two live there together.
 */
export function withScheme(
  pathname: string,
  search: string,
  scheme: Scheme,
): string {
  const next = new URLSearchParams(search);
  if (scheme === 'dark') next.set(PARAM, DARK);
  else next.delete(PARAM);

  const query = next.toString();
  return query === '' ? pathname : `${pathname}?${query}`;
}

/** The theme being edited, and a setter that puts it in the URL. */
export function useEditingScheme(): readonly [Scheme, (next: Scheme) => void] {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  const setScheme = useCallback(
    (next: Scheme) =>
      void navigate(withScheme(pathname, search, next), { replace: true }),
    [navigate, pathname, search],
  );

  return [editingScheme(search), setScheme] as const;
}

/**
 * The control itself, rendered wherever the answer matters — on a build step, and
 * in the preview rail. SEVERAL ON ONE PAGE IS THE NORMAL CASE and they stay in step
 * because none of them holds anything: the URL does.
 *
 * Which is exactly why `name` comes from `useId` rather than being spelled here.
 * Radios sharing a `name` are ONE group to the browser, so two of these with a
 * fixed name would have four buttons fighting over a single checked state — the
 * rail's pair would uncheck the step's and the step's would uncheck the rail's.
 */
export function EditingSchemeSwitch() {
  const [scheme, setScheme] = useEditingScheme();
  const name = useId();

  return (
    <SegmentedControl
      label="Theme you are editing"
      name={name}
      value={scheme}
      onValueChange={(next) => {
        if (next === 'light' || next === 'dark') setScheme(next);
      }}
    >
      <SegmentedControlItem value="light">Light</SegmentedControlItem>
      <SegmentedControlItem value="dark">Dark</SegmentedControlItem>
    </SegmentedControl>
  );
}
