import { describe, it, expect } from 'vitest';
import { useEffect, type ReactNode } from 'react';
import { render } from '@testing-library/react';
import { useDescendants } from './use-descendants.js';
import type { Descendants } from './use-descendants.types.js';

/**
 * A family whose parts announce themselves. The handle is handed to the test
 * directly rather than read through a click: `items()` answers a question about
 * the DOM as it is NOW, so a test that clicks to read is really testing when
 * React re-rendered — which is how the first version of this file failed.
 */
function Family(props: {
  children: (register: Descendants<string>['register']) => ReactNode;
  handle: (api: Descendants<string>) => void;
}) {
  // Destructured: the compiler tracks the whole handle as ref-carrying, so
  // reaching into it during render is a ref read even when what comes out is a
  // plain callback.
  const descendants = useDescendants<string>();
  const { rootRef, register } = descendants;
  // In an effect, and with no dependency array: handing a ref-carrying object
  // to somebody else's function mid-render is a ref read, and naming it in the
  // deps is the same read one line later. The test wants whatever the latest
  // render produced, which is exactly what a dep-less effect gives it.
  const { handle } = props;
  useEffect(() => {
    handle(descendants);
  });

  return <div ref={rootRef}>{props.children(register)}</div>;
}

describe('useDescendants', () => {
  it('reads DOM order, through whatever is in the way', () => {
    let api!: Descendants<string>;
    render(
      <Family handle={(a) => (api = a)}>
        {(register) => (
          <>
            {/* Wrappers and a fragment on purpose: a part is a DESCENDANT, not
                a child, and nothing between it and the root knows we exist. */}
            <div>
              <span ref={register('one')}>one</span>
            </div>
            <>
              <span ref={register('two')}>two</span>
            </>
            <div>
              <div>
                <span ref={register('three')}>three</span>
              </div>
            </div>
          </>
        )}
      </Family>,
    );

    expect(api.items().map((item) => item.data)).toEqual([
      'one',
      'two',
      'three',
    ]);
  });

  it('follows the DOM when the parts are reordered', () => {
    let api!: Descendants<string>;
    const tree = (order: string[]) => (
      <Family handle={(a) => (api = a)}>
        {(register) =>
          order.map((label) => (
            <span key={label} ref={register(label)}>
              {label}
            </span>
          ))
        }
      </Family>
    );

    const { rerender } = render(tree(['a', 'b', 'c']));
    expect(api.items().map((item) => item.data)).toEqual(['a', 'b', 'c']);

    // The classic failure of an implementation that sorts at registration: the
    // parts moved and nothing re-registered, so the order is yesterday's.
    rerender(tree(['c', 'a', 'b']));
    expect(api.items().map((item) => item.data)).toEqual(['c', 'a', 'b']);
  });

  it('drops a part that has gone', () => {
    let api!: Descendants<string>;
    const tree = (withMiddle: boolean) => (
      <Family handle={(a) => (api = a)}>
        {(register) => (
          <>
            <span ref={register('first')}>first</span>
            {withMiddle && <span ref={register('middle')}>middle</span>}
            <span ref={register('last')}>last</span>
          </>
        )}
      </Family>
    );

    const { rerender } = render(tree(true));
    expect(api.items().map((item) => item.data)).toEqual([
      'first',
      'middle',
      'last',
    ]);

    // A stale entry here is what makes "focus the next item" focus nothing.
    rerender(tree(false));
    expect(api.items().map((item) => item.data)).toEqual(['first', 'last']);
  });

  it('does not swallow a nested family’s parts', () => {
    let outer!: Descendants<string>;
    let inner!: Descendants<string>;
    render(
      <Family handle={(a) => (outer = a)}>
        {(register) => (
          <>
            <span ref={register('outer-one')}>outer-one</span>
            {/* A submenu, inside the menu: its parts carry the same marker and
                sit in this subtree, but they are registered with IT. */}
            <Family handle={(a) => (inner = a)}>
              {(nested) => <span ref={nested('inner-one')}>inner-one</span>}
            </Family>
            <span ref={register('outer-two')}>outer-two</span>
          </>
        )}
      </Family>,
    );

    expect(outer.items().map((item) => item.data)).toEqual([
      'outer-one',
      'outer-two',
    ]);
    expect(inner.items().map((item) => item.data)).toEqual(['inner-one']);
  });

  it('says where a part sits, and that a stranger is not one', () => {
    let api!: Descendants<string>;
    const { getByTestId } = render(
      <Family handle={(a) => (api = a)}>
        {(register) => (
          <>
            <span ref={register('a')} data-testid="a">
              a
            </span>
            <span ref={register('b')} data-testid="b">
              b
            </span>
            <span data-testid="outsider">outsider</span>
          </>
        )}
      </Family>,
    );

    expect(api.indexOf(getByTestId('b'))).toBe(1);
    expect(api.indexOf(getByTestId('outsider'))).toBe(-1);
    expect(api.indexOf(null)).toBe(-1);
  });
});
