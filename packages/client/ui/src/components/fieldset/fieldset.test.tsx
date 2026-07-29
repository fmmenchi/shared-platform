import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Fieldset } from './fieldset.component.js';
import { FieldsetLegend } from './fieldset-legend.component.js';
import { FieldsetDescription } from './fieldset-description.component.js';
import { FieldsetContent } from './fieldset-content.component.js';
import { FieldsetError } from './fieldset-error.component.js';
import { Field } from '../field/field.component.js';
import { FieldLabel } from '../field/field-label.component.js';
import { FieldDescription } from '../field/field-description.component.js';
import { Input } from '../input/input.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/** A radio group, the case Fieldset exists for. Radio isn't built yet, so the
 *  options are native inputs — which is also the point: the group wires itself
 *  around ANY control, it never reaches into them. */
function Colours(props: { invalid?: boolean; error?: string }) {
  const { invalid, error } = props;
  return (
    <Fieldset invalid={invalid}>
      <FieldsetLegend>Favourite colour</FieldsetLegend>
      <FieldsetDescription>Pick exactly one.</FieldsetDescription>
      <FieldsetContent>
        <label>
          <input type="radio" name="colour" value="green" /> Green
        </label>
        <label>
          <input type="radio" name="colour" value="yellow" /> Yellow
        </label>
      </FieldsetContent>
      {error === undefined ? null : <FieldsetError>{error}</FieldsetError>}
    </Fieldset>
  );
}

/** A group holding content that cannot wrap, so its min-content width is the
 *  full line — well past the 200px track below. That width is exactly what the UA
 *  `min-inline-size: min-content` pins the whole `<fieldset>` to, so this is the
 *  fixture that makes the reset observable (a long address would NOT: Chromium
 *  breaks lines after hyphens and dots, keeping min-content small). */
function WideGroup(props: { name: string }) {
  return (
    <Fieldset>
      <FieldsetLegend>Notifications</FieldsetLegend>
      <FieldsetDescription>
        <span style={{ whiteSpace: 'nowrap' }}>
          Delivered every morning, and whenever something needs you
        </span>
      </FieldsetDescription>
      <FieldsetContent>
        <label>
          <input type="radio" name={props.name} value="all" /> All
        </label>
      </FieldsetContent>
    </Fieldset>
  );
}

