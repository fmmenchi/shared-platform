/**
 * `styles/properties.css`, RENDERED FROM THE CONTRACT.
 *
 * WHY THE EMITTER IS HERE AND THE FILE IT WRITES IS NOT. `@fmmenchi/tokens` is an
 * ARTEFACT: it ships values and stylesheets, and the emitter that renders one of
 * those stylesheets is not a value — it is knowledge about the contract, which is
 * this package's whole subject. So the rule the two packages divide on:
 *
 *   this package knows HOW an artefact is rendered;
 *   `@fmmenchi/tokens` owns the values that go into it, and the test that pins the
 *   rendered result to them.
 *
 * That test cannot move here, and not by preference: it reads
 * `tokens/src/styles/vars.css`, and `scope:shared` may not depend on
 * `scope:client`. The asymmetry is the boundary rules', not a taste.
 *
 * And it BUYS something rather than merely tidying. `@fmmenchi/nx-theme-generator`
 * is `scope:plugins`, which may not import a `scope:client` library either — so
 * while this lived in tokens, a consumer running the generator could not emit
 * their own `properties.css` at all. Here, they can: the same code path renders
 * ours and theirs, which is the direction tokens' own AGENTS.md asks for.
 *
 * WHAT IS GENERATED AND WHAT IS NOT. `vars.css` holds the values and stays
 * hand-written: those numbers are the design work, they live in exactly one place
 * already, and the prose around them is the reasoning for them. `properties.css`
 * is the opposite kind of file — 481 lines, not one of them a value, every block
 * identical but for a name. The rule: a file that only RESTATES the contract is
 * generated; a file that DECIDES something is written.
 *
 * The drift it hides is the kind that never announces itself. Two examples that
 * were live when this was first turned on: a section heading naming three status
 * families out of four, and four radius `initial-value`s in px maintained by hand
 * beside their rem originals, with nothing to fail if the two stopped agreeing.
 *
 * Returns a string rather than writing to disk, so the test that keeps the
 * committed file honest is an ordinary assertion.
 */
import {
  ACTION_FAMILIES,
  ACTION_SUFFIXES,
  INPUT_ROLES,
  NEUTRAL_ROLES,
  RADIUS_TOKENS,
  STATUS_FAMILIES,
  STATUS_SUFFIXES,
  SURFACE_ROLES,
} from '../tokens.types.js';

/** The shape of one section of the generated `properties.css`. */
interface RegisteredSection {
  /** Rendered as the section comment. */
  title: string;
  /** A second line of it, where the reason needs saying. */
  note?: string;
  syntax: '<color>' | '<length>';
  vars: readonly string[];
}

const colorVars = (roles: readonly string[]) =>
  roles.map((role) => `--fm-color-${role}`);

const family = (
  families: readonly string[],
  suffixes: readonly string[],
): string[] => families.flatMap((f) => suffixes.map((s) => `${f}${s}`));

export const REGISTERED_SECTIONS: readonly RegisteredSection[] = [
  {
    title: `Action families (${ACTION_FAMILIES.join(' · ')})`,
    syntax: '<color>',
    vars: colorVars(family(ACTION_FAMILIES, ACTION_SUFFIXES)),
  },
  {
    title: `Status roles (${STATUS_FAMILIES.join(' · ')})`,
    syntax: '<color>',
    vars: colorVars(family(STATUS_FAMILIES, STATUS_SUFFIXES)),
  },
  {
    title: 'Neutral + disabled',
    syntax: '<color>',
    vars: colorVars(NEUTRAL_ROLES),
  },
  {
    title: 'Surfaces, text & focus',
    syntax: '<color>',
    vars: colorVars(SURFACE_ROLES),
  },
  { title: 'Form controls', syntax: '<color>', vars: colorVars(INPUT_ROLES) },
  {
    title: 'Radius',
    note: '<length> initial-value must be computationally independent, so NO rem/em (the browser rejects the rule): px equivalents at the 16px root, converted from the real value rather than restated beside it.',
    syntax: '<length>',
    vars: RADIUS_TOKENS.map((token) => `--fm-radius-${token}`),
  },
];

/**
 * The value in `px`, which is the only kind of `<length>` an `@property`
 * `initial-value` will accept: it has to be COMPUTATIONALLY INDEPENDENT, and
 * `rem` is not — a `rem` there makes the browser reject the whole rule, silently,
 * losing both the interpolation and the type guard.
 *
 * Converted from the real value at the 16px root rather than restated beside it,
 * so the two cannot disagree. Throws on anything that is neither `px` nor `rem`
 * (`em`, `calc()`, `clamp()`, a `var()`) instead of emitting a rule the browser
 * will discard.
 */
export function toPixels(value: string): string {
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
 * GENERATED from the contract by \`emitProperties\` in \`@fmmenchi/theme\`; the test
 * beside this file fails if the two disagree. Do not edit by hand — change the
 * roles in that package's \`tokens.types.ts\`, or the sections in the emitter, and
 * re-run the suite with \`-u\`.
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

/**
 * `styles/properties.css`, in full.
 *
 * `emit` rather than `generate`, because this package now has four verbs and they
 * had started to mean the same thing: `parse` takes CSS text to declarations, `to`
 * takes declarations to a typed structure, `generate` takes data to data, and
 * `emit` takes data to the TEXT OF A FILE. `generateProperties` sat under the
 * third name while doing the fourth thing.
 */
export function emitProperties(values: Map<string, string>): string {
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
          : toPixels(values.get(name) ?? '0px');

      return `@property ${name} {\n  syntax: '${section.syntax}';\n  inherits: true;\n  initial-value: ${initial};\n}`;
    });

    return `${heading}\n${blocks.join('\n')}`;
  });

  return `${HEADER}\n${sections.join('\n\n')}\n`;
}
