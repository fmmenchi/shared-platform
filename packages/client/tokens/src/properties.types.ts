/**
 * The shape of one section of the generated `properties.css`.
 */
export interface RegisteredSection {
  /** Rendered as the section comment. */
  title: string;
  /** A second line of it, where the reason needs saying. */
  note?: string;
  syntax: '<color>' | '<length>';
  vars: readonly string[];
}
