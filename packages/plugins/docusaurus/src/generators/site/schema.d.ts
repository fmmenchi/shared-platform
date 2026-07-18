export interface SiteGeneratorSchema {
  /** Project directory basename. */
  name: string;
  /** Workspace-relative directory of the site project (default packages/tools/<name>). */
  directory?: string;
  /** Workspace-relative folder holding the human docs the site serves. */
  docPath?: string;
  /** package.json name of the site project (default <name>). */
  packageName?: string;
  /** Site title (default <name>). */
  title?: string;
  /** Production URL of the site. */
  url?: string;
  /** Repository URL for the navbar GitHub link. */
  repoUrl?: string;
}
