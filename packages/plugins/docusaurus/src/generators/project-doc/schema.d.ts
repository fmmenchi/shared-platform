export interface ProjectDocGeneratorSchema {
  /** The project to document. */
  project: string;
  /** Workspace-relative docs folder the site serves. */
  docPath?: string;
  /** Sub-folder (sidebar category) for project pages. */
  section?: string;
}
