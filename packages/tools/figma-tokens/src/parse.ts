/**
 * Reading the declared values out of a stylesheet.
 *
 * Deliberately a scanner and not a CSS parser: the input is a values-only
 * contract (`:root { --x: v; }` and preset overrides), and a full parser would
 * buy nothing but a dependency. The narrowness is the point — anything this
 * cannot read is something the contract was not supposed to contain.
 */

/**
 * `--name: value;` — one declaration, value up to the first `;`.
 *
 * Not anchored to the line: a declaration is legal anywhere, and a rule written
 * inline (`:root { --x: red; }`) is the ordinary shape of a minified or
 * hand-written preset. A `var(--x)` REFERENCE cannot be mistaken for one,
 * because the name must be followed by a colon and it is followed by `)`.
 */
const DECLARATION = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;

/**
 * Every custom property declared in `css`, last declaration winning — the
 * cascade's own rule, so a file that redeclares a property resolves the way the
 * browser would rather than the way a first-wins scan would.
 */
export const parseCustomProperties = (css: string): Map<string, string> => {
  const out = new Map<string, string>();
  for (const [, name, value] of css.matchAll(DECLARATION)) {
    out.set(name, value.trim());
  }
  return out;
};
