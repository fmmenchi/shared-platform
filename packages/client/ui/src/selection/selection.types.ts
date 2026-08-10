/**
 * Which rows are selected — as a rule, not as a list.
 *
 * `include` means "these", `exclude` means "everything EXCEPT these", and the
 * second one is the whole reason this is not a `Set<string>`.
 *
 * A reader who ticks "select all" on a paginated table has selected ten
 * thousand rows, and the browser holds twenty of them. There is no honest way
 * to write that as a list: the ids do not exist on the client, and inventing
 * them by fetching every page turns a click into a scan. Expressed as a rule it
 * is one object with an empty set, it survives every page change, and the bulk
 * action the consumer sends the server is "delete everything matching the
 * filter except these three" — which is what the reader actually asked for.
 *
 * The shape is decided NOW, before anything consumes it, because it is the kind
 * of type that ends up in an app's own state and in a request body. Widening a
 * `Set` into this later is a breaking change to somebody else's code.
 */
export interface Selection {
  /** Whether `ids` lists what IS selected, or what is not. */
  readonly mode: 'include' | 'exclude';
  /**
   * The exceptions, in whichever direction `mode` points.
   *
   * A `Set` rather than an array because membership is asked once per rendered
   * row per render, and because this is NOT the kind of state that goes into a
   * query key: sorting is a projection parameter the server needs, selection is
   * an interaction that ends in an action. Serialize it with `[...ids]` if a
   * request body needs it.
   */
  readonly ids: ReadonlySet<string>;
}

/** How much of a given set of rows is selected. */
export type SelectionCoverage = 'none' | 'some' | 'all';
