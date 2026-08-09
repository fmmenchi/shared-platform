import { REGISTERED_SECTIONS } from './registry.js';

/**
 * THE FILES THAT ONLY RESTATE THE CONTRACT, WRITTEN BY THE CONTRACT.
 *
 * `styles/vars.css` holds the values and stays hand-written: those 159 numbers
 * are the design work, they live in exactly one place already, and the prose
 * around them is the reasoning for them. Nothing is gained by moving that into
 * an array.
 *
 * `styles/properties.css` is the opposite kind of file — 481 lines, not one of
 * them a value, every block identical but for a name. What it says is entirely
 * derivable from the contract, so it is derived; the drift it could hide is the
 * kind that never announces itself. Two examples that were live when this was
 * written: a section heading naming three status families out of four, and four
 * radius `initial-value`s in px maintained by hand beside their rem originals,
 * with nothing to fail if the two stopped agreeing.
 *
 * Rendered as strings rather than written to disk, so the test that keeps the
 * committed files honest is an ordinary assertion — see `generate.test.ts`.
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

/**
 * A `<length>` the browser will accept as an `initial-value`: it has to be
 * computationally independent, which `rem` is not. Converted from the real
 * value at the 16px root rather than restated, so the two cannot disagree.
 */
export function toIndependentLength(value: string): string {
  const trimmed = value.trim();
  if (/^-?\d+(\.\d+)?px$/.test(trimmed)) return trimmed;

  const rem = /^(-?\d+(?:\.\d+)?)rem$/.exec(trimmed);
  if (rem) return `${Number(rem[1]) * 16}px`;

  // THROWS RATHER THAN PASSES IT THROUGH. Returning the value unchanged is the
  // worst of the options: `initial-value: clamp(4px, 1vw, 8px)` is not
  // computationally independent, so the browser rejects the WHOLE `@property`
  // rule — and silently. The token then loses both things registration buys it,
  // the interpolation and the type guard, and an invalid assignment poisons the
  // cascade instead of falling back. Nothing downstream can see that: Stylelint
  // has no rule for it and the contract test only greps for `rem`.
  throw new Error(
    `Cannot register a length that is not absolute: ${JSON.stringify(value)}. An @property initial-value must be computationally independent, so a registered token has to be px or rem — not em, calc(), clamp() or a var().`,
  );
}

/** Soft-wrap a comment body at 80 columns, continuations indented to match. */
function wrap(text: string, indent: number): string {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line !== '' && `${line} ${word}`.length > 72) {
      lines.push(line);
      line = word;
    } else {
      line = line === '' ? word : `${line} ${word}`;
    }
  }
  if (line !== '') lines.push(line);
  return lines.join(`\n${' '.repeat(indent)}`);
}

const HEADER = `/* eslint-disable css/use-baseline -- progressive: @property degrades to untyped custom properties (values hold, components render, only interpolation is lost); widely ~2027-01 (ADR-0010, ADR-0012) */
/**
 * TYPED TOKEN REGISTRATIONS — @property for the semantic roles.
 *
 * GENERATED from the contract by \`src/generate.ts\`; \`generate.test.ts\` fails if
 * this file and the contract disagree. Do not edit by hand — change the roles in
 * \`src/tokens.ts\` or the sections in \`src/registry.ts\` and re-run the suite
 * with \`-u\`.
 *
 * Registering each \`--fm-*\` role gives the browser its TYPE, which unlocks two
 * things a plain custom property cannot do:
 *   1. INTERPOLATION — a registered <color>/<length> animates. This is what lets
 *      a \`[data-theme]\` flip CROSSFADE instead of snap (opt-in: the consumer adds
 *      \`transition\` on the roles), and lets gradients/among-token tweens work.
 *   2. A runtime type guard — an invalid assignment falls back to initial-value
 *      instead of poisoning the cascade.
 *
 * SINGLE SOURCE IS PRESERVED: a colour's initial-value is a THROWAWAY placeholder
 * (\`oklch(0 0 0)\`), never the real token — \`vars.css\` (:root) + \`inherits: true\`
 * always cascade the true value over it. A length's cannot be a placeholder (the
 * rule would be rejected), so it is COMPUTED from the real value.
 *
 * Imported at the top of \`vars.css\`, so the tokens and their types ship
 * together.
 *
 * @property is Baseline NEWLY (Widely ~2027-01), so this ships as an ADR-0010
 * progressive enhancement: without support the roles stay untyped strings —
 * fully functional, only the interpolation is lost (theme flip snaps, as it does
 * today). Registered here behind the file-level use-baseline disable above.
 */
`;

/** `styles/properties.css`, in full. */
export function renderProperties(values: Map<string, string>): string {
  const sections = REGISTERED_SECTIONS.map((section) => {
    // Wrapped by hand, because Prettier does not reflow a CSS comment and the
    // repo's own format gate would have accepted a 224-character line without
    // a word.
    const heading = section.note
      ? `/* --- ${wrap(`${section.title} — ${section.note}`, 7)} --- */`
      : `/* --- ${section.title} --- */`;

    const blocks = section.vars.map((name) => {
      const initial =
        section.syntax === '<color>'
          ? 'oklch(0 0 0)'
          : toIndependentLength(values.get(name) ?? '0px');

      return `@property ${name} {\n  syntax: '${section.syntax}';\n  inherits: true;\n  initial-value: ${initial};\n}`;
    });

    return `${heading}\n${blocks.join('\n')}`;
  });

  return `${HEADER}\n${sections.join('\n\n')}\n`;
}
