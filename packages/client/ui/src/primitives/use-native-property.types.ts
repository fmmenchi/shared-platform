/** What `useNativeProperty` needs to know about one DOM property. */
export interface NativePropertyOptions<V> {
  /**
   * DRIVEN value. Written to the element whenever it changes — the caller keeps
   * hold of it and pushes. `undefined` means "not driven": the element owns the
   * property and nothing is written.
   */
  value: V | undefined;
  /**
   * INITIAL value, written once when the element mounts and never again. The
   * element owns the property from then on. Ignored when `value` is given.
   */
  initial?: V;
  /**
   * NOTIFY after a driven write: dispatch a native `input` + `change` so that
   * everything holding a copy of the value — React's own `onChange`, a form
   * library's internal state — learns about it. Without this a programmatic
   * write is silent, and a form library would submit the value it last saw.
   *
   * Only for properties that ARE the control's value. A property that merely
   * decorates it (a checkbox's `indeterminate`) must not fire a change: nothing
   * about the submitted value moved, and the event would be a lie.
   */
  notify?: boolean;
}
