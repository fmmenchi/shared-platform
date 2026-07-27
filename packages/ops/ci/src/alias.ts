/**
 * The moving-major alias for a set of tags following `<prefix>X.Y.Z` (e.g. the
 * gh-actions toolkit's `gh-actions/v{version}`). Returns the alias to move
 * (`<prefix>X`) and the latest exact tag it should point at, or null if there is
 * no such tag yet. Pure — unit-tested; the git side-effects live in the script.
 */
export function majorAlias(
  tags: readonly string[],
  prefix: string,
): { alias: string; target: string } | null {
  const versioned = tags
    .filter((t) => t.startsWith(prefix))
    .map((t) => ({ tag: t, parts: t.slice(prefix.length).split('.') }))
    .filter(
      (x) => x.parts.length === 3 && x.parts.every((p) => /^\d+$/.test(p)),
    )
    .map((x) => ({ tag: x.tag, v: x.parts.map(Number) as [number, number, number] }));

  if (versioned.length === 0) return null;

  versioned.sort((a, b) => a.v[0] - b.v[0] || a.v[1] - b.v[1] || a.v[2] - b.v[2]);
  const latest = versioned[versioned.length - 1];
  return { alias: `${prefix}${latest.v[0]}`, target: latest.tag };
}
