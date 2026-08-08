import { describe, it, expect } from 'vitest';

/**
 * The roadmap is a claim about the tree, so the tree checks it.
 *
 * `docs/roadmap.md` says what ships today, what is next and what was deferred.
 * Left to discipline that page is wrong within two components — the same reason
 * `component-docs.test.ts` exists for the component pages. Two directions are
 * enforced, and they fail for opposite mistakes:
 *
 * - a component in the tree that the SHIPPED table does not name (built and not
 *   announced), and
 * - a name still under NEXT or DEFERRED that already exists (built and not
 *   moved).
 *
 * The parts are deliberately not required. `FieldLabel`, `MenuItem` and
 * `PopoverContent` are siblings of their family, documented on the family's
 * page, and listing all forty of them would make the table unreadable without
 * making it more true — the family is what a consumer chooses.
 */
const roadmap = Object.values(
  import.meta.glob('../../docs/roadmap.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
)[0];

const components = Object.keys(
  import.meta.glob('../components/**/*.component.tsx'),
);

/** `../components/input-group/input-group.component.tsx` → `input-group`. */
const folderOf = (path: string) => path.split('/').slice(-2)[0] as string;

/** `input-group` → `InputGroup`, which is how the page names things. */
const pascal = (folder: string) =>
  folder
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

/**
 * A family owns its parts: `dialog-content` belongs to `dialog`, and naming the
 * family is enough. A folder is a part when another component's folder is a
 * prefix of it — which is exactly how the tree encodes the relationship.
 */
function isPartOfAFamily(folder: string, all: readonly string[]): boolean {
  return all.some(
    (other) => other !== folder && folder.startsWith(`${other}-`),
  );
}

const sectionOf = (heading: string) => {
  const from = roadmap.indexOf(heading);
  if (from === -1) return '';
  const next = roadmap.indexOf('\n## ', from + 1);
  return roadmap.slice(from, next === -1 ? undefined : next);
};

describe('the component roadmap', () => {
  const folders = components.map(folderOf);
  const families = folders.filter((f) => !isPartOfAFamily(f, folders));

  it('finds the page and the components it describes', () => {
    expect(roadmap, 'docs/roadmap.md is missing').toBeTruthy();
    expect(families.length).toBeGreaterThan(10);
  });

  it.each(families.map((f) => [f, pascal(f)]))(
    'names %s in the shipped table',
    (_folder, name) => {
      expect(
        sectionOf('## Shipped').includes(`\`${name}\``),
        `${name} ships but the roadmap's Shipped table does not name it. Move it there in the same commit that built it.`,
      ).toBe(true);
    },
  );

  it('does not promise something that already exists', () => {
    // A name is PROMISED only where the page promises it: the heading of a
    // `Next` item, or the bolded lead of a `Deferred` bullet. Anywhere else it
    // is prose — `Select` is named to explain a trade and `Alert` to draw a
    // contrast, and an earlier version of this test failed on both, which is
    // the failure mode a roadmap guard has to avoid: crying wolf until someone
    // deletes it.
    const promised = [
      ...sectionOf('## Next').matchAll(/^### \d+\.[^\n]*/gm),
      ...sectionOf('## Deferred, with the reason').matchAll(
        /^- \*\*[^*]+\*\*/gm,
      ),
    ].flatMap((line) =>
      [...line[0].matchAll(/`([A-Z][A-Za-z]*)`/g)].map(
        (match) => match[1] as string,
      ),
    );

    const built = new Set(families.map(pascal));
    const stale = [...new Set(promised)].filter((name) => built.has(name));

    expect(
      stale,
      `these are listed as unbuilt but exist: ${stale.join(', ')}. Move them into the Shipped table.`,
    ).toEqual([]);
  });
});
