import { describe, expect, it } from 'vitest';
import { parse as parseColor } from 'culori';
import { evaluateRelativeOklch, expandVars, resolveValue } from './resolve.js';

/**
 * The resolver is what keeps the contrast gate able to SEE the derived values
 * (ADR-0032). Its own correctness therefore has to be checked directly: a
 * resolver that quietly gets a channel wrong turns the gate green on the wrong
 * number, which is worse than having no gate at all.
 */

const vars = new Map<string, string>([
  ['--fm-primary-base', 'oklch(55% 0.14 255)'],
  ['--fm-alias', 'var(--fm-primary-base)'],
  ['--fm-loop-a', 'var(--fm-loop-b)'],
  ['--fm-loop-b', 'var(--fm-loop-a)'],
]);

describe('expandVars', () => {
  it('substitutes a reference', () => {
    expect(expandVars('var(--fm-primary-base)', vars)).toBe(
      'oklch(55% 0.14 255)',
    );
  });

  it('follows a chain of references', () => {
    expect(expandVars('var(--fm-alias)', vars)).toBe('oklch(55% 0.14 255)');
  });

  it('uses the fallback when the token is undeclared', () => {
    expect(expandVars('var(--fm-missing, oklch(50% 0 0))', vars)).toBe(
      'oklch(50% 0 0)',
    );
  });

  it('refuses an undeclared reference rather than dropping it', () => {
    // Silently yielding an empty string is how a broken chain reaches a gate
    // looking like a valid colour.
    expect(() => expandVars('var(--fm-missing)', vars)).toThrow(
      /never declared/,
    );
  });

  it('refuses a reference cycle instead of hanging', () => {
    expect(() => expandVars('var(--fm-loop-a)', vars)).toThrow(/cycle/);
  });
});

describe('evaluateRelativeOklch', () => {
  const origin = 'oklch(55% 0.14 255)';

  it('subtracts from lightness and scales chroma', () => {
    const out = evaluateRelativeOklch(
      `oklch(from ${origin} calc(l - 0.1) calc(c * 0.86) h)`,
    );
    // 0.55 - 0.10 = 0.45; 0.14 * 0.86 = 0.1204; hue passed through.
    expect(out).toBe('oklch(45% 0.1204 255)');
  });

  it('adds to lightness', () => {
    expect(
      evaluateRelativeOklch(`oklch(from ${origin} calc(l + 0.35) c h)`),
    ).toBe('oklch(90% 0.14 255)');
  });

  it('clamps lightness at 1, where a formula runs out of room', () => {
    // 0.55 + 0.60 = 1.15. A gate reporting a lightness above 1 is measuring a
    // colour no browser will paint.
    expect(
      evaluateRelativeOklch(`oklch(from ${origin} calc(l + 0.6) c h)`),
    ).toBe('oklch(100% 0.14 255)');
  });

  it('clamps chroma at 0', () => {
    expect(evaluateRelativeOklch(`oklch(from ${origin} l calc(c * 0) h)`)).toBe(
      'oklch(55% 0 255)',
    );
  });

  it('accepts a literal channel', () => {
    expect(evaluateRelativeOklch(`oklch(from ${origin} 20% 0.05 30)`)).toBe(
      'oklch(20% 0.05 30)',
    );
  });

  it('reads a value wrapped across lines', () => {
    // How a formatted stylesheet actually stores a long declaration. The
    // Storybook chrome generator hit this and threw on `"oklch(\n"`.
    const wrapped = `oklch(\n  from ${origin}\n  calc(l - 0.14)\n  calc(c * 0.96)\n  h\n)`;
    expect(evaluateRelativeOklch(wrapped)).toBe('oklch(41% 0.1344 255)');
  });

  it('carries the alpha through', () => {
    // A value that drops its alpha is a different colour, and the gate would
    // then measure something the browser never paints: `scrim` is 94% opaque
    // black, not black.
    expect(evaluateRelativeOklch(`oklch(from ${origin} l c h / 0.94)`)).toBe(
      'oklch(55% 0.14 255 / 0.94)',
    );
  });

  it('keeps the origin alpha when none is given', () => {
    expect(
      evaluateRelativeOklch('oklch(from oklch(20% 0.02 256 / 0.9) l c h)'),
    ).toBe('oklch(20% 0.02 256 / 0.9)');
  });

  it('leaves a plain oklch() alone', () => {
    expect(evaluateRelativeOklch(origin)).toBe(origin);
  });

  it('refuses a channel expression it cannot evaluate', () => {
    // Two operations in one calc() is exactly the kind of thing a browser
    // handles and this resolver must not pretend to.
    expect(() =>
      evaluateRelativeOklch(`oklch(from ${origin} calc(l * 2 - 0.1) c h)`),
    ).toThrow(/Unsupported relative-colour channel/);
  });

  it('refuses a relative colour with too few channels', () => {
    expect(() =>
      evaluateRelativeOklch(`oklch(from ${origin} calc(l - 0.1) c)`),
    ).toThrow(/three are required/);
  });
});

describe('resolveValue', () => {
  it('resolves a ramp step end to end', () => {
    const out = resolveValue(
      'oklch(from var(--fm-primary-base) calc(l - 0.19) calc(c * 0.53) h)',
      vars,
    );
    expect(out).toBe('oklch(36% 0.0742 255)');
  });

  it('produces something culori can parse — the whole point', () => {
    const out = resolveValue(
      'oklch(from var(--fm-alias) calc(l + 0.49) calc(c * 0.36) h)',
      vars,
    );
    expect(parseColor(out)).toBeDefined();
  });
});
