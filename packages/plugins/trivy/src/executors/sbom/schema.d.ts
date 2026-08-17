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
  /**
   * The version to record as the SBOM's root component, when the package.json on disk
   * does not have it. A release that does not commit its version bumps (nx's
   * `git.commit: false`) leaves them only in the release job's working tree — so a
   * separate SBOM job, on a fresh checkout, reads the PRE-release version and labels the
   * bill of materials with a version nobody shipped.
   *
   * Called `packageVersion`, not `version`: nx reserves `--version` as its own CLI flag,
   * so an option by that name could never be passed from a command line.
   */
  packageVersion?: string;
}
