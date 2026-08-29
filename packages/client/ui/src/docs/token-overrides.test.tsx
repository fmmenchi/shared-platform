import { afterEach, describe, expect, it } from 'vitest';

/**
 * THE APP THAT INSTANTIATES THE THEME CAN STILL CHANGE ANYTHING.
 *
 * This is the promise the primitive layer has to keep (ADR-0032), and the one a
 * derived system is most suspected of breaking: if a role is
 * `var(--fm-palette-primary-700)` rather than a colour, can a consumer still
 * set the colour it wants? Yes — at two granularities, and the difference is
 * the whole point:
 *
 * - override a BASE and the family moves with it, every step recomputing,
 *   because the ramp is relative colour evaluated live. That did not exist when
 *   the roles held 84 literals: a rebrand was 84 edits, now it is seven;
 * - override a ROLE and only that role moves, exactly as before. This is the
 *   documented escape hatch for a tuning the ramp cannot express.
 *
 * Written the way a consumer actually does it — a stylesheet of its own,
 * targeting the same selectors the preset uses — rather than with inline styles,
 * which would win trivially and prove nothing about the cascade.
 */

const sheets: HTMLStyleElement[] = [];

/** Append a stylesheet the way an app's own CSS would arrive: after ours. */
function appStylesheet(css: string) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  sheets.push(style);
}

/** Resolve a custom property by painting it, so `var()` chains collapse. */
function resolve(property: string): string {
  const probe = document.createElement('span');
  probe.style.color = `var(${property})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

afterEach(() => {
  for (const sheet of sheets.splice(0)) sheet.remove();
});

describe('a consumer overriding the theme', () => {
  it('moves a whole family by overriding its BASE', () => {
    const before = {
      fill: resolve('--fm-color-primary'),
      hover: resolve('--fm-color-primary-hover'),
      subtle: resolve('--fm-color-primary-subtle'),
      step800: resolve('--fm-palette-primary-800'),
    };

    // A rebrand: one number, in the consumer's own stylesheet.
    appStylesheet(':root { --fm-palette-primary-base: oklch(55% 0.14 30); }');

    // Every derived step follows, because the ramp is evaluated live.
    expect(resolve('--fm-palette-primary-800')).not.toBe(before.step800);

    // And so do the roles that point at the steps — which is what makes a brand
    // preset seven numbers rather than eighty-four.
    expect(resolve('--fm-color-primary')).not.toBe(before.fill);
    expect(resolve('--fm-color-primary-hover')).not.toBe(before.hover);
    expect(resolve('--fm-color-primary-subtle')).not.toBe(before.subtle);
  });

  it('changes ONE role without disturbing its neighbours', () => {
    const neighbours = {
      fill: resolve('--fm-color-primary'),
      active: resolve('--fm-color-primary-active'),
      step800: resolve('--fm-palette-primary-800'),
    };

    appStylesheet(':root { --fm-color-primary-hover: oklch(70% 0.2 130); }');

    // The hand tuning wins over the ramp.
    expect(resolve('--fm-color-primary-hover')).toBe('oklch(0.7 0.2 130)');

    // The escape hatch is LOCAL: taking one role out of the ramp leaves the
    // ramp, and every other role on it, untouched. That is the property that
    // makes it safe to use for one stubborn case.
    expect(resolve('--fm-color-primary')).toBe(neighbours.fill);
    expect(resolve('--fm-color-primary-active')).toBe(neighbours.active);
    expect(resolve('--fm-palette-primary-800')).toBe(neighbours.step800);
  });

  it('can retheme the dark preset from the app, on its own selector', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const before = resolve('--fm-color-primary');

    // The preset's own selector, re-declared later by the consumer.
    appStylesheet(
      "[data-theme='dark'] { --fm-color-primary: oklch(80% 0.15 300); }",
    );

    expect(resolve('--fm-color-primary')).toBe('oklch(0.8 0.15 300)');
    expect(resolve('--fm-color-primary')).not.toBe(before);

    document.documentElement.removeAttribute('data-theme');
  });
});
