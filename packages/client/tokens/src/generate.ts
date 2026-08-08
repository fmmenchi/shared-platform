import { REGISTERED_SECTIONS } from './registry.js';
import {
  BORDER_WIDTH_TOKENS,
  COLOR_ROLES,
  DURATION_TOKENS,
  FONT_TOKENS,
  FONT_WEIGHT_TOKENS,
  RADIUS_TOKENS,
  SIZE_TOKENS,
  SPACE_TOKENS,
  TEXT_TOKENS,
} from './tokens.js';

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

/** Every `--fm-*: value` in a stylesheet, in source order. */
export function readVars(css: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const [, name, value] of css.matchAll(
    /^\s*(--fm-[a-z0-9-]+)\s*:\s*([^;]+);/gm,
  )) {
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
  const rem = /^(-?[\d.]+)rem$/.exec(value.trim());
  if (!rem) return value.trim();
  return `${Number(rem[1]) * 16}px`;
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

/**
 * `tokens.json` — the contract in the Design Tokens Community Group format.
 *
 * It serves no CSS library: every one of them reads `var(--fm-*)` already. It
 * exists for the DESIGN side — Figma's token tooling reads DTCG — which is the
 * one direction this package has never been able to talk in.
 *
 * Only the groups DTCG can express LOSSLESSLY are emitted. A CSS `transition`
 * shorthand, our shadow strings and the z-index scale have no faithful DTCG
 * type, and emitting them untyped would be a file that looks complete and is
 * not — worse than one that says what it covers.
 */
const DTCG_GROUPS = [
  { group: 'color', names: COLOR_ROLES, type: 'color' },
  { group: 'radius', names: RADIUS_TOKENS, type: 'dimension' },
  { group: 'space', names: SPACE_TOKENS, type: 'dimension' },
  { group: 'text', names: TEXT_TOKENS, type: 'dimension' },
  { group: 'leading', names: TEXT_TOKENS, type: 'number' },
  { group: 'font', names: FONT_TOKENS, type: 'fontFamily' },
  { group: 'font-weight', names: FONT_WEIGHT_TOKENS, type: 'fontWeight' },
  { group: 'border-width', names: BORDER_WIDTH_TOKENS, type: 'dimension' },
  { group: 'size', names: SIZE_TOKENS, type: 'dimension' },
  { group: 'duration', names: DURATION_TOKENS, type: 'duration' },
] as const;

export function renderDtcg(values: Map<string, string>): string {
  const out: Record<string, unknown> = {
    $description:
      'The @fmmenchi semantic token contract, base theme. Generated from styles/vars.css — do not edit. Groups with no lossless DTCG type (transition, shadow, ease, z) are deliberately absent.',
  };

  for (const { group, names, type } of DTCG_GROUPS) {
    const entries: Record<string, unknown> = {};
    for (const name of names) {
      const value = values.get(`--fm-${group}-${name}`);
      if (value === undefined) continue;
      entries[name] = { $type: type, $value: value };
    }
    out[group] = entries;
  }

  return `${JSON.stringify(out, null, 2)}\n`;
}
