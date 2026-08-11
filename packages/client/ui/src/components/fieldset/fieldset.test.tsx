import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState, type ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Fieldset } from './fieldset.component.js';
import { FieldsetLegend } from '../fieldset-legend/fieldset-legend.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldsetContent } from '../fieldset-content/fieldset-content.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { Field } from '../field/field.component.js';
import { FieldLabel } from '../field-label/field-label.component.js';
import { Input } from '../input/input.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/** A radio group, the case Fieldset exists for. Radio isn't built yet, so the
 *  options are native inputs — which is also the point: the group wires itself
 *  around ANY control, it never reaches into them. `name` is a REQUIRED prop
 *  because `name`, not the fieldset, is what scopes a radio group: two fixtures
 *  sharing one name would silently merge into a single group. */
function Colours(props: { name: string; invalid?: boolean; error?: string }) {
  const { name, invalid, error } = props;
  return (
    <Fieldset invalid={invalid}>
      <FieldsetLegend>Favourite colour</FieldsetLegend>
      <FieldDescription>Pick exactly one.</FieldDescription>
      <FieldsetContent>
        <label>
          <input type="radio" name={name} value="green" /> Green
        </label>
        <label>
          <input type="radio" name={name} value="yellow" /> Yellow
        </label>
      </FieldsetContent>
      {error === undefined ? null : <FieldError>{error}</FieldError>}
    </Fieldset>
  );
}

/** Mounts `children` only once its OWN button is clicked, so the surrounding
 *  `Fieldset` never re-renders and its `children` prop keeps its identity. That is
 *  the shape a deps-based re-check cannot see: the DOM changes underneath a parent
 *  that was never told. */
function Reveal(props: { children: ReactNode }) {
  const [shown, setShown] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setShown(true)}>
        reveal
      </button>
      {shown ? props.children : null}
    </>
  );
}

