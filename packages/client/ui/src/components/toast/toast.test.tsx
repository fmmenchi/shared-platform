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
import { expectNoA11yViolations } from '../../test/axe.js';
import type { ToastOptions } from './toast.types.js';

/**
 * A toast is announced by a region that was already there, and leaves on a
 * clock the reader can stop. Both are the whole component; neither is visible
 * to a query that only asks what is on screen.
 *
 * THE CLOCK IS FAKED wherever a duration is asserted. A real sleep would be
 * asserting that the machine ran a timer within so many milliseconds, which is
 * what made this suite report the state of the CPU before.
 */
const Raise = (props: { options: ToastOptions; label?: string }) => {
  const api = useToast();
  return (
    <Button onClick={() => api?.toast(props.options)}>
      {props.label ?? 'Raise'}
    </Button>
  );
};

// BY NAME, because it is not the only live region on the page: every `Button`
// renders a persistent empty one for its loading announcement.
const region = () => screen.getByRole('status', { name: 'Notifications' });
const raise = async (label = 'Raise') =>
  browser.click(screen.getByRole('button', { name: label }));

/**
 * Raise WITHOUT the driver, for the tests that fake the clock.
 *
 * Playwright's own waiting is built on timers, so a driven click never resolves
 * once `setTimeout` is faked — measured, three tests sat there for the full 20s
 * budget. `fireEvent` dispatches synchronously and needs no clock at all.
 *
 * `waitFor` is avoided for the same reason and a sharper one: it DETECTS fake
 * timers and advances them itself by calling `jest.advanceTimersByTime`, and
 * under Vitest there is no `jest`. Nothing needs it here anyway — `fireEvent`
 * and `act` both flush, so the assertion can simply be made.
 */
const raiseNow = (label = 'Raise') =>
  fireEvent.click(screen.getByRole('button', { name: label }));

/** Move the clock and let React see what it caused. */
const passTime = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
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
    // so a region that appeared WITH its first toast would announce nothing —
    // the single most common way this component is got wrong.
    expect(region()).toBeInTheDocument();
    expect(region()).toBeEmptyDOMElement();
  });

  it('puts a raised message inside that region, not beside it', async () => {
    render(
      <ToastRegion>
        <Raise
          options={{ title: 'Saved', children: 'Your changes are live.' }}
        />
      </ToastRegion>,
    );

    await raise();
    await waitFor(() => expect(screen.getByText('Saved')).toBeVisible());
    expect(region()).toContainElement(screen.getByText('Saved'));
  });

  it('keeps ONE live region, so nothing is announced twice', async () => {
    render(
      <ToastRegion>
        <Raise options={{ variant: 'error', title: 'Failed' }} />
      </ToastRegion>,
    );

    await raise();
    await waitFor(() => expect(screen.getByText('Failed')).toBeVisible());

    // The `Alert` inside carries its own live region by default, which is right
    // when it is on the page from the start and wrong here: two regions around
    // one message is the message announced twice, or announced by the wrong
    // one. The toast passes `live="off"` for exactly this.
    //
    // ASKED AS "which region owns this message", not "how many regions exist".
    // Counting was the first version and it was wrong: every `Button` in this
    // package renders a persistent, empty `role="status"` of its own — for the
    // same reason this one does, so that flipping to loading MUTATES a region
    // that already existed — and the toast's own dismiss button is one. That
    // nesting is inert (the inner one only ever changes when a button starts
    // loading, which a dismiss button never does), but it makes a count say
    // nothing about the thing under test.
    expect(screen.getByText('Failed').closest('[role="status"]')).toBe(
      region(),
    );
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it('leaves on its own, when its time is up', async () => {
    withFakeClock();
    render(
      <ToastRegion>
        <Raise options={{ title: 'Saved', duration: 3000 }} />
      </ToastRegion>,
    );

    raiseNow();
    // PRESENT, not visible: the entry animation has not had a frame yet, and
    // what this test is about is the clock. Visibility is proved by the tests
    // that run on the real one.
    expect(screen.getByText('Saved')).toBeInTheDocument();

    await passTime(2999);
    expect(screen.getByText('Saved')).toBeInTheDocument();

    await passTime(2);
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('does not take an error away on a timer', async () => {
    withFakeClock();
    render(
      <ToastRegion>
        <Raise options={{ variant: 'error', title: 'Could not save' }} />
      </ToastRegion>,
    );

    raiseNow();
    expect(screen.getByText('Could not save')).toBeInTheDocument();

    // Something went wrong is not a thing to skim. The default is to stay, and
    // a caller who disagrees passes a duration.
    await passTime(60_000);
    expect(screen.getByText('Could not save')).toBeInTheDocument();
  });

  it('stops the clock while the focus is inside', async () => {
    withFakeClock();
    render(
      <ToastRegion>
        <Raise options={{ title: 'Saved', duration: 3000 }} />
      </ToastRegion>,
    );

    raiseNow();
    expect(screen.getByText('Saved')).toBeInTheDocument();

    act(() => {
      screen.getByRole('button', { name: /dismiss/i }).focus();
    });
    // WCAG 2.2.1: a message that removes itself on a timer is a time limit, and
    // a reader who has just reached for the way out must not watch it go from
    // under them.
    await passTime(60_000);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('goes when asked, before its time', async () => {
    render(
      <ToastRegion>
        <Raise options={{ title: 'Saved', duration: 0 }} />
      </ToastRegion>,
    );

    await raise();
    await waitFor(() => expect(screen.getByText('Saved')).toBeVisible());

    await browser.click(screen.getByRole('button', { name: /dismiss/i }));
    await waitFor(() => expect(screen.queryByText('Saved')).toBeNull());
  });

  it('stacks, and can be cleared in one go', async () => {
    const Clear = () => {
      const api = useToast();
      return <Button onClick={() => api?.dismiss()}>Clear</Button>;
    };
    render(
      <ToastRegion>
        <Raise options={{ title: 'One', duration: 0 }} label="A" />
        <Raise options={{ title: 'Two', duration: 0 }} label="B" />
        <Clear />
      </ToastRegion>,
    );

    await raise('A');
    await raise('B');
    await waitFor(() => expect(screen.getByText('Two')).toBeVisible());
    expect(screen.getByText('One')).toBeVisible();

    await browser.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(screen.queryByText('One')).toBeNull());
    expect(screen.queryByText('Two')).toBeNull();
  });

  it('says so when it is used without a region', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Raise options={{ title: 'Nowhere' }} />);

    // Tolerant rather than fatal, like every other family hook here: a
    // component raising a toast on a page with no region should not take the
    // page down with it.
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
          <Raise
            options={{ variant: 'success', title: 'Saved', duration: 0 }}
          />
        </ToastRegion>
      </main>,
    );

    await raise();
    await waitFor(() => expect(screen.getByText('Saved')).toBeVisible());

    // ARRIVED, not merely present. The toast fades in, and axe measures the
    // contrast it can SEE — against a half-transparent panel it reports a
    // failure that is about the frame, not the colours. Ended rather than
    // waited out, so no duration appears here.
    const panel = region().firstElementChild as HTMLElement;
    for (const animation of panel.getAnimations()) animation.finish();
    await Promise.all(panel.getAnimations().map((a) => a.finished));

    await expectNoA11yViolations(container);
  });
});
