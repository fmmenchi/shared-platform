import { createPartContext } from '../../primitives/part-context.js';

/**
 * What a `TagList` provides to its parts, which is NOTHING — and the emptiness
 * is the contract rather than a placeholder for one.
 *
 * A `Tag` needs no data from its list: it renders its own `<li>`, names its own
 * remove control, and the focus recovery is done entirely from the DOM (the
 * list finds the controls in document order, which is a question about the
 * document rather than about React's tree). What it does need is to know that
 * it HAS a list — an `<li>` with no list around it is markup HTML-AAM maps to
 * nothing, so the "list, 3 items" this component's whole shape is justified by
 * is never announced, and the ✕ then drops the focus to `<body>` with nothing
 * to catch it. Twelve families here use `usePart` for exactly that warning.
 *
 * Frozen and shared, so the provider's value is stable across renders without a
 * `useMemo` that would only be ceremony around an object with no fields.
 */
export type TagListContextValue = Readonly<Record<string, never>>;

export const TAG_LIST: TagListContextValue = Object.freeze({});

const { Context, usePart } = createPartContext<TagListContextValue>('TagList');

export const TagListContext = Context;

/**
 * Context for a `Tag`, warning (by name) when it is used outside a `TagList`.
 * It returns `null` rather than throwing: a misplaced part is worth a loud
 * warning, not a crashed page.
 */
export const useTagListPart = usePart;
