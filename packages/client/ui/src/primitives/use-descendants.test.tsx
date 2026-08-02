import { describe, it, expect } from 'vitest';
import { useEffect, type ReactNode } from 'react';
import { render } from '@testing-library/react';
import { useDescendant, useDescendants } from './use-descendants.js';
import type { Descendants } from './use-descendants.types.js';

/**
 * A part, the way a real one joins: through the hook, with a stable ref that
 * ends its membership when the element goes.
 */
function Part(props: {
  family: Descendants<string>;
  label: string;
  children?: ReactNode;
  attached?: boolean;
}) {
  const ref = useDescendant(props.family, props.label);
  return (
    <span
      ref={props.attached === false ? undefined : ref}
      data-testid={props.label}
    >
      {props.label}
      {props.children}
    </span>
  );
}

/**
 * The family. The handle reaches the test through an effect, not through render:
 * handing a ref-carrying object to somebody else mid-render is a ref read, and
 * `items()` answers about the DOM as it is NOW — a test that clicks to read is
 * really testing when React re-rendered, which is how the first version of this
 * file fooled itself.
 */
function Family(props: {
  children: (family: Descendants<string>) => ReactNode;
  handle: (api: Descendants<string>) => void;
}) {
  const family = useDescendants<string>();
  const { rootRef } = family;
  const { handle } = props;
  useEffect(() => {
    handle(family);
  });

  return <div ref={rootRef}>{props.children(family)}</div>;
}

const labels = (api: Descendants<string>) =>
  api.items().map((item) => item.data);

