import { describe, it, expect } from 'vitest';

/**
 * The component-doc STANDARD, machine-enforced (spec: Storybook →
 * Guidelines/Component docs; `button.mdx` is the reference).
 *
 * Every component must ship a colocated `<name>.mdx` whose REQUIRED sections
 * appear in the standard order: `<Meta of>` → `# Title` + intent →
 * `## Props` (with `<Controls of>`) → `## Usage` (with `<Canvas of>`) →
 * `## Accessibility`. Optional sections (Anatomy, Guidelines, i18n) are not
 * checked. A component without its doc — or with sections out of order —
 * fails here.
 */
// Every component has its own folder, parts included (the MUI model), so a part —
// `field-label/`, `field-description/` — is a SIBLING of the family it belongs to
// and ships no `.mdx` of its own: it is documented in that family's page. Hence the
// two-clause rule in `coveringDoc` below, and a glob that is not pinned to a depth
// (one that is silently stops finding components the moment the tree moves).
const components = import.meta.glob('../components/**/*.component.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const docs = import.meta.glob('../components/**/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const folderOf = (path: string) => path.split('/').slice(0, -1).join('/');
const docByFolder = new Map(
  Object.entries(docs).map(([path, raw]) => [folderOf(path), raw]),
);

/** The nearest doc at or above a component's folder, walking up to `components/`. */
function nearestDoc(folder: string): string | undefined {
  let current = folder;
  while (current.includes('/components/') || current.endsWith('/components')) {
    const found = docByFolder.get(current);
    if (found !== undefined) return found;
    if (current.endsWith('/components')) break;
    current = folderOf(current);
  }
  return undefined;
}

/** The component names a file exports, e.g. `export { FieldDescription };`. */
const exportedNames = (raw: string): string[] =>
  [...raw.matchAll(/export \{ ([A-Z]\w+)/g)].map((match) => match[1]);

/**
 * The doc that covers a component: the nearest `.mdx` at or above it, or — for a
 * part whose folder has no doc of its own — every part, in this layout — the doc
 * that names its export. The second clause is what keeps a part honest: it still
 * has to be documented, just not necessarily in its own folder.
 */
function coveringDoc(path: string, raw: string): string | undefined {
  const nearest = nearestDoc(folderOf(path));
  if (nearest !== undefined) return nearest;
  const names = exportedNames(raw);
  if (names.length === 0) return undefined;
  return Object.values(docs).find((doc) =>
    names.some((name) => doc.includes(`\`${name}\``)),
  );
}

// [marker, human name] in the REQUIRED order.
const REQUIRED: ReadonlyArray<readonly [RegExp, string]> = [
  [/<Meta of=\{/, '<Meta of={Stories} />'],
  [/^# .+/m, '# Title + intent'],
  [/^## Props$/m, '## Props'],
  [/<Controls of=\{/, '<Controls of={…} />'],
  [/^## Usage$/m, '## Usage'],
  [/<Canvas of=\{/, '<Canvas of={…} />'],
  [/^## Accessibility$/m, '## Accessibility'],
];

describe('component docs follow the standard format', () => {
  it('found the components', () => {
    expect(Object.keys(components).length).toBeGreaterThan(0);
  });

  for (const [path, source] of Object.entries(components)) {
    const name = path.split('/').pop() as string;

    it(`${name} is covered by an .mdx`, () => {
      expect(
        coveringDoc(path, source) !== undefined,
        `no .mdx covers ${path} — every component ships its doc, at its own folder, a parent, or (for a shared part) the doc that names its export`,
      ).toBe(true);
    });

    it(`the doc covering ${name} has the required sections, in order`, () => {
      const raw = coveringDoc(path, source);
      if (raw === undefined) return; // reported above
      let cursor = 0;
      for (const [marker, label] of REQUIRED) {
        const match = marker.exec(raw.slice(cursor));
        expect(
          match,
          `"${label}" missing or out of order in ${name}.mdx`,
        ).not.toBeNull();
        if (match) cursor += match.index + match[0].length;
      }
    });
  }
});
