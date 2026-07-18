export interface ValidationGeneratorSchema {
  /** The project that owns the themes. */
  project: string;
  /** Workspace-relative theme CSS paths to register. */
  themes?: string[];
}
