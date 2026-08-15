import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../components/input/input.component.js';
import { Select } from '../components/select/select.component.js';
import { Combobox } from '../components/combobox/combobox.component.js';

/**
 * THE SHARED CONTROL UTILITIES, asserted directly — because until now nothing
 * did.
 *
 * `control-box` and its family were extracted from `Input` and `Select` so a
 * third control could not restate nine decisions a fourth time. An adversarial
 * review then made the point that the extraction moved those nine decisions
 * into one place and added no test for any of them: emptied, `control-box`'s
 * focus ring, `control-box`'s fill, `control-disabled` and
 * `control-forced-colors` all left the whole suite green. `control-invalid` was
 * caught for its COLOUR and not its WEIGHT, so `border-2` could go and take the
 * "not by colour alone" claim with it.
 *
 * That is not hypothetical drift: the utility's own comment records `NavGroup`
 * hand-rolling the first two lines of a button and shipping with no focus ring
 * at all, invisible to every test because the test page has no Preflight.
 *
 * MEASURED AGAINST THE BROWSER'S OWN CONTROL, not against a literal. The claim
 * these utilities make is "I render the same regardless of the page hosting
 * me", and its opposite is "I render like whatever the UA does" — so a bare
 * `<input>` outside React is the control, and a colour asserted as a hex string
 * would only pin the theme. `forced-colors.test.ts` covers the last of the four
 * by a different route (it greps the component stylesheets), and cannot see
 * this file at all: its glob is `components/**`.
 */

/** An `<input>` the design system never touched — the UA's own idea of a field. */
const untouched = () => {
  const node = document.createElement('input');
  node.type = 'text';
  document.body.append(node);
  return node;
};

const paint = (node: Element) => {
  const style = getComputedStyle(node);
  return {
    background: style.backgroundColor,
    color: style.color,
    borderColor: style.borderTopColor,
    borderWidth: style.borderTopWidth,
    radius: style.borderTopLeftRadius,
    cursor: style.cursor,
    ring:
      style.outlineStyle === 'none' ? 0 : Number.parseFloat(style.outlineWidth),
  };
};

afterEach(() => {
  for (const stray of document.querySelectorAll('body > input')) {
    stray.remove();
  }
});

interface City {
  id: string;
  name: string;
}
const ITEMS: City[] = [{ id: '1', name: 'A' }];

/** The three controls that share the box, each drawn with or without the state. */
const controls = [
  [
    'Input',
    (invalid?: boolean) => (
      <Input aria-label="q" aria-invalid={invalid ? 'true' : undefined} />
    ),
    'textbox',
  ],
  [
    'Select',
    (invalid?: boolean) => (
      <Select aria-label="q" aria-invalid={invalid ? 'true' : undefined}>
        <option value="a">A</option>
      </Select>
    ),
    'combobox',
  ],
  [
    'Combobox',
    (invalid?: boolean) => (
      <Combobox
        aria-label="q"
        aria-invalid={invalid ? 'true' : undefined}
        items={ITEMS}
        getKey={(city: City) => city.id}
        getLabel={(city: City) => city.name}
      />
    ),
    'combobox',
  ],
] as const;

describe('control-box', () => {
  for (const [name, draw, role] of controls) {
    it(`gives ${name} a box the browser would not have drawn`, () => {
      const bare = paint(untouched());
      render(draw());
      const ours = paint(screen.getByRole(role, { name: 'q' }));

      // The fill, the text colour and the border are the three `input-*` roles
      // `control-box` applies. Each is free to be deleted today: no test in the
      // package reads the background of any of these three controls, and the
      // axe runs cannot see it either, since an empty field gives
      // `color-contrast` no text to judge.
      expect(ours.background).not.toBe(bare.background);
      expect(ours.color).not.toBe(bare.color);
      expect(ours.borderColor).not.toBe(bare.borderColor);
      // The radius, which is what stops it reading as the platform's own field.
      expect(Number.parseFloat(ours.radius)).toBeGreaterThan(0);
    });

    // MEASURED, mutation by mutation: emptying the ring rule fails Input and
    // Combobox and NOT Select, which keeps a ring of its own — `.select:focus`,
    // there because Firefox does not match `:focus-visible` on a clicked
    // select. So this pins the guarantee for all three and the utility for two,
    // which is the honest reading of it.
    it(`rings ${name} on focus, which is the one NavGroup shipped without`, () => {
      render(draw());
      const node = screen.getByRole(role, { name: 'q' });
      node.focus();

      // A control that accepts keyboard input matches `:focus-visible` whenever
      // it is focused, however focus arrived — so this reads the real rule and
      // not a `:focus` approximation of it.
      expect(paint(node).ring).toBe(2);
    });
  }
});

describe('control-invalid', () => {
  for (const [name, draw, role] of controls) {
    it(`marks ${name} by weight as well as colour (WCAG 1.4.1)`, () => {
      const { unmount } = render(draw());
      const valid = paint(screen.getByRole(role, { name: 'q' }));
      unmount();

      // `aria-invalid` and never a prop — the attribute a form library already
      // sets (ADR-0013).
      render(draw(true));
      const invalid = paint(screen.getByRole(role, { name: 'q' }));

      // The COLOUR — which one existing assertion already pins for `Input`.
      expect(invalid.borderColor).not.toBe(valid.borderColor);
      // And the WEIGHT, which nothing did. Dropped, the state is carried by
      // colour alone, and the forced-colors fallback goes with it: there the
      // token border colour is replaced by the system's, so the extra pixel is
      // all that is left to say "invalid".
      expect(Number.parseFloat(invalid.borderWidth)).toBeGreaterThan(
        Number.parseFloat(valid.borderWidth),
      );
      expect(name).toBeTruthy();
    });
  }
});

describe('control-disabled', () => {
  it('dims the VALUE, not only the fill', () => {
    const { unmount } = render(<Input aria-label="q" defaultValue="Milano" />);
    const enabled = paint(screen.getByRole('textbox', { name: 'q' }));
    unmount();

    render(<Input aria-label="q" defaultValue="Milano" disabled />);
    const disabled = paint(screen.getByRole('textbox', { name: 'q' }));

    // Every disabled assertion in this package is `toBeDisabled()` — the
    // attribute. The utility's stated reason is that the attribute was not
    // enough: with the fill alone the value stayed at full contrast, so a
    // disabled field read as an editable one holding text. Axe cannot help,
    // since it exempts disabled controls from contrast.
    expect(disabled.color).not.toBe(enabled.color);
    expect(disabled.background).not.toBe(enabled.background);
    expect(disabled.cursor).toBe('not-allowed');
  });
});
