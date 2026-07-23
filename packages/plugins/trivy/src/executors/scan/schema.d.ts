export interface ScanExecutorSchema {
  /** How to run Trivy: the local `trivy` CLI, or the `aquasec/trivy` Docker image. Default `local`. */
  runner?: 'local' | 'docker';
  /** Docker image used when `runner` is `docker`. Default `aquasec/trivy:latest`. */
  dockerImage?: string;
  /** Host dir to bind-mount as the Trivy DB cache (`runner: docker`) so CI can persist it
   * via actions/cache. Without it a named volume caches locally. */
  cacheDir?: string;
  /** Trivy scan target subcommand. `fs` scans a filesystem path. Default `fs`. */
  scanType?: 'fs' | 'repo' | 'config';
  /** Path to scan, relative to the workspace root. Default `.` (the whole workspace). */
  path?: string;
  /** Trivy `--scanners` (comma-separated). Default `vuln` (dependency vulnerabilities). */
  scanners?: string;
  /** Trivy `--severity` — the levels that count. Default `CRITICAL,HIGH`. */
  severity?: string;
  /** Fail the target when findings at/above `severity` exist (Trivy `--exit-code 1`). Default true. */
  failOnFindings?: boolean;
  /** Trivy `--format`. Default `table`. */
  format?: string;
  /** Trivy `--ignorefile` (a `.trivyignore` at the scan root is picked up automatically). */
  ignorefile?: string;
  /** Extra raw arguments appended to the `trivy` invocation. */
  extraArgs?: string[];
}
