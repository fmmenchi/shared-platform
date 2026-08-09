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

/**
 * EVERY `<Canvas of={X.Story} />` NAMES A STORY THAT EXISTS.
 *
 * A dangling reference is invisible to everything else here: MDX is not in the
 * TypeScript project, `build-storybook` compiles it happily, and the
 * stories-as-tests run the stories that DO exist. The page simply throws when
 * somebody opens it — which is how a component whose docs had been broken for
 * a day was found by a person rather than by CI.
 */
const storySources = import.meta.glob('../components/**/*.stories.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/**
 * `./toast.stories.tsx` seen from `../components/toast/toast.mdx`.
 *
 * The extension is optional in the source and both spellings are in the tree —
 * `button.mdx` omits it, `toast.mdx` writes it — so it is normalised here
 * rather than asked of the authors.
 */
const resolveFrom = (mdxPath: string, relative: string): string => {
  const path = `${folderOf(mdxPath)}/${relative.replace(/^\.\//, '')}`;
  return path.endsWith('.tsx') ? path : `${path}.tsx`;
};

describe('documentation story references', () => {
  const references = Object.entries(docs).flatMap(([mdxPath, raw]) => {
    const aliases = new Map<string, string>();
    for (const [, alias, from] of raw.matchAll(
      /import \* as (\w+) from '([^']+)'/g,
    )) {
      aliases.set(alias as string, resolveFrom(mdxPath, from as string));
    }

    return [...raw.matchAll(/of=\{(\w+)\.(\w+)\}/g)].map(
      ([, alias, story]) => ({
        mdxPath,
        alias: alias as string,
        story: story as string,
        source: aliases.get(alias as string),
      }),
    );
  });

  it('finds references to check', () => {
    expect(references.length).toBeGreaterThan(50);
  });

  it.each(references.map((r) => [`${r.mdxPath} → ${r.alias}.${r.story}`, r]))(
    '%s resolves',
    (_label, reference) => {
      const source = storySources[reference.source as string];
      expect(source, `${reference.source} is not a stories file`).toBeDefined();
      expect(
        new RegExp(`export const ${reference.story}\\b`).test(source as string),
        `${reference.mdxPath} renders ${reference.alias}.${reference.story}, which that stories file does not export — the docs page throws when it is opened.`,
      ).toBe(true);
    },
  );
});
