export interface ComponentGeneratorSchema {
  /** Component name, kebab-case (e.g. `badge`, `radio-group`). */
  name: string;
  /** Native element the component builds on (native-first). Default `div`. */
  element?: string;
  /** Also scaffold a colocated `.messages.ts` catalog. Default `false`. */
  messages?: boolean;
  /**
   * Also scaffold the component's React context — the contract its parts read,
   * with the `use<Name>Part` hook that warns by name on an orphan part. Default
   * `false`. Parts themselves are separate components, generated separately.
   */
  context?: boolean;
}
