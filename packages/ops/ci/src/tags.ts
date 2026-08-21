/**
 * A published-package release tag — `@scope/name@x.y.z`. Toolkit tags such as
 * `gh-actions/v0.0.2` don't match: they are versioned + tagged but aren't npm
 * packages, so the SBOM/announce steps (which parse `{project}@{version}`) skip them.
 * Replaces the old `*@*` glob with an explicit, testable rule.
 *
 * Its existence is also the argument against reading tags back out of git: two release
 * groups in one workspace cut two different tag SHAPES, and only one of them carries a
 * project name. A flat list of tags cannot say who owns what — the record can.
 */
export function isPackageTag(tag: string): boolean {
  return /^@[^@\s]+@\d+\.\d+\.\d+/.test(tag);
}
