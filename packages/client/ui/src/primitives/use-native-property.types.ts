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
}
