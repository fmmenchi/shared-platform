export interface SbomExecutorSchema {
  /** Project to describe. Defaults to the project the target runs on. (`project` is reserved by nx.) */
  projectName?: string;
  /** Trivy SBOM `--format`. Default `cyclonedx`. */
  format?: 'cyclonedx' | 'spdx-json' | 'spdx' | 'github';
  /** Output file, relative to the workspace root. Default `<projectRoot>/sbom.cdx.json`. */
  output?: string;
  /** How to run Trivy: the local `trivy` CLI, or the `aquasec/trivy` Docker image. Default `local`. */
  runner?: 'local' | 'docker';
  /** Docker image used when `runner` is `docker`. Default `aquasec/trivy:latest`. */
  dockerImage?: string;
}
