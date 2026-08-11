import { describe, it, expect, vi, afterEach } from 'vitest';
import { useCallback, useRef } from 'react';
import { act, render } from '@testing-library/react';
import { useOpenMirror } from './use-open-mirror.js';

/**
 * The mirror's own contract, tested on the hook rather than through a
 * component, because one of its three guarantees cannot be reached from one.
 *
 * `toggle` is fired ASYNCHRONOUSLY, so anything that opens a surface inside the
 * same tick as the mount — `defaultOpen`, a ref callback, a consumer's effect —
 * still has its event caught by the subscription. The case the read-first
 * exists for is a surface opened in an EARLIER task: a click that lands on a
 * declarative trigger before React has hydrated, which is the whole point of a
 * declarative trigger and is not something a component test can stage.
 */
const surfaces: HTMLElement[] = [];

const openSurface = () => {
  const node = document.createElement('div');
  node.setAttribute('popover', 'auto');
  document.body.append(node);
  node.showPopover();
  surfaces.push(node);
  return node;
};

afterEach(() => {
  for (const node of surfaces.splice(0)) node.remove();
});

function Mirror(props: { node: HTMLElement; report: (open: boolean) => void }) {
  const ref = useRef<HTMLElement | null>(props.node);
  useOpenMirror(ref, props.report);
  return null;
}

describe('useOpenMirror', () => {
  it('reads a surface that was already open before it arrived', () => {
    const node = openSurface();
    const report = vi.fn();
    render(<Mirror node={node} report={report} />);

    // Nothing will fire `toggle` for this one: it happened in a task that is
    // over. Subscribing alone leaves the component believing a live surface is
    // closed — `aria-expanded="false"` over it, and for a menu no command
    // focused and the arrows dead.
    expect(report).toHaveBeenCalledWith(true);
  });

  it('follows the platform in both directions', async () => {
    const node = openSurface();
    const report = vi.fn();
    render(<Mirror node={node} report={report} />);
    report.mockClear();

    node.hidePopover();
    await vi.waitFor(() => expect(report).toHaveBeenLastCalledWith(false));

    node.showPopover();
    await vi.waitFor(() => expect(report).toHaveBeenLastCalledWith(true));
  });

  it('reports closed when it is taken away while open', () => {
    const node = openSurface();
    const report = vi.fn();
    const { unmount } = render(<Mirror node={node} report={report} />);
    report.mockClear();

    unmount();
    // From its OWN bookkeeping, not from the element: by cleanup time a real
    // surface has been taken out of the document and the platform has already
    // closed the popover, so asking `:popover-open` answers no and the repair
    // never happens.
    expect(report).toHaveBeenCalledWith(false);
  });

  it('says nothing about a surface that was closed all along', () => {
    const node = document.createElement('div');
    node.setAttribute('popover', 'auto');
    document.body.append(node);
    surfaces.push(node);

    const report = vi.fn();
    const { unmount } = render(<Mirror node={node} report={report} />);
    unmount();

    // Neither on arrival nor on the way out: a closed surface is not news, and
    // a spurious `false` would tell a consumer's `onOpenChange` that something
    // had closed which was never open.
    expect(report).not.toHaveBeenCalled();
  });

  it('reports a <details> open from a PLAIN toggle event, without newState', () => {
    // ToggleEvent's `newState` is the popover's vocabulary; a details' toggle
    // is a plain Event in engines that predate it. Read there,
    // `undefined === 'open'` reported CLOSED on every opening — the mirror
    // said shut while the panel stood open. The platform's own property is
    // the fact, and every engine has it.
    const reports: boolean[] = [];
    function Probe() {
      const ref = useRef<HTMLDetailsElement>(null);
      useOpenMirror(
        ref,
        useCallback((open: boolean) => {
          reports.push(open);
        }, []),
      );
      return (
        <details ref={ref}>
          <summary>s</summary>
        </details>
      );
    }
    render(<Probe />);
    const details = document.querySelector('details') as HTMLDetailsElement;
    act(() => {
      details.open = true;
      details.dispatchEvent(new Event('toggle'));
    });
    expect(reports).toContain(true);
  });
});