describe('Fieldset', () => {
  afterEach(() => vi.restoreAllMocks());

  it('names the group with its legend', () => {
    render(<Colours name="a" />);
    expect(
      screen.getByRole('group', { name: 'Favourite colour' }),
    ).toBeTruthy();
  });

  it('describes the GROUP with the description', async () => {
    render(<Colours name="a" />);
    const group = screen.getByRole('group', { name: 'Favourite colour' });
    const desc = screen.getByText('Pick exactly one.');
    await waitFor(() =>
      expect(group.getAttribute('aria-describedby')).toContain(desc.id),
    );
  });

  it('describes the group with the error and marks it invalid for styling', async () => {
    render(<Colours name="a" invalid error="Choose a colour." />);
    const group = screen.getByRole('group', { name: 'Favourite colour' });
    expect(group).toHaveAttribute('data-invalid', 'true');
    const err = screen.getByText('Choose a colour.');
    await waitFor(() =>
      expect(group.getAttribute('aria-describedby')).toContain(err.id),
    );
  });

  it('leaves the controls inside untouched — the group is described once, not N times', async () => {
    render(<Colours name="a" invalid error="Choose a colour." />);
    const group = screen.getByRole('group', { name: 'Favourite colour' });
    await waitFor(() => expect(group).toHaveAttribute('aria-describedby'));
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toHaveAttribute('aria-describedby');
      expect(radio).not.toHaveAttribute('aria-invalid');
    }
  });

  // `aria-invalid` is not a supported attribute on role=group, so it appears only
  // when the consumer opts into the one role a <fieldset> may take that does.
  it('exposes aria-invalid only when the group is a radiogroup', () => {
    const { rerender } = render(
      <Fieldset invalid>
        <FieldsetLegend>Colour</FieldsetLegend>
      </Fieldset>,
    );
    expect(screen.getByRole('group')).not.toHaveAttribute('aria-invalid');

    rerender(
      <Fieldset invalid role="radiogroup">
        <FieldsetLegend>Colour</FieldsetLegend>
      </Fieldset>,
    );
    const radiogroup = screen.getByRole('radiogroup', { name: 'Colour' });
    expect(radiogroup).toHaveAttribute('aria-invalid', 'true');
  });
  it('describes the group with SEVERAL descriptions, in DOM order', async () => {
    render(
      <Fieldset>
        <FieldsetLegend>Contact</FieldsetLegend>
        <FieldDescription>We only use it to reply.</FieldDescription>
        <FieldDescription>One channel is enough.</FieldDescription>
      </Fieldset>,
    );
    const group = screen.getByRole('group', { name: 'Contact' });
    const a = screen.getByText('We only use it to reply.');
    const b = screen.getByText('One channel is enough.');
    await waitFor(() =>
      expect(group.getAttribute('aria-describedby')?.split(' ')).toEqual([
        a.id,
        b.id,
      ]),
    );
  });

  // aria-describedby order IS announcement order, and registration runs in effect
  // order — so a part that mounts LATE must still be announced where it sits.
  it('orders by DOM position even when a part mounts late', async () => {
    const user = userEvent.setup();
    render(
      <Fieldset invalid>
        <FieldsetLegend>Colour</FieldsetLegend>
        <Reveal>
          <FieldDescription>Hint, first in DOM.</FieldDescription>
        </Reveal>
        <FieldError>Error, second in DOM.</FieldError>
      </Fieldset>,
    );
    const group = screen.getByRole('group', { name: 'Colour' });
    const error = screen.getByText('Error, second in DOM.');
    // The error registered first, alone. Now the hint arrives ABOVE it.
    await waitFor(() =>
      expect(group.getAttribute('aria-describedby')).toBe(error.id),
    );
    await user.click(screen.getByRole('button', { name: 'reveal' }));
    const hint = await screen.findByText('Hint, first in DOM.');
    await waitFor(() =>
      expect(group.getAttribute('aria-describedby')?.split(' ')).toEqual([
        hint.id,
        error.id,
      ]),
    );
  });

  it('MERGES a consumer aria-describedby instead of letting it replace the group’s', async () => {
    render(
      <Fieldset aria-describedby="external-hint">
        <FieldsetLegend>Contact</FieldsetLegend>
        <FieldDescription>We only use it to reply.</FieldDescription>
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

  it('keeps data-invalid even when a spread forwards a stale one', () => {
    render(
      <Fieldset invalid {...{ 'data-invalid': undefined }}>
        <FieldsetLegend>Colour</FieldsetLegend>
      </Fieldset>,
    );
    expect(screen.getByRole('group')).toHaveAttribute('data-invalid', 'true');
  });

  it('disables every control inside via the native disabled attribute', () => {
    render(
      <Fieldset disabled>
        <FieldsetLegend>Favourite colour</FieldsetLegend>
        <FieldsetContent>
          <label>
            <input type="radio" name="disabled-group" value="green" /> Green
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
        <FieldDescription>Group note.</FieldDescription>
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

  describe('the unnamed-group warning', () => {
    it('fires for a group with no name, and not once a name is there', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const unnamed = (
        <Fieldset>
          <FieldsetContent>
            <input type="radio" name="w1" aria-label="Green" />
          </FieldsetContent>
        </Fieldset>
      );
      const { unmount } = render(unnamed);
      // Positive control first: without it, the negative case below would pass
      // even with the whole warning deleted.
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('no accessible name'),
      );
      unmount();

      warn.mockClear();
      render(
        <Fieldset aria-label="Favourite colour">
          <FieldsetContent>
            <input type="radio" name="w2" aria-label="Green" />
          </FieldsetContent>
        </Fieldset>,
      );
      expect(warn).not.toHaveBeenCalled();
    });

    it('fires for an EMPTY legend — presence is not a name', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <Fieldset>
          <FieldsetLegend>{''}</FieldsetLegend>
        </Fieldset>,
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('no accessible name'),
      );
    });

    it('fires for a blank aria-label', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(<Fieldset aria-label="  " />);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('no accessible name'),
      );
    });

    // The legend's presence is owned by a DESCENDANT's state here, so `children`
    // never changes identity — the case a deps-based re-check cannot see, which
    // would leave a false accusation standing for the rest of the session.
    it('clears once a legend owned by a child arrives', async () => {
      const user = userEvent.setup();
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <Fieldset>
          <Reveal>
            <FieldsetLegend>Late name</FieldsetLegend>
          </Reveal>
        </Fieldset>,
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('no accessible name'),
      );

      warn.mockClear();
      await user.click(screen.getByRole('button', { name: 'reveal' }));
      await screen.findByRole('group', { name: 'Late name' });
      // The observer re-measured, so nothing keeps accusing a group that IS named.
      await waitFor(() => expect(warn).not.toHaveBeenCalled());
    });
  });
  // The point of the shared slot: ONE description component, bound by position.
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

  // A React 19 ref may RETURN its cleanup, in which case React never calls it
  // with null. Merging the internal ref must not swallow that.
  it('runs a consumer ref’s returned cleanup on unmount', () => {
    const events: string[] = [];
    const { unmount } = render(
      <Fieldset
        ref={() => {
          events.push('attach');
          return () => {
            events.push('cleanup');
          };
        }}
      >
        <FieldsetLegend>Favourite colour</FieldsetLegend>
      </Fieldset>,
    );
    unmount();
    expect(events).toEqual(['attach', 'cleanup']);
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Colours name="snap" />);
    expect(container.firstChild).toMatchSnapshot();
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
            <Colours name="axe-valid" />
            <Colours name="axe-invalid" invalid error="Choose a colour." />
            <Fieldset>
              <FieldsetLegend>Channels</FieldsetLegend>
              <FieldsetContent orientation="horizontal">
                <label>
                  <input type="checkbox" name="axe-ch" value="email" /> Email
                </label>
                <label>
                  <input type="checkbox" name="axe-ch" value="sms" /> SMS
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

  it("keeps a consumer's own aria-invalid, like it keeps their describedby", () => {
    // The attribute rode in through the spread and was overwritten with
    // `undefined` when the `invalid` prop was absent — deleted from the DOM.
    // Transparency (ADR-0013) on the exact element that honours it for the
    // twin attribute two lines up.
    render(
      <Fieldset role="radiogroup" aria-invalid="true">
        <FieldsetLegend>Piano</FieldsetLegend>
        <FieldsetContent>
          <label>
            A <input type="radio" name="p" />
          </label>
        </FieldsetContent>
      </Fieldset>,
    );
    expect(screen.getByRole('radiogroup')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});
