/**
 * READING A STYLESHEET — the two steps between CSS text and a colour you can
 * measure.
 *
 * `readVars` finds the `--fm-*` declarations; `resolveValue` turns one of them
 * into the colour a browser would paint, following `var()` chains and evaluating
 * the relative-colour ramp. Both live here because neither is useful without the
 * other, and neither is a concept a caller needs a name for — they are how
 * `theme.ts` does its job.
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

const VAR_PATTERN = /var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^)]*))?\)/i;

/**
 * Collapse whitespace before matching anything.
 *
 * A formatted stylesheet wraps a long declaration across lines, so the value
 * arrives with newlines in it and the channel patterns below — which use `.` —
 * stop matching. Found by the Storybook chrome generator, which threw on
 * `"oklch(\n"`.
 */
const flatten = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Depth cap: a cycle is a bug in the stylesheet, not something to hang on. */
const MAX_DEPTH = 32;

/** Substitute `var()` references until none remain. */
export function expandVars(
  value: string,
  vars: ReadonlyMap<string, string>,
  depth = 0,
): string {
  if (depth > MAX_DEPTH) {
    throw new Error(
      `var() nesting exceeded ${MAX_DEPTH} levels resolving "${value}" — a reference cycle.`,
    );
  }

  const flat = flatten(value);
  const match = VAR_PATTERN.exec(flat);
  if (match === null) return flat;

  const [whole, name = '', fallback] = match;
  const referenced = vars.get(name) ?? fallback;
  if (referenced === undefined) {
    throw new Error(`${name} is referenced but never declared.`);
  }

  return expandVars(flat.replace(whole, flatten(referenced)), vars, depth + 1);
}

type Channels = { l: number; c: number; h: number; alpha: number };

/** `oklch(L C H)` → channels. Percentages and 0–1 lightness both appear. */
function parseOklch(value: string): Channels | null {
  const match =
    /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?)\s*)?\)$/i.exec(
      value.trim(),
    );
  if (match === null) return null;

  const [, l = '', percent, c = '', h = '', a] = match;
  const lightness = Number(l);
  return {
    l: percent === '%' ? lightness / 100 : lightness,
    c: Number(c),
    h: Number(h),
    // Absent means opaque. Kept because a value that drops its alpha is a
    // DIFFERENT colour, and the gate would then measure something the browser
    // never paints — `scrim` is 94% opaque black, not black.
    alpha:
      a === undefined
        ? 1
        : a.endsWith('%')
          ? Number(a.slice(0, -1)) / 100
          : Number(a),
  };
}

/**
 * One channel of a relative colour: `l`, `c`, `h`, a number, or a single
 * `calc()` applying one operation to the origin's channel.
 *
 * Clamped exactly where CSS clamps — lightness to 0–1 and chroma at 0 — because
 * the ramp's extremes are where a formula runs out of room, and a gate that
 * reports 1.04 lightness is measuring a colour no browser will paint.
 */
function evaluateChannel(expression: string, origin: Channels): number {
  const text = expression.trim();

  const direct = /^(l|c|h|alpha)$/i.exec(text);
  if (direct !== null)
    return origin[direct[1]?.toLowerCase() as keyof Channels];

  if (/^[\d.]+%?$/.test(text)) {
    const raw = Number(text.replace('%', ''));
    return text.endsWith('%') ? raw / 100 : raw;
  }

  const calc =
    /^calc\(\s*(l|c|h|alpha)\s*([+\-*/])\s*([\d.]+)\s*\)$/i.exec(text) ?? null;
  if (calc === null) {
    throw new Error(
      `Unsupported relative-colour channel "${text}". ADR-0032 uses a channel or one calc() with one operation; anything else must be evaluated by a browser, not guessed at here.`,
    );
  }

  const [, channel = '', operator = '', operand = ''] = calc;
  const left = origin[channel.toLowerCase() as keyof Channels];
  const right = Number(operand);

  switch (operator) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    default:
      return right === 0 ? left : left / right;
  }
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

/**
 * `oklch(from <colour> <l> <c> <h>)` → a plain `oklch()`.
 *
 * The origin is resolved first, so `from var(--base)` works once `expandVars`
 * has run over the string.
 */
export function evaluateRelativeOklch(value: string): string {
  const match = /^oklch\(\s*from\s+(oklch\([^)]*\))\s+(.+)\)$/i.exec(
    flatten(value),
  );
  if (match === null) return value;

  const [, originText = '', rest = ''] = match;
  const origin = parseOklch(originText);
  if (origin === null) {
    throw new Error(
      `Relative colour origin "${originText}" is not an oklch() this resolver can read.`,
    );
  }

  // Split on whitespace outside parentheses: the channels are themselves
  // `calc(...)` and contain spaces of their own.
  const channels: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of rest.trim()) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (/\s/.test(character) && depth === 0) {
      if (current !== '') channels.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  if (current !== '') channels.push(current);

  if (channels.length < 3) {
    throw new Error(
      `Relative colour "${value}" declares ${channels.length} channels; three are required.`,
    );
  }

  // `l c h / 0.94` — the slash and what follows are the alpha, which the
  // browser applies and this resolver must not silently drop.
  const slash = channels.indexOf('/');
  const alphaText =
    slash === -1 ? undefined : (channels[slash + 1] ?? undefined);
  const colourChannels = slash === -1 ? channels : channels.slice(0, slash);

  const [lightness = '', chroma = '', hue = ''] = colourChannels;
  const l = clamp(evaluateChannel(lightness, origin), 0, 1);
  const c = Math.max(evaluateChannel(chroma, origin), 0);
  const h = evaluateChannel(hue, origin);

  const round = (n: number, places: number) =>
    Number(n.toFixed(places)).toString();

  const alpha =
    alphaText === undefined ? origin.alpha : evaluateChannel(alphaText, origin);

  const body = `${round(l * 100, 2)}% ${round(c, 4)} ${round(h, 2)}`;
  return alpha >= 1 ? `oklch(${body})` : `oklch(${body} / ${round(alpha, 4)})`;
}

/**
 * A declared value, resolved to something culori can parse: references
 * expanded, then a relative colour evaluated if that is what it turned out to
 * be.
 */
export function resolveValue(
  value: string,
  vars: ReadonlyMap<string, string>,
): string {
  return evaluateRelativeOklch(expandVars(value, vars));
}

/** Every declaration, resolved. Order-independent: each is resolved on demand. */
export function resolveAll(
  vars: ReadonlyMap<string, string>,
): Map<string, string> {
  const resolved = new Map<string, string>();
  for (const [name, value] of vars) {
    resolved.set(name, resolveValue(value, vars));
  }
  return resolved;
}