describe('Fieldset', () => {
  afterEach(() => vi.restoreAllMocks());

  it('names the group with its legend', () => {
    render(<Colours />);
    expect(screen.getByRole('group', { name: 'Favourite colour' })).toBeTruthy();
  });

  it('describes the GROUP with the description', async () => {
    render(<Colours />);
    const group = screen.getByRole('group', { name: 'Favourite colour' });
    const desc = screen.getByText('Pick exactly one.');
    await waitFor(() =>
      expect(group.getAttribute('aria-describedby')).toContain(desc.id),
    );
  });

  it('describes the group with the error and marks it invalid for styling', async () => {
    render(<Colours invalid error="Choose a colour." />);
    const group = screen.getByRole('group', { name: 'Favourite colour' });
    expect(group).toHaveAttribute('data-invalid', 'true');
    const err = screen.getByText('Choose a colour.');
    await waitFor(() =>
      expect(group.getAttribute('aria-describedby')).toContain(err.id),
    );
  });

  it('leaves the controls inside untouched — the group is described once, not N times', async () => {
    render(<Colours invalid error="Choose a colour." />);
    const group = screen.getByRole('group', { name: 'Favourite colour' });
    await waitFor(() => expect(group).toHaveAttribute('aria-describedby'));
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toHaveAttribute('aria-describedby');
      expect(radio).not.toHaveAttribute('aria-invalid');
    }
  });

  it('renders no error and adds nothing to aria-describedby when the error is empty', () => {
    render(
      <Fieldset>
        <FieldsetLegend>Empty</FieldsetLegend>
        <FieldsetError>{false}</FieldsetError>
      </Fieldset>,
    );
    const group = screen.getByRole('group', { name: 'Empty' });
    expect(group).not.toHaveAttribute('aria-describedby');
    expect(group).not.toHaveAttribute('data-invalid');
  });

  it('drops the error from aria-describedby when its content clears', async () => {
    const { rerender } = render(<Colours invalid error="Choose a colour." />);
    const group = screen.getByRole('group', { name: 'Favourite colour' });
    const err = screen.getByText('Choose a colour.');
    await waitFor(() =>
      expect(group.getAttribute('aria-describedby')).toContain(err.id),
    );
    rerender(<Colours invalid error="" />);
    await waitFor(() =>
      expect(group.getAttribute('aria-describedby')).not.toContain(err.id),
    );
  });

  it('describes the group with SEVERAL descriptions', async () => {
    render(
      <Fieldset>
        <FieldsetLegend>Contact</FieldsetLegend>
        <FieldsetDescription>We only use it to reply.</FieldsetDescription>
        <FieldsetDescription>One channel is enough.</FieldsetDescription>
      </Fieldset>,
    );
    const group = screen.getByRole('group', { name: 'Contact' });
    const a = screen.getByText('We only use it to reply.');
    const b = screen.getByText('One channel is enough.');
    await waitFor(() => {
      const describedBy = group.getAttribute('aria-describedby') ?? '';
      expect(describedBy).toContain(a.id);
      expect(describedBy).toContain(b.id);
    });
  });

  it('MERGES a consumer aria-describedby instead of letting it replace the group’s', async () => {
    render(
      <Fieldset aria-describedby="external-hint">
        <FieldsetLegend>Contact</FieldsetLegend>
        <FieldsetDescription>We only use it to reply.</FieldsetDescription>
      </Fieldset>,
    );
    const group = screen.getByRole('group', { name: 'Contact' });
    const desc = screen.getByText('We only use it to reply.');
    await waitFor(() => {
      const describedBy = group.getAttribute('aria-describedby') ?? '';
      expect(describedBy).toContain(desc.id);
      expect(describedBy).toContain('external-hint');
    });
  });

  it('disables every control inside via the native disabled attribute', () => {
    render(
      <Fieldset disabled>
        <FieldsetLegend>Favourite colour</FieldsetLegend>
        <FieldsetContent>
          <label>
            <input type="radio" name="colour" value="green" /> Green
          </label>
        </FieldsetContent>
      </Fieldset>,
    );
    expect(screen.getByRole('radio')).toBeDisabled();
  });

  it('nests a Field: its description binds to the FIELD, not to the group', async () => {
    render(
      <Fieldset>
        <FieldsetLegend>Contact</FieldsetLegend>
        <FieldsetDescription>Group note.</FieldsetDescription>
        <FieldsetContent>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input />
            <FieldDescription>Field note.</FieldDescription>
          </Field>
        </FieldsetContent>
      </Fieldset>,
    );
    const group = screen.getByRole('group', { name: 'Contact' });
    const input = screen.getByRole('textbox', { name: 'Email' });
    const groupNote = screen.getByText('Group note.');
    const fieldNote = screen.getByText('Field note.');
    await waitFor(() => {
      expect(input.getAttribute('aria-describedby')).toContain(fieldNote.id);
      expect(group.getAttribute('aria-describedby')).toContain(groupNote.id);
    });
    // Each part describes its OWN owner — no crossing over.
    expect(input.getAttribute('aria-describedby')).not.toContain(groupNote.id);
    expect(group.getAttribute('aria-describedby')).not.toContain(fieldNote.id);
  });

  it('warns when the group has no accessible name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Fieldset>
        <FieldsetContent>
          <input type="radio" name="c" aria-label="Green" />
        </FieldsetContent>
      </Fieldset>,
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('no accessible name'),
    );
  });

  it('does not warn when the name comes from aria-label instead of a legend', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Fieldset aria-label="Favourite colour">
        <FieldsetContent>
          <input type="radio" name="c" aria-label="Green" />
        </FieldsetContent>
      </Fieldset>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  // Every part names ITSELF when orphaned: a description that registers nowhere
  // is invisible otherwise, so silence would be the worst outcome.
  it.each([
    ['FieldsetLegend', <FieldsetLegend key="l">Orphan</FieldsetLegend>],
    [
      'FieldsetDescription',
      <FieldsetDescription key="d">Orphan</FieldsetDescription>,
    ],
    ['FieldsetError', <FieldsetError key="e">Orphan</FieldsetError>],
  ])('warns when %s is used outside a Fieldset', (name, element) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(element);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(`${name}: used outside a <Fieldset>`),
    );
  });

  it('forwards ref to the fieldset element', () => {
    let el: HTMLElement | null = null;
    render(
      <Fieldset
        ref={(node) => {
          el = node;
        }}
      >
        <FieldsetLegend>Favourite colour</FieldsetLegend>
      </Fieldset>,
    );
    expect(el).toBeInstanceOf(HTMLFieldSetElement);
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Colours />);
    expect(container.firstChild).toMatchSnapshot();
  });

  // The two CSS constraints a native <fieldset> imposes, measured in real
  // Chromium rather than trusted: it must shrink as a grid item (the UA
  // `min-inline-size: min-content` is reset), and the legend must not eat the
  // container's gap.
  describe('layout inside a consumer grid', () => {
    it('shrinks to its track in a 2-column grid instead of overflowing', () => {
      renderUi(
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            inlineSize: '400px',
          }}
        >
          <WideGroup name="a" />
          <WideGroup name="b" />
        </div>,
      );
      // Each 1fr track is 200px. Without the reset a <fieldset> is pinned to its
      // min-content width — here the full unwrappable line — and bursts out of
      // the track. (The nowrap TEXT still overflows the box; that is the
      // fixture's own doing and not the fieldset's business to clip.)
      for (const group of screen.getAllByRole('group')) {
        expect(group.getBoundingClientRect().width).toBe(200);
      }
    });

    it('separates the legend from the content even though gap cannot reach it', () => {
      renderUi(<Colours />);
      const legend = screen.getByText('Favourite colour');
      const desc = screen.getByText('Pick exactly one.');
      const gap =
        desc.getBoundingClientRect().top -
        legend.getBoundingClientRect().bottom;
      expect(gap).toBeGreaterThan(0);
    });
  });

  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`no violations — valid + invalid, both orientations / ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
              display: 'grid',
              gap: '1rem',
            }}
          >
            <Colours />
            <Colours invalid error="Choose a colour." />
            <Fieldset>
              <FieldsetLegend>Channels</FieldsetLegend>
              <FieldsetContent orientation="horizontal">
                <label>
                  <input type="checkbox" name="ch" value="email" /> Email
                </label>
                <label>
                  <input type="checkbox" name="ch" value="sms" /> SMS
                </label>
              </FieldsetContent>
            </Fieldset>
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});
