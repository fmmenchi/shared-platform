export interface ComponentGeneratorSchema {
  /** Component name, kebab-case (e.g. `badge`, `radio-group`). */
  name: string;
  /** Native element the component builds on (native-first). Default `div`. */
  element?: string;
  /** Also scaffold a colocated `.messages.ts` catalog. Default `false`. */
  messages?: boolean;
}
