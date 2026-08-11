import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { ToastRegion } from '../toast-region/toast-region.component.js';
import { useToast } from '../toast-region/toast-region.context.js';
import { Button } from '../button/button.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';
import type { ToastOptions } from './toast.types.js';

/**
 * A toast is announced by a region that was already there, and — when it is
 * timed — leaves on a clock nobody has to race. Neither is visible to a query
 * that only asks what is on screen.
 *
 * THE CLOCK IS FAKED wherever a duration is asserted, and each of those tests
 * ends on a POSITIVE leg: the thing eventually goes. A mutation run found two
 * of them passing with a clock that never moved — "it is still there" is true
 * before the call as well as after, so on its own it asserts nothing.
 */
const Raise = (props: { options: ToastOptions; label?: string }) => {
  const api = useToast();
  return (
    <Button onClick={() => api?.toast(props.options)}>
      {props.label ?? 'Raise'}
    </Button>
  );
};

const region = () => screen.getByRole('status', { name: 'Notifications' });
const raise = async (label = 'Raise') =>
  browser.click(screen.getByRole('button', { name: label }));

/**
 * Raise WITHOUT the driver, for the tests that fake the clock.
 *
 * Playwright's own waiting is built on timers, so a driven click never resolves
 * once `setTimeout` is faked. `waitFor` is avoided for the same reason and a
 * sharper one: it detects fake timers and advances them by calling
 * `jest.advanceTimersByTime`, and under Vitest there is no `jest`. Nothing needs
 * it — `fireEvent` and `act` both flush.
 */
const raiseNow = (label = 'Raise') =>
  fireEvent.click(screen.getByRole('button', { name: label }));

const passTime = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

/**
 * END the exit rather than wait it out.
 *
 * A dismissed toast fades before it goes, and that fade is WAAPI — a real
 * clock, untouched by `vi.useFakeTimers`. So a test that moves the fake clock
 * past a duration and then reads the DOM sees a toast that is leaving but has
 * not left. `finish()` jumps it to the end, which is the same move the drawer
 * tests make and keeps every one of these assertions off the wall clock.
 */
const finishExits = async () => {
  await act(async () => {
    for (const node of document.querySelectorAll('[data-toast]')) {
      for (const animation of node.getAnimations()) animation.finish();
    }
    await Promise.resolve();
  });
};

const withFakeClock = () =>
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

afterEach(() => {
  vi.useRealTimers();
});

