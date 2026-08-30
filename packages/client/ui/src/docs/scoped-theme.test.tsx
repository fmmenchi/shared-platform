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
