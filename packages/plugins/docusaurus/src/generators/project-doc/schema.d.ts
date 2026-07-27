export interface ProjectDocGeneratorSchema {
  /** The project to document. */
  project: string;
  /**
   * Docs category (sidebar group). When set, a `doc:<category>` tag is added to the project so
   * `config-generator` files its docs under that group. Omit to tag it yourself later.
   */
  category?: string;
}