describe('Toast', () => {
  it('renders the live region before anything is in it', () => {
    render(
      <ToastRegion>
        <p>App</p>
      </ToastRegion>,
    );

    // THE PRECONDITION FOR BEING ANNOUNCED AT ALL. Assistive technology has to
    // be watching a region that already exists to notice an insertion into it,
    // so a region that appeared WITH its first toast would announce nothing.
    expect(region()).toBeInTheDocument();
    expect(region()).toBeEmptyDOMElement();
  });

  it('announces the insertion, not the whole stack', () => {
    render(
      <ToastRegion>
        <p>App</p>
      </ToastRegion>,
    );

    // `role="status"` carries an IMPLICIT `aria-atomic="true"`, and the queue
    // lives in the region — so without this every new message re-read every
    // message already up, severity words and button names included. Three
    // errors stacked meant the fourth announced four.
    expect(region()).toHaveAttribute('aria-atomic', 'false');
  });

  it('shows the title AND the message', async () => {
    render(
      <ToastRegion>
        <Raise
          options={{ title: 'Saved', children: 'Your changes are live.' }}
        />
      </ToastRegion>,
    );

    await raise();
    // BOTH. Asserting only the title was the suite's worst hole: a toast that
    // rendered its heading and silently dropped the sentence explaining what
    // happened passed every test.
    await waitFor(() => expect(screen.getByText('Saved')).toBeVisible());
    expect(screen.getByText('Your changes are live.')).toBeVisible();
    expect(region()).toContainElement(
      screen.getByText('Your changes are live.'),
    );
  });

  it('keeps the message in ONE live region', async () => {
    render(
      <ToastRegion>
        <Raise options={{ variant: 'error', title: 'Failed' }} />
      </ToastRegion>,
    );

    await raise();
    await waitFor(() => expect(screen.getByText('Failed')).toBeVisible());

    // ASKED AS "which region owns this message", not "how many exist": every
    // `Button` renders a persistent empty `role="status"` of its own, for the
    // same reason this one does, so a count says nothing about the Alert.
    expect(screen.getByText('Failed').closest('[role="status"]')).toBe(
      region(),
    );
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it('gives a toast that STAYS a way out, and a timed one none', async () => {
    render(
      <ToastRegion>
        <Raise options={{ title: 'Stays' }} label="Persistent" />
        <Raise options={{ title: 'Goes', duration: 6000 }} label="Timed" />
      </ToastRegion>,
    );

    await raise('Persistent');
    await waitFor(() => expect(screen.getByText('Stays')).toBeVisible());
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeVisible();

    // THE SPLIT THAT REPLACED A CIRCULAR ARGUMENT. The region renders after the
    // whole app, so its controls are last in the tab order — six seconds is not
    // enough to Tab thirty times. So a timed toast offers no control to race,
    // and a persistent one is under no clock.
    await raise('Timed');
    await waitFor(() => expect(screen.getByText('Goes')).toBeVisible());
    expect(screen.getAllByRole('button', { name: /dismiss/i })).toHaveLength(1);
  });

  it('leaves on its own, when it was given a time', async () => {
    withFakeClock();
    render(
      <ToastRegion>
        <Raise options={{ title: 'Saved', duration: 3000 }} />
      </ToastRegion>,
    );

    raiseNow();
    expect(screen.getByText('Saved')).toBeInTheDocument();

    await passTime(2999);
    expect(screen.getByText('Saved')).toBeInTheDocument();

    await passTime(2);
    await finishExits();
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('stays by default, however long nobody looks', async () => {
    withFakeClock();
    render(
      <ToastRegion>
        <Raise options={{ title: 'Saved' }} />
      </ToastRegion>,
    );

    raiseNow();
    // NO TIME LIMIT unless one is asked for. WCAG 2.2.1 is not satisfied by
    // pausing on hover — it wants the limit turned off, adjusted or extended —
    // so the default imposes none, and a caller who sets a duration is saying
    // the message is not the only copy of itself.
    await passTime(600_000);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('stops the clock while the pointer is in the region, and starts it after', async () => {
    withFakeClock();
    render(
      <ToastRegion>
        <Raise options={{ title: 'Saved', duration: 3000 }} />
      </ToastRegion>,
    );

    raiseNow();
    const toast = screen.getByText('Saved');

    fireEvent.pointerEnter(region());
    await passTime(60_000);
    // Hovering to read it must not let it go mid-sentence.
    expect(toast).toBeInTheDocument();

    // AND THE POSITIVE LEG, which is the half a mutation run found missing:
    // without it a pause that never released would pass — and a pause that
    // never releases means nothing auto-dismisses again for the life of the
    // page.
    fireEvent.pointerLeave(region());
    await passTime(3001);
    await finishExits();
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('starts the clock again when the focus leaves without dismissing', async () => {
    withFakeClock();
    render(
      <ToastRegion>
        <Raise options={{ title: 'Stays' }} label="Persistent" />
        <Raise options={{ title: 'Goes', duration: 3000 }} label="Timed" />
      </ToastRegion>,
    );

    raiseNow('Persistent');
    raiseNow('Timed');
    const out = screen.getByRole('button', { name: /dismiss/i });

    act(() => out.focus());
    await passTime(60_000);
    expect(screen.getByText('Goes')).toBeInTheDocument();

    // OUT WITHOUT USING IT — the one release path the other tests never take.
    // Leaving by pointer is covered above and dismissing is covered below, so
    // dropping the blur release passed everything: a reader who tabs into the
    // stack, reads, and tabs away would freeze every clock behind them.
    act(() => {
      screen.getByRole('button', { name: 'Persistent' }).focus();
    });
    await passTime(3001);
    await finishExits();
    expect(screen.queryByText('Goes')).toBeNull();
  });

  it('restarts the clock rather than resuming it', async () => {
    withFakeClock();
    render(
      <ToastRegion>
        <Raise options={{ title: 'Saved', duration: 3000 }} />
      </ToastRegion>,
    );

    raiseNow();
    await passTime(2900);

    fireEvent.pointerEnter(region());
    await passTime(1000);
    fireEvent.pointerLeave(region());

    // A reader who arrives with 100ms left should not be handed 100ms.
    await passTime(2999);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    await passTime(2);
    await finishExits();
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('dismisses the one it was asked for, and leaves the rest', async () => {
    render(
      <ToastRegion>
        <Raise options={{ title: 'One' }} label="A" />
        <Raise options={{ title: 'Two' }} label="B" />
      </ToastRegion>,
    );

    await raise('A');
    await raise('B');
    await waitFor(() => expect(screen.getByText('Two')).toBeVisible());

    // `dismiss(id)` removing EVERYTHING survived the whole first suite: no test
    // ever had two up and took one away. A reader with three stacked would
    // click one ✕ and watch the other two go with it.
    const [first] = screen.getAllByRole('button', { name: /dismiss/i });
    await browser.click(first as HTMLElement);
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /dismiss/i })).toHaveLength(
        1,
      ),
    );
    expect(screen.getByText('One')).toBeVisible();
    expect(screen.queryByText('Two')).toBeNull();
  });

  it('does not wedge the pause when the focused toast is dismissed', async () => {
    render(
      <ToastRegion>
        <Raise options={{ title: 'Stays' }} label="Persistent" />
        <Raise options={{ title: 'Goes', duration: 1000 }} label="Timed" />
      </ToastRegion>,
    );

    await raise('Persistent');
    await waitFor(() => expect(screen.getByText('Stays')).toBeVisible());

    // Focus the way out and use it. Removing the focused element dispatches NO
    // `focusout` — the browser moves focus to `<body>` in silence — so a pause
    // latched by events alone stayed on for ever, and nothing auto-dismissed
    // again for the rest of the session. A keyboard user never recovers; a
    // mouse user is healed by the next hover, which is why it was invisible.
    const out = screen.getByRole('button', { name: /dismiss/i });
    act(() => out.focus());
    await browser.click(out);
    await waitFor(() => expect(screen.queryByText('Stays')).toBeNull());

    await raise('Timed');
    await waitFor(() => expect(screen.getByText('Goes')).toBeVisible());
    await waitFor(() => expect(screen.queryByText('Goes')).toBeNull(), {
      timeout: 8000,
    });
  });

  it('gives every toast its own id', async () => {
    render(
      <ToastRegion>
        <Raise options={{ title: 'One' }} label="A" />
        <Raise options={{ title: 'Two' }} label="B" />
      </ToastRegion>,
    );

    await raise('A');
    await raise('B');
    await waitFor(() => expect(screen.getByText('Two')).toBeVisible());

    // Shared ids are invisible until they are not: dismissing either removes
    // both, because the queue filters by id.
    const ids = Array.from(region().querySelectorAll('[data-toast]')).map(
      (node) => node.getAttribute('data-toast'),
    );
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('newest first, so the eye and the Tab key agree', async () => {
    render(
      <ToastRegion>
        <Raise options={{ title: 'Older' }} label="A" />
        <Raise options={{ title: 'Newer' }} label="B" />
      </ToastRegion>,
    );

    await raise('A');
    await raise('B');
    await waitFor(() => expect(screen.getByText('Newer')).toBeVisible());

    // The first version appended and reversed the column in CSS, so the visual
    // order ran newest-to-oldest while Tab ran oldest-to-newest: the focus ring
    // entered at the bottom and travelled against the reading direction.
    const [first, second] = Array.from(
      region().querySelectorAll('[data-toast]'),
    );
    expect(first).toContainElement(screen.getByText('Newer'));
    expect(second).toContainElement(screen.getByText('Older'));
    expect((first as HTMLElement).getBoundingClientRect().top).toBeLessThan(
      (second as HTMLElement).getBoundingClientRect().top,
    );
  });

  it('keeps at most `max`, dropping the oldest', async () => {
    render(
      <ToastRegion max={2}>
        <Raise options={{ title: 'One' }} label="A" />
        <Raise options={{ title: 'Two' }} label="B" />
        <Raise options={{ title: 'Three' }} label="C" />
      </ToastRegion>,
    );

    await raise('A');
    await raise('B');
    await raise('C');
    await waitFor(() => expect(screen.getByText('Three')).toBeVisible());

    // Unbounded was the first version, and nothing auto-dismisses by default: a
    // failing poll built a column that ran off the top of the viewport, where
    // the older messages could be neither read nor reached.
    expect(screen.queryByText('One')).toBeNull();
    expect(screen.getByText('Two')).toBeVisible();
  });

  it('clears them all when asked', async () => {
    const Clear = () => {
      const api = useToast();
      return <Button onClick={() => api?.dismiss()}>Clear</Button>;
    };
    render(
      <ToastRegion>
        <Raise options={{ title: 'One' }} label="A" />
        <Clear />
      </ToastRegion>,
    );

    await raise('A');
    await waitFor(() => expect(screen.getByText('One')).toBeVisible());
    await browser.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(screen.queryByText('One')).toBeNull());
  });

  it('does not swallow clicks on the page beneath it', async () => {
    render(
      <ToastRegion>
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1 }}
          data-testid="page"
        />
      </ToastRegion>,
    );

    // The region is ALWAYS mounted, fixed, and 28rem wide. Without
    // `pointer-events: none` it sits over the corner of every page eating the
    // clicks meant for whatever is under it — and an empty region gives no clue
    // why. Asked as geometry, because no query can see it.
    const box = region().getBoundingClientRect();
    const beneath = document.elementFromPoint(
      box.left + box.width / 2,
      box.top + box.height / 2,
    );
    expect(beneath).toBe(screen.getByTestId('page'));
  });

  it('paints the way out in the alert’s own foreground', async () => {
    render(
      <ToastRegion>
        <Raise options={{ variant: 'error', title: 'Failed' }} />
      </ToastRegion>,
    );

    await raise();
    await waitFor(() => expect(screen.getByText('Failed')).toBeVisible());

    // The button was a SIBLING of the alert once, so it took the PAGE's
    // foreground onto a status tint — a pairing the token contract never
    // declared, and axe called it. Compared against the alert rather than
    // hard-coded, so a retuned theme cannot make this pass by accident.
    const alert = screen
      .getByText('Failed')
      .closest('[class*="alert"]') as HTMLElement;
    const out = screen.getByRole('button', { name: /dismiss/i });
    expect(getComputedStyle(out).color).toBe(getComputedStyle(alert).color);
  });

  it('leaves the way a toast leaves, rather than blinking out', async () => {
    render(
      <ToastRegion>
        <Raise options={{ title: 'Saved' }} />
      </ToastRegion>,
    );

    await raise();
    await waitFor(() => expect(screen.getByText('Saved')).toBeVisible());

    const panel = region().firstElementChild as HTMLElement;
    await browser.click(screen.getByRole('button', { name: /dismiss/i }));

    // THE EXIT IS OBSERVED BEFORE IT COMPLETES, which is the only moment it
    // exists: `animateExit` is awaited before the state changes, so the node is
    // still there and running. Without the await React unmounts it out from
    // under the animation and the message blinks out — which is what the whole
    // family did until this commit, in a package that exports the primitive and
    // whose Dialog and Popover both use it.
    await waitFor(() =>
      expect(panel.getAnimations().length).toBeGreaterThan(0),
    );
    for (const animation of panel.getAnimations()) animation.finish();

    await waitFor(() => expect(screen.queryByText('Saved')).toBeNull());
  });

  it('shows how long is left, only when there is a clock', async () => {
    render(
      <ToastRegion>
        <Raise options={{ title: 'Stays' }} label="Persistent" />
        <Raise options={{ title: 'Goes', duration: 4000 }} label="Timed" />
      </ToastRegion>,
    );

    await raise('Persistent');
    await waitFor(() => expect(screen.getByText('Stays')).toBeVisible());
    const persistent = region().querySelector('[data-toast]') as HTMLElement;
    // Nothing is counting down, so there is nothing to draw.
    expect(persistent.querySelector('[aria-hidden="true"]')).toBeNull();

    await raise('Timed');
    await waitFor(() => expect(screen.getByText('Goes')).toBeVisible());
    const bar = region().querySelector('[data-toast] [aria-hidden="true"]');
    expect(bar).not.toBeNull();

    // THE SAME NUMBER THE TIMER USES. A bar with a duration of its own would
    // promise a moment the message does not leave at, and nothing on screen
    // would say which of the two was lying.
    expect(getComputedStyle(bar as Element).animationDuration).toBe('4s');
  });

  it('stops the bar with the clock', async () => {
    render(
      <ToastRegion>
        <Raise options={{ title: 'Goes', duration: 4000 }} />
      </ToastRegion>,
    );

    await raise();
    await waitFor(() => expect(screen.getByText('Goes')).toBeVisible());
    const bar = region().querySelector(
      '[data-toast] [aria-hidden="true"]',
    ) as HTMLElement;
    expect(getComputedStyle(bar).animationPlayState).toBe('running');
    const name = getComputedStyle(bar).animationName;

    fireEvent.pointerEnter(region());
    // RESET, not paused — because the clock resets. The timer, by the tested
    // decision above, gives the WHOLE duration back on resume; a bar merely
    // paused resumed from where it was, so after any pause the two promised
    // different moments — the drift the comments swear impossible, shipped.
    // During the pause the animation is removed (the bar shows full, which is
    // the truth: resume and you have it all)…
    await waitFor(() =>
      expect(getComputedStyle(bar).animationName).toBe('none'),
    );

    // …and on resume it restarts from zero, in step with the restarted clock.
    fireEvent.pointerLeave(region());
    await waitFor(() => {
      expect(getComputedStyle(bar).animationName).toBe(name);
      expect(getComputedStyle(bar).animationPlayState).toBe('running');
    });
  });

  it('paints the status as an edge, not as a flood', async () => {
    render(
      <ToastRegion>
        <Raise options={{ variant: 'error', title: 'Failed' }} />
      </ToastRegion>,
    );

    await raise();
    await waitFor(() => expect(screen.getByText('Failed')).toBeVisible());
    const alert = screen
      .getByText('Failed')
      .closest('[class*="alert"]') as HTMLElement;
    const painted = getComputedStyle(alert);

    // A toast arrives over whatever the reader was looking at. `Alert`'s tinted
    // surface is right for a message that is PART of the page and a shout when
    // it is not — so the fill is the page's own card colour and the status is
    // an edge. Read from the theme rather than hard-coded, so retuning a brand
    // cannot make this pass by accident.
    const card = getComputedStyle(document.documentElement)
      .getPropertyValue('--fm-color-card')
      .trim();
    expect(card).not.toBe('');
    const probe = document.createElement('div');
    probe.style.backgroundColor = card;
    document.body.append(probe);
    const expected = getComputedStyle(probe).backgroundColor;
    probe.remove();

    expect(painted.backgroundColor).toBe(expected);
    // And the edge IS the status: the inline-start border differs from the
    // neutral one on the other three sides.
    expect(painted.borderInlineStartColor).not.toBe(painted.borderTopColor);
  });

  it('reserves room for the way out only when there is one', async () => {
    render(
      <ToastRegion>
        <Raise options={{ title: 'Stays' }} label="Persistent" />
        <Raise options={{ title: 'Goes', duration: 5000 }} label="Timed" />
      </ToastRegion>,
    );

    await raise('Persistent');
    await waitFor(() => expect(screen.getByText('Stays')).toBeVisible());
    await raise('Timed');
    await waitFor(() => expect(screen.getByText('Goes')).toBeVisible());

    const panels = Array.from(region().querySelectorAll('[data-toast]'));
    const measure = (panel: Element) => {
      const alert = panel.querySelector('[class*="alert"]') as HTMLElement;
      const out = panel.querySelector('button');
      const box = alert.getBoundingClientRect();
      return {
        padEnd: parseFloat(getComputedStyle(alert).paddingInlineEnd),
        needs: out ? box.right - out.getBoundingClientRect().left : 0,
      };
    };
    const timed = measure(panels[0] as Element);
    const stays = measure(panels[1] as Element);

    // GEOMETRY, both ways round. The ✕ is absolutely positioned, so the Alert's
    // own padding knows nothing about it: reserve too little and it sits on the
    // text, reserve it always and a timed toast carries a gap for a control it
    // does not have. Written once as a single class, this rule lost to
    // `.toast .body`'s `padding` shorthand and reserved nothing at all.
    expect(stays.padEnd).toBeGreaterThan(stays.needs);
    expect(timed.padEnd).toBeLessThan(stays.padEnd);
    expect(timed.padEnd).toBeLessThanOrEqual(20);
  });

  it("carries the caller's status glyph", async () => {
    render(
      <ToastRegion>
        <Raise
          options={{
            variant: 'error',
            title: 'Deleted',
            icon: <span data-testid="glyph">!</span>,
            children: 'The project could not be deleted.',
          }}
        />
      </ToastRegion>,
    );

    await raise();

    // THE ONE `Alert` A CONSUMER CANNOT REACH INTO: they hand over an options
    // object and the region renders. Without the pass-through, the colour of
    // one edge is the only status signal a sighted reader gets — four panels
    // differing by hue alone (WCAG 1.4.1) — and `Alert` grew the slot for
    // exactly that reason.
    await waitFor(() => expect(screen.getByTestId('glyph')).toBeVisible());
    // Decoration, not content: the severity is already said, once, by the
    // hidden word `Alert` puts before the title.
    expect(
      screen.getByTestId('glyph').closest('[aria-hidden="true"]'),
    ).not.toBeNull();
  });

  it('arrives with a movement long enough to be seen', async () => {
    render(
      <ToastRegion>
        <Raise
          options={{ title: 'Saved', children: 'Your changes are live.' }}
        />
      </ToastRegion>,
    );

    await raise();

    const panel = document.querySelector('[data-toast]') as HTMLElement;
    const entrance = panel.getAnimations();

    // THE ENTRANCE WAS NEVER MEASURED, which is how it became imperceptible
    // without anything turning red: it ran, at the bottom of the scale — half a
    // rem of travel in 200ms — and a panel that is simply there on the next
    // frame reads as no animation at all.
    expect(entrance).toHaveLength(1);
    expect((entrance[0] as CSSAnimation).animationName).toMatch(
      /fm-slide-up-in/,
    );

    // The BANNER tier, which is what the token's own annotation calls a toast —
    // `s` is "switch, colour, icons". This is the assertion that would have
    // caught the original pick.
    expect(getComputedStyle(panel).animationDuration).toBe('0.35s');
  });

  it('is dense, and the way out sits on the title', async () => {
    render(
      <ToastRegion>
        <Raise
          options={{ title: 'Saved', children: 'Your changes are live.' }}
        />
      </ToastRegion>,
    );

    await raise();
    await waitFor(() => expect(screen.getByText('Saved')).toBeVisible());

    const alert = screen
      .getByText('Saved')
      .closest('[class*="alert"]') as HTMLElement;
    const title = screen.getByText('Saved');
    const out = screen.getByRole('button', { name: /dismiss/i });

    // A TRANSIENT PANEL, not a page block. It inherited `Alert`'s page-scale
    // padding and body type and came out 102px tall for two short lines; a step
    // down on the type and half the padding is what a toast wants. The
    // paragraph margin that was most of the remainder was `Alert`'s own bug,
    // fixed there.
    expect(getComputedStyle(title).fontSize).toBe('14px');
    expect(alert.getBoundingClientRect().height).toBeLessThan(80);

    // And the ✕ is centred on the title's first line rather than pinned to the
    // corner, which left a band of air above the title.
    const t = title.getBoundingClientRect();
    const b = out.getBoundingClientRect();
    expect(
      Math.abs(t.top + t.height / 2 - (b.top + b.height / 2)),
    ).toBeLessThan(3);
  });

  it('is a strip, not a block', async () => {
    render(
      <ToastRegion>
        <Raise
          options={{ title: 'Saved', children: 'Your changes are live.' }}
        />
      </ToastRegion>,
    );

    await raise();
    await waitFor(() => expect(screen.getByText('Saved')).toBeVisible());

    // The region is `position: fixed`, so with only a MAXIMUM width it
    // shrink-wrapped its contents — measured, this message came out 96px wide
    // and 100 tall, a squat block rather than the strip a toast is. Every toast
    // shares the region's width, so the stack reads as one column.
    const box = (
      region().firstElementChild as HTMLElement
    ).getBoundingClientRect();
    expect(box.width).toBeGreaterThan(300);
    expect(box.width).toBeGreaterThan(box.height * 2);
  });

  it('says so when the provider is the wrong way round', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <ToastRegion>
        <p>App</p>
      </ToastRegion>,
    );

    // Silent degradation is the failure mode worth catching: outside the
    // provider the region still works, still announces, and simply calls itself
    // "Notifications" in an app that is not in English.
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('no <UiProvider> above it'),
      ),
    );
    warn.mockRestore();
  });

  it('is quiet when the two are nested the right way', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderUi(
      <ToastRegion>
        <p>App</p>
      </ToastRegion>,
      { locale: 'it' },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('no <UiProvider>'),
    );
    // And the name really is the localised one, which is the thing the warning
    // is about — not merely that a provider was present.
    expect(
      screen.getByRole('status', { name: 'Notifiche' }),
    ).toBeInTheDocument();
    warn.mockRestore();
  });

  it('says so when it is used without a region', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Raise options={{ title: 'Nowhere' }} />);

    await raise();
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('used outside a <ToastRegion>'),
      ),
    );
    warn.mockRestore();
  });

  it('has no a11y violations with a toast up', async () => {
    const { container } = render(
      <main>
        <ToastRegion>
          <Raise options={{ variant: 'success', title: 'Saved' }} />
        </ToastRegion>
      </main>,
    );

    await raise();
    await waitFor(() => expect(screen.getByText('Saved')).toBeVisible());

    // ARRIVED, not merely present: the toast fades in, and axe measures the
    // contrast it can SEE. Ended rather than waited out.
    const panel = region().firstElementChild as HTMLElement;
    for (const animation of panel.getAnimations()) animation.finish();
    await Promise.all(panel.getAnimations().map((a) => a.finished));

    await expectNoA11yViolations(container);
  });

  describe('what the fourth review found', () => {
    it('stands without the Popover API, on the CSS fallback', () => {
      // The API rides an ADR-0010 waiver, so a browser in the target may lack
      // it — and the region wraps the whole app: unguarded, the TypeError in
      // its mount effect took the page down while the `position: fixed`
      // fallback sat unreachable behind the crash. (A StrictMode double-show
      // was probed as the other risk and measured harmless in current
      // Chromium: a re-show silently no-ops.)
      const original = HTMLElement.prototype.showPopover;
      // @ts-expect-error — simulating an engine without the API.
      delete HTMLElement.prototype.showPopover;
      try {
        expect(() =>
          render(
            <ToastRegion>
              <p>app</p>
            </ToastRegion>,
          ),
        ).not.toThrow();
        expect(
          screen.getByRole('status', { name: 'Notifications' }),
        ).toBeInTheDocument();
      } finally {
        HTMLElement.prototype.showPopover = original;
      }
    });

    it('keeps the reader in the region when the overflow drops their toast', async () => {
      // Focus on the oldest toast's dismiss button; a new toast arrives and
      // `slice(0, max)` drops the oldest — the browser moves focus to <body>
      // in silence (the same mechanism the pause repair documents), thirty
      // Tabs from where the reader stood. It lands on the nearest surviving
      // control instead.
      render(
        <ToastRegion max={2}>
          <Raise options={{ title: 'Uno' }} />
        </ToastRegion>,
      );
      await raise();
      await raise();
      await waitFor(() => expect(screen.getAllByText('Uno')).toHaveLength(2));

      const buttons = screen.getAllByRole('button', {
        name: /dismiss|chiudi/i,
      });
      const oldest = buttons[buttons.length - 1] as HTMLElement;
      oldest.focus();

      // WITHOUT the click driver: a real click moves focus to the Raise
      // button first, which is a legitimate departure — the defect is the
      // SILENT one, where the node under the reader is removed and no blur
      // ever fires.
      raiseNow();
      // Still two: the third arrival dropped the oldest — the one holding the
      // reader's focus.
      await waitFor(() => expect(screen.getAllByText('Uno')).toHaveLength(2));
      await waitFor(() => {
        expect(document.activeElement).not.toBe(document.body);
        expect(region().contains(document.activeElement)).toBe(true);
      });
    });

    it('warns when a timed toast contains a control the clock races', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <ToastRegion>
          <Raise
            options={{
              title: 'Saved',
              duration: 4000,
              children: (
                <button type="button" onClick={() => undefined}>
                  Undo
                </button>
              ),
            }}
          />
        </ToastRegion>,
      );
      await raise();
      await waitFor(() => {
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('races the reader'),
        );
      });
      warn.mockRestore();
    });
  });
});