describe('useDescendants', () => {
  it('reads tree order, through whatever is in the way', () => {
    let api!: Descendants<string>;
    render(
      <Family handle={(a) => (api = a)}>
        {(family) => (
          <>
            {/* Wrappers on purpose: a part is a DESCENDANT, not a child, and
                nothing between it and the root knows we exist. */}
            <div>
              <Part family={family} label="one" />
            </div>
            <Part family={family} label="two" />
            <div>
              <div>
                <Part family={family} label="three" />
              </div>
            </div>
          </>
        )}
      </Family>,
    );

    expect(labels(api)).toEqual(['one', 'two', 'three']);
  });

  it('follows the DOM when the parts are reordered', () => {
    let api!: Descendants<string>;
    const tree = (order: string[]) => (
      <Family handle={(a) => (api = a)}>
        {(family) =>
          order.map((label) => (
            <Part key={label} family={family} label={label} />
          ))
        }
      </Family>
    );

    const { rerender } = render(tree(['a', 'b', 'c']));
    expect(labels(api)).toEqual(['a', 'b', 'c']);

    // The classic failure of a list sorted at registration: the parts moved and
    // nothing re-registered, so the order is yesterday's.
    rerender(tree(['c', 'a', 'b']));
    expect(labels(api)).toEqual(['c', 'a', 'b']);
  });

  it('lets go of a part that has left the DOM', () => {
    let api!: Descendants<string>;
    const tree = (withMiddle: boolean) => (
      <Family handle={(a) => (api = a)}>
        {(family) => (
          <>
            <Part family={family} label="first" />
            {withMiddle && <Part family={family} label="middle" />}
            <Part family={family} label="last" />
          </>
        )}
      </Family>
    );

    const { rerender, container } = render(tree(true));
    const middle = container.querySelector('[data-testid="middle"]');
    if (!middle) throw new Error('the middle part should be rendered');
    expect(labels(api)).toEqual(['first', 'middle', 'last']);

    rerender(tree(false));
    expect(labels(api)).toEqual(['first', 'last']);

    // THE assertion the first version of this file was missing: the one above
    // passes with a registry that never releases anything, because the element
    // had already left the subtree. Put it back and a leaked entry re-admits it
    // — silently, with its old data — which is what a virtualiser recycling
    // rows, or an exit animation holding a node, would do.
    container.firstElementChild?.append(middle);
    expect(labels(api)).toEqual(['first', 'last']);
  });

  it('lets go of a part that stops being one while staying in the DOM', () => {
    let api!: Descendants<string>;
    const tree = (attached: boolean) => (
      <Family handle={(a) => (api = a)}>
        {(family) => (
          <>
            <Part family={family} label="always" />
            <Part family={family} label="sometimes" attached={attached} />
          </>
        )}
      </Family>
    );

    const { rerender, container } = render(tree(true));
    expect(labels(api)).toEqual(['always', 'sometimes']);

    // React detaches the ref and keeps the element — which is exactly what
    // `<Activity mode="hidden">` does to an inactive tab panel. An item that
    // stays navigable here is invisible, unfocusable, and offered to the user
    // as "the next one".
    rerender(tree(false));
    expect(container.querySelector('[data-testid="sometimes"]')).not.toBeNull();
    expect(labels(api)).toEqual(['always']);

    rerender(tree(true));
    expect(labels(api)).toEqual(['always', 'sometimes']);
  });

  it('reports the data of this render, not of the one before', () => {
    let api!: Descendants<string>;
    // `rerender`, not a click: a click schedules a state update and the read
    // that follows measures whether React had flushed it, not what the hook
    // knows. Two tests in this file learned that the hard way.
    const tree = (version: string) => (
      <Family handle={(a) => (api = a)}>
        {(family) => <Part family={family} label={version} />}
      </Family>
    );

    const { rerender } = render(tree('v1'));
    expect(labels(api)).toEqual(['v1']);

    // The ref is stable, so nothing re-registers — the data still has to be
    // this render's, or a typeahead matches against a label the item no longer
    // shows.
    rerender(tree('v2'));
    expect(labels(api)).toEqual(['v2']);
  });

  it('does not swallow a nested family’s parts', () => {
    let outer!: Descendants<string>;
    let inner!: Descendants<string>;
    render(
      <Family handle={(a) => (outer = a)}>
        {(family) => (
          <>
            <Part family={family} label="outer-one" />
            {/* A submenu, inside the menu: its parts carry the same marker and
                sit in this subtree, but they are registered with IT. */}
            <Family handle={(a) => (inner = a)}>
              {(nested) => <Part family={nested} label="inner-one" />}
            </Family>
            <Part family={family} label="outer-two" />
          </>
        )}
      </Family>,
    );

    expect(labels(outer)).toEqual(['outer-one', 'outer-two']);
    expect(labels(inner)).toEqual(['inner-one']);
  });

  it('says where a part sits, and that a stranger is not one', () => {
    let api!: Descendants<string>;
    const { getByTestId } = render(
      <Family handle={(a) => (api = a)}>
        {(family) => (
          <>
            <Part family={family} label="a" />
            <Part family={family} label="b" />
            <span data-testid="outsider">outsider</span>
          </>
        )}
      </Family>,
    );

    expect(api.indexOf(getByTestId('b'))).toBe(1);
    expect(api.indexOf(getByTestId('outsider'))).toBe(-1);
    expect(api.indexOf(null)).toBe(-1);
  });

  it('leaves no trace on an element it has let go', () => {
    let api!: Descendants<string>;
    const tree = (withPart: boolean) => (
      <Family handle={(a) => (api = a)}>
        {(family) => (withPart ? <Part family={family} label="only" /> : null)}
      </Family>
    );

    const { rerender, container } = render(tree(true));
    const element = container.querySelector('[data-testid="only"]');
    if (!element) throw new Error('the part should be rendered');
    expect(element.hasAttribute('data-fm-descendant')).toBe(true);

    rerender(tree(false));
    // The marker is written onto somebody else's element; leaving it behind
    // puts an implementation detail of this package in a consumer's DOM.
    expect(element.hasAttribute('data-fm-descendant')).toBe(false);
    expect(labels(api)).toEqual([]);
  });
});
