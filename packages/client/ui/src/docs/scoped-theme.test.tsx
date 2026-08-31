import { afterEach, describe, expect, it } from 'vitest';

/**
 * CAN A PRESET BE SCOPED TO A CONTAINER, NOT JUST THE ROOT?
 *
 * The theme builder's wizard needs this. Its own chrome must stay on a known-good
 * theme — otherwise a theme with a failing contrast pair takes the controls that
 * would fix it down with it — while the component previews inside each step render
 * under the theme being built. Two themes, one document.
 *
 * The suspicion worth measuring is the primitive layer's own mechanic: a custom
 * property is resolved WHERE IT IS DECLARED, and the ramp is relative colour
 * (`oklch(from var(--base) …)`). Override only a base on a container and the ramp
 * does NOT re-derive, because it already settled at `:root`. A preset declares its
 * bases AND its ramp in one block, so scoping the whole block should work — but
 * "should" is not measured, and the existing override tests only ever target the
 * root element.
 */

const sheets: HTMLStyleElement[] = [];

function appStylesheet(css: string) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  sheets.push(style);
}

/** Resolve a custom property by painting it INSIDE a given element. */
function resolveIn(host: HTMLElement, property: string): string {
  const probe = document.createElement('span');
  probe.style.color = `var(${property})`;
  host.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

const hosts: HTMLElement[] = [];

function container(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('div');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.append(el);
  hosts.push(el);
  return el;
}

afterEach(() => {
  for (const sheet of sheets.splice(0)) sheet.remove();
  for (const host of hosts.splice(0)) host.remove();
  document.documentElement.removeAttribute('data-theme');
});

describe('a preset scoped to a container', () => {
  it('re-derives the whole RAMP inside the container, root untouched', () => {
    const dark = container({ 'data-theme': 'dark' });
    const light = container();

    // A step that exists only as relative colour off the base.
    const inside = resolveIn(dark, '--fm-palette-primary-700');
    const outside = resolveIn(light, '--fm-palette-primary-700');

    expect(inside).not.toBe(outside);
  });

  it('carries the ROLES too, so components inside change', () => {
    const dark = container({ 'data-theme': 'dark' });
    const light = container();

    expect(resolveIn(dark, '--fm-color-primary')).not.toBe(
      resolveIn(light, '--fm-color-primary'),
    );
    expect(resolveIn(dark, '--fm-color-background')).not.toBe(
      resolveIn(light, '--fm-color-background'),
    );
  });

  it('leaves a SIBLING container on the root theme — two themes, one document', () => {
    const dark = container({ 'data-theme': 'dark' });
    const chrome = container();

    const rootValue = resolveIn(document.body, '--fm-color-primary');
    expect(resolveIn(chrome, '--fm-color-primary')).toBe(rootValue);
    expect(resolveIn(dark, '--fm-color-primary')).not.toBe(rootValue);
  });

  it('does NOT re-derive the ramp when only the BASE is overridden on a container', () => {
    // The trap the wizard must avoid: a base override alone is inert on a
    // subtree, because the ramp settled where it was declared (`:root`).
    const scoped = container({ class: 'scoped-base-only' });
    appStylesheet(
      '.scoped-base-only { --fm-palette-primary-base: oklch(55% 0.19 27); }',
    );

    // Proof the override REACHED the container, so the assertion below is not
    // vacuously green on a stylesheet that never applied.
    expect(resolveIn(scoped, '--fm-palette-primary-base')).not.toBe(
      resolveIn(document.body, '--fm-palette-primary-base'),
    );

    const stepInside = resolveIn(scoped, '--fm-palette-primary-700');
    const stepOutside = resolveIn(document.body, '--fm-palette-primary-700');

    expect(stepInside).toBe(stepOutside);
  });

  it('takes a LITERAL lightness while still inheriting hue and chroma from the base', () => {
    // The two derivation models are not a fork: relative colour allows a literal
    // channel, so a rung can anchor its lightness absolutely — the property that
    // makes a distance rule invariant — and STILL read hue and chroma from the
    // base, which is what keeps "override the base and the family follows" true.
    // Measured in the browser rather than in the resolver, because the browser is
    // what ships.
    const scoped = container({ class: 'anchored' });
    appStylesheet(`.anchored {
      --fm-palette-primary-base: oklch(55% 0.19 27);
      --anchored-rung: oklch(from var(--fm-palette-primary-base) 0.41 calc(c * 0.96) h);
      --offset-rung: oklch(
        from var(--fm-palette-primary-base) calc(l - 0.14) calc(c * 0.96) h
      );
    }`);

    // Same base at L 0.55: an absolute 0.41 and an offset of -0.14 must agree.
    expect(resolveIn(scoped, '--anchored-rung')).toBe(
      resolveIn(scoped, '--offset-rung'),
    );

    // And the literal form still follows the base's HUE — the freedom that a
    // Material-style absolute tone would otherwise cost us.
    const shifted = container({ class: 'anchored-shifted' });
    appStylesheet(`.anchored-shifted {
      --fm-palette-primary-base: oklch(55% 0.19 256);
      --anchored-rung: oklch(from var(--fm-palette-primary-base) 0.41 calc(c * 0.96) h);
    }`);
    expect(resolveIn(shifted, '--anchored-rung')).not.toBe(
      resolveIn(scoped, '--anchored-rung'),
    );
  });

  it('DOES re-derive when the base and the ramp are declared together', () => {
    // What a generated preset must therefore emit: the block, not just the seven
    // numbers. One step is enough to show the mechanic.
    const scoped = container({ class: 'scoped-block' });
    appStylesheet(`.scoped-block {
      --fm-palette-primary-base: oklch(55% 0.19 27);
      --fm-palette-primary-700: oklch(
        from var(--fm-palette-primary-base) calc(l - 0.14) calc(c * 0.96) h
      );
    }`);

    const stepInside = resolveIn(scoped, '--fm-palette-primary-700');
    const stepOutside = resolveIn(document.body, '--fm-palette-primary-700');

    expect(stepInside).not.toBe(stepOutside);
  });
});

/**
 * CAN A PRESET BE JUST ITS BASES?
 *
 * The suite above measures the mechanic as the contract ships it: the ramp is
 * declared on `:root`, so it settles there, and a container that overrides only a
 * base inherits a value already computed from the ROOT's base. Inert. A preset
 * therefore has to carry its bases AND its ramp AND its roles — ~150 lines, and a
 * consumer's theme is a copy of ours rather than an instance of it.
 *
 * MEASURED AND NOT ADOPTED. Declaring the ramp and the roles on
 * `:root, [data-theme]` instead of `:root` alone makes a themed element recompute
 * the whole chain from its own base, and a preset collapses to the eight colours a
 * brand hands over. It works — every case below passes — and the road was still
 * refused, on grounds the tests cannot see: a preset that carries its values is
 * something you can open and read, while one that carries eight numbers is legible
 * only to someone who knows where a custom property resolves. A theme is
 * regenerated from its source when its source changes; that is a build step, not a
 * cascade trick, and a build step is inspectable when it goes wrong.
 *
 * They stay because the MECHANIC is worth pinning either way — the wizard has to
 * know that a base-only override is inert — and because the next person to have
 * this idea should find the measurement instead of repeating it.
 *
 * These tests build that arrangement from scratch on private `--probe-*` names
 * rather than reconfiguring the shipped `--fm-*` ones: the question is whether
 * the CSS mechanic works, and asking it of the real tokens would also be asking
 * whether the rest of the suite still passes, which is a different question.
 */
describe('a preset that is only its bases', () => {
  /** The shipped arrangement: ramp and role declared on the root alone. */
  const onRootOnly = `
    :root {
      --probe-base: oklch(55% 0.14 255);
      --probe-700: oklch(from var(--probe-base) calc(l - 0.14) calc(c * 0.96) h);
      --probe-color: var(--probe-700);
    }
  `;

  /** The proposal: the same declarations also apply to any themed element. */
  const onRootAndTheme = `
    :root,
    [data-probe-theme] {
      --probe-base: oklch(55% 0.14 255);
      --probe-700: oklch(from var(--probe-base) calc(l - 0.14) calc(c * 0.96) h);
      --probe-color: var(--probe-700);
    }
  `;

  it('is INERT under the shipped arrangement — the ramp settled at :root', () => {
    appStylesheet(onRootOnly);
    appStylesheet(
      `[data-probe-theme='acme'] { --probe-base: oklch(70% 0.2 30); }`,
    );

    const themed = container({ 'data-probe-theme': 'acme' });
    const plain = container();

    // The base itself does change on the container...
    expect(resolveIn(themed, '--probe-base')).not.toBe(
      resolveIn(plain, '--probe-base'),
    );
    // ...and nothing derived from it moves, which is the whole problem.
    expect(resolveIn(themed, '--probe-700')).toBe(
      resolveIn(plain, '--probe-700'),
    );
    expect(resolveIn(themed, '--probe-color')).toBe(
      resolveIn(plain, '--probe-color'),
    );
  });

  it('RE-DERIVES when the ramp is declared on `:root, [data-theme]` too', () => {
    appStylesheet(onRootAndTheme);
    appStylesheet(
      `[data-probe-theme='acme'] { --probe-base: oklch(70% 0.2 30); }`,
    );

    const themed = container({ 'data-probe-theme': 'acme' });
    const plain = container();

    expect(resolveIn(themed, '--probe-700')).not.toBe(
      resolveIn(plain, '--probe-700'),
    );
    expect(resolveIn(themed, '--probe-color')).not.toBe(
      resolveIn(plain, '--probe-color'),
    );
  });

  it('re-derives from the CONTAINER’s base, not from some average of the two', () => {
    // The value must be exactly what the brand's base produces — otherwise the
    // arrangement works by accident and the contrast measured on it is fiction.
    appStylesheet(onRootAndTheme);
    appStylesheet(
      `[data-probe-theme='acme'] { --probe-base: oklch(70% 0.2 30); }`,
    );
    appStylesheet(
      `[data-probe-check] { --probe-base: oklch(70% 0.2 30);
         --probe-700: oklch(from var(--probe-base) calc(l - 0.14) calc(c * 0.96) h); }`,
    );

    const themed = container({ 'data-probe-theme': 'acme' });
    const spelled = container({ 'data-probe-check': '' });

    expect(resolveIn(themed, '--probe-700')).toBe(
      resolveIn(spelled, '--probe-700'),
    );
  });

  it('leaves a SIBLING on the root theme — still two themes, one document', () => {
    appStylesheet(onRootAndTheme);
    appStylesheet(
      `[data-probe-theme='acme'] { --probe-base: oklch(70% 0.2 30); }`,
    );

    const themed = container({ 'data-probe-theme': 'acme' });
    const chrome = container();

    const rootValue = resolveIn(document.body, '--probe-color');
    expect(resolveIn(chrome, '--probe-color')).toBe(rootValue);
    expect(resolveIn(themed, '--probe-color')).not.toBe(rootValue);
  });

  it('lets a preset OVERRIDE one rung and keep deriving the rest', () => {
    // The case that made `--from` too narrow: a person nudges one step by hand.
    // It has to win without stopping everything else from deriving.
    appStylesheet(onRootAndTheme);
    appStylesheet(`
      [data-probe-theme='acme'] {
        --probe-base: oklch(70% 0.2 30);
        --probe-700: oklch(45% 0.14 260);
      }
    `);

    const themed = container({ 'data-probe-theme': 'acme' });

    // The hand-set rung wins…
    expect(resolveIn(themed, '--probe-700')).toBe('oklch(0.45 0.14 260)');
    // …and the role still points through it.
    expect(resolveIn(themed, '--probe-color')).toBe(
      resolveIn(themed, '--probe-700'),
    );
  });

  it('NESTS — a themed container inside a themed container', () => {
    appStylesheet(onRootAndTheme);
    appStylesheet(`
      [data-probe-theme='acme'] { --probe-base: oklch(70% 0.2 30); }
      [data-probe-theme='noir'] { --probe-base: oklch(30% 0.05 200); }
    `);

    const outer = container({ 'data-probe-theme': 'acme' });
    const inner = document.createElement('div');
    inner.setAttribute('data-probe-theme', 'noir');
    outer.append(inner);

    expect(resolveIn(inner, '--probe-color')).not.toBe(
      resolveIn(outer, '--probe-color'),
    );
  });
});
