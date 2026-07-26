/**
 * A published-package release tag — `@scope/name@x.y.z`. Toolkit tags such as
 * `gh-actions/v0.0.2` don't match: they are versioned + tagged but aren't npm
 * packages, so the SBOM/announce steps (which parse `{project}@{version}`) skip them.
 * Replaces the old `*@*` glob with an explicit, testable rule.
 */
export function isPackageTag(tag: string): boolean {
  return /^@[^@\s]+@\d+\.\d+\.\d+/.test(tag);
}

/** The tags present in `after` but not `before`, sorted. */
export function newTags(
  before: readonly string[],
  after: readonly string[],
): string[] {
  const had = new Set(before);
  return after.filter((t) => t && !had.has(t)).sort();
}
