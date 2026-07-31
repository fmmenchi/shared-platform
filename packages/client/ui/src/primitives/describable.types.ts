/** Which container is describing itself — a part that only fits one can check. */
export type DescribableOwner = 'Field' | 'ChoiceField' | 'Fieldset';

/**
 * What ANY container that can be described hands to its text parts. `Field` and
 * `ChoiceField` (one control each) and `Fieldset` (a group) all provide it, which is what lets one
 * `FieldDescription` / `FieldError` serve either: React resolves the nearest
 * provider, so a part inside a `Field` nested in a `Fieldset` describes the field,
 * and the same part outside that `Field` describes the group.
 */
export interface Describable {
  owner: DescribableOwner;
  /** A part registers its own id and node; the returned cleanup unregisters it. */
  register: (id: string, node: Element) => () => void;
}
