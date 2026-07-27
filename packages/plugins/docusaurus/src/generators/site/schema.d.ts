export interface SiteGeneratorSchema {
  /** Project directory basename. */
  name: string;
  /** Workspace-relative directory of the site project (default `apps/<name>`). */
  directory?: string;
  /** package.json name of the site project (default <name>). */
  packageName?: string;
  /** Site title (default <name>). */
  title?: string;
  /** Production URL of the site. */
  url?: string;
  /** Base URL path (GitHub Pages project sites need '/<repo>/'). */
  baseUrl?: string;
  /** Repository URL for the navbar GitHub link. */
  repoUrl?: string;
  /**
   * Docs categories to scaffold sidebar-group markers for (one `docs/<category>/_category_.json`
   * each). Mirror the `doc:<category>` tags your packages carry. Default `['libraries', 'plugins']`.
   */
  categories?: string[];
}
