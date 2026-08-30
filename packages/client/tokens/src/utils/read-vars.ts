/**
 * THE parser for `--fm-*` declarations.
 *
 * Its own module, not `generate.ts`, because that file is build-time only and
 * excluded from `tsconfig.lib.json` — so nothing shipped could import it, and
 * "the contract suite shares one parser rather than keeping a second one" would
 * have quietly become false the moment a runtime module needed to read a
 * stylesheet. `describeSystem()` needs exactly that.
 */

/**
 * Every `--fm-*: value` in a stylesheet, in source order.
 *
 * COMMENTS ARE REMOVED FIRST, and that is not tidiness. Anchoring on `^\s*`
 * only asks for the start of a LINE, so a role commented out during a retune —
 * the ordinary `/* off for now` around a block — reads as a declaration. Every
 * gate would then pass on a role the shipped CSS does not define: completeness
 * sees it, contrast reads its value out of the comment, and `properties.css`
 * registers it. The `:root` value being absent, it resolves to the `@property`
 * initial-value, `oklch(0 0 0)` — black, on every consumer, in both themes.
 */
export function readVars(css: string): Map<string, string> {
  const values = new Map<string, string>();
  const live = css.replace(/\/\*[\s\S]*?\*\//g, '');

  for (const [, name, value] of live.matchAll(
    /^\s*(--fm-[a-z0-9-]+)\s*:\s*([^;]+);/gm,
  )) {
    if (values.has(name as string)) {
      throw new Error(
        `Duplicate declaration of ${name}. Two values for one token in one file means the later one silently wins, and which is later is not something anybody reads a stylesheet to find out.`,
      );
    }
    values.set(name as string, (value as string).trim().replace(/\s+/g, ' '));
  }
  return values;
}
