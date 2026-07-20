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
const components = import.meta.glob('../components/*/*.component.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const docs = import.meta.glob('../components/*/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const folderOf = (path: string) => path.split('/').slice(0, -1).join('/');
const docByFolder = new Map(
  Object.entries(docs).map(([path, raw]) => [folderOf(path), raw]),
);

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

  for (const path of Object.keys(components)) {
    const folder = folderOf(path);
    const name = folder.split('/').pop() as string;

    it(`${name} has its colocated .mdx`, () => {
      expect(
        docByFolder.has(folder),
        `missing ${folder}/${name}.mdx — every component ships its doc`,
      ).toBe(true);
    });

    it(`${name}.mdx has the required sections, in order`, () => {
      const raw = docByFolder.get(folder);
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
