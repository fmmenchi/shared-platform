import { describe, it, expect, vi } from 'vitest';
import { createRef, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormInput } from './form-input.component.js';
import { FormChoice } from '../form-choice/form-choice.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type {
  BoundField,
  UseFormField,
} from '../../form/form-adapter.types.js';

/**
 * The design system tests the CONTRACT, with a hand-written adapter and no form
 * library at all — which is also the strongest statement of what the contract
 * is. That the contract holds against real libraries is proved next door, in
 * `ui-ports-validation`, where those libraries are installed.
 */
describe('the bound components, against the contract itself', () => {
  it('binds a control and shows nothing when there is no error', () => {
    const field: UseFormField = (name) => ({ control: { name } });
    render(
      <UiProvider adapters={{ i18n: { locale: 'en' }, form: { field: field } }}>
        <FormInput name="email" label="Email" />
      </UiProvider>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('name', 'email');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('collects what the user types, through the adapter’s own onChange', async () => {
    const user = userEvent.setup();
    function Host() {
      const [values, setValues] = useState<Record<string, string | boolean>>({
        email: '',
        tos: false,
      });
      const field: UseFormField = (name) => ({
        control: {
          name,
          onChange: (event) => {
            const el = event.target as HTMLInputElement;
            setValues((v) => ({
              ...v,
              [name]: el.type === 'checkbox' ? el.checked : el.value,
            }));
          },
        },
      });
      return (
        <>
          <output>{JSON.stringify(values)}</output>
          <UiProvider
            adapters={{ i18n: { locale: 'en' }, form: { field: field } }}
          >
            <FormInput name="email" label="Email" />
            <FormChoice name="tos" label="Accept" />
          </UiProvider>
        </>
      );
    }
    render(<Host />);
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'a@b.it');
    await user.click(screen.getByRole('checkbox', { name: 'Accept' }));
    expect(
      JSON.parse(screen.getByRole('status').textContent ?? '{}'),
    ).toMatchObject({ email: 'a@b.it', tos: true });
  });

  it('an explicit prop at the call site beats the binding', () => {
    const field: UseFormField = (name) => ({ control: { name } });
    render(
      <UiProvider adapters={{ i18n: { locale: 'en' }, form: { field: field } }}>
        <FormInput
          name="email"
          label="Email"
          type="email"
          placeholder="you@x"
        />
      </UiProvider>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'you@x');
  });

  // …but `value` and `onChange` are not that kind of prop: the call site
  // winning them does not override the binding, it SEVERS it — the field still
  // renders, still types, and submits nothing. So they are not props here at
  // all, and the two halves of that refusal are tested together.
  describe('what the binding owns, the call site cannot take', () => {
    const trackChanges = (seen: string[]): UseFormField =>
      function useField(name) {
        return {
          control: {
            name,
            onChange: (event) => {
              const el = event.target as HTMLInputElement;
              seen.push(
                `${name}=${el.type === 'checkbox' ? el.checked : el.value}`,
              );
            },
          },
        };
      };

    it('refuses `onChange`, `value` and `checked` at the type level', () => {
      const field: UseFormField = (name) => ({ control: { name } });
      const noop = () => undefined;
      // Each of these is a compile error, which is the whole point: the
      // failure moves from production data to the editor. `@ts-expect-error`
      // fails the typecheck if the prop ever becomes legal again.
      const _forbidden = (
        <UiProvider adapters={{ i18n: { locale: 'en' }, form: { field } }}>
          {/* @ts-expect-error the binding owns onChange */}
          <FormInput name="email" label="Email" onChange={noop} />
          {/* @ts-expect-error the binding owns the value */}
          <FormInput name="email" label="Email" value="typed" />
          {/* @ts-expect-error the binding owns the checked state */}
          <FormChoice name="tos" label="Accept" checked />
        </UiProvider>
      );
      expect(_forbidden).toBeTruthy();
    });

    it('and drops them at runtime too, where the type cannot reach', async () => {
      // A JavaScript consumer, or an `as any`. The binding keeps the field
      // whatever the call site says — and dev says so by name rather than
      // leaving it quietly unbound.
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const user = userEvent.setup();
      const seen: string[] = [];
      const stolen = vi.fn();
      const props = { onChange: stolen, value: 'frozen' } as object;

      render(
        <UiProvider
          adapters={{
            i18n: { locale: 'en' },
            form: { field: trackChanges(seen) },
          }}
        >
          <FormInput name="email" label="Email" {...props} />
        </UiProvider>,
      );
      const input = screen.getByRole('textbox', { name: 'Email' });
      expect(input).toHaveValue('');

      await user.type(input, 'ab');
      expect(seen).toEqual(['email=a', 'email=ab']);
      expect(stolen).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('FormInput: `onChange`, `value` are owned'),
        ),
      );
      warn.mockRestore();
    });

    it('an undefined value is absent, and warns about nothing', async () => {
      // A prop bag with `onChange: undefined` in it — from `enabled ? track :
      // undefined` upstream — is not passing the prop, so there is nothing to
      // drop and nothing to say.
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const user = userEvent.setup();
      const seen: string[] = [];
      const props = { onChange: undefined } as object;
      render(
        <UiProvider
          adapters={{
            i18n: { locale: 'en' },
            form: { field: trackChanges(seen) },
          }}
        >
          <FormInput name="email" label="Email" {...props} />
        </UiProvider>,
      );

      await user.type(screen.getByRole('textbox', { name: 'Email' }), 'a');
      expect(seen).toEqual(['email=a']);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('but a ref is SHARED — both the binding’s and the call site’s', () => {
      // The one binding-owned prop that can be. react-hook-form's `register`
      // returns a ref, and a call site that replaced it would leave the field
      // unregistered — no value, no validation, no focus on error.
      const bindingRef = createRef<HTMLInputElement>();
      const callSiteRef = createRef<HTMLInputElement>();
      const field: UseFormField = (name) => ({
        control: { name, ref: bindingRef },
      });
      render(
        <UiProvider
          adapters={{ i18n: { locale: 'en' }, form: { field: field } }}
        >
          <FormInput name="email" label="Email" ref={callSiteRef} />
        </UiProvider>,
      );

      const input = screen.getByRole('textbox', { name: 'Email' });
      expect(bindingRef.current).toBe(input);
      expect(callSiteRef.current).toBe(input);
    });
  });

  // A field rarely fails in exactly one way, so the contract carries a LIST —
  // one shape, whatever the library reports — and each message renders as its
  // OWN element.
  describe('the messages a field carries', () => {
    const renderWith = (errors: BoundField['errors']) => {
      const field: UseFormField = (name) => ({ control: { name }, errors });
      return render(
        <UiProvider
          adapters={{ i18n: { locale: 'en' }, form: { field: field } }}
        >
          <FormInput name="email" label="Email" />
        </UiProvider>,
      );
    };
    const rendered = (container: HTMLElement) =>
      [...container.querySelectorAll('p')].map((n) => n.textContent);

    it('one message', async () => {
      renderWith(['Email is required.']);
      await waitFor(() =>
        expect(
          screen.getByRole('textbox', { name: 'Email' }),
        ).toHaveAccessibleDescription('Email is required.'),
      );
    });

    it('several, as separate elements rather than joined', () => {
      const { container } = renderWith(['Too short.', 'Needs a digit.']);
      // Joined, a screen reader would read "Too short.Needs a digit." as one
      // run-on statement.
      expect(rendered(container)).toEqual(['Too short.', 'Needs a digit.']);
    });

    it('keeps the adapter’s order, and drops blanks', () => {
      const { container } = renderWith(['B.', '', '   ', 'A.']);
      expect(rendered(container)).toEqual(['B.', 'A.']);
    });

    // Two rules failing together often carry the same sentence, and hearing it
    // twice is a defect in every case. It is also what lets the message be its
    // own key.
    it('says a repeated message once', () => {
      const { container } = renderWith(['Required.', 'Required.']);
      expect(rendered(container)).toEqual(['Required.']);
    });

    it('announces every message, and the hint keeps its place before them', async () => {
      const field: UseFormField = (name) => ({
        control: { name },
        errors: ['A.', 'B.'],
      });
      render(
        <UiProvider
          adapters={{ i18n: { locale: 'en' }, form: { field: field } }}
        >
          <FormInput name="email" label="Email" hint="Work address." />
        </UiProvider>,
      );
      await waitFor(() =>
        expect(
          screen.getByRole('textbox', { name: 'Email' }),
        ).toHaveAccessibleDescription('Work address. A. B.'),
      );
    });

    it('no messages means valid — no element, no aria-invalid', () => {
      for (const empty of [undefined, [], ['']] as const) {
        const { container, unmount } = renderWith(empty);
        expect(container.querySelectorAll('p')).toHaveLength(0);
        expect(container.querySelector('input')).not.toHaveAttribute(
          'aria-invalid',
        );
        unmount();
      }
    });

    // The point of keying by the message: fixing the FIRST of two must not
    // remount the second, which is what an index key does.
    it('keeps a surviving message’s element when an earlier one is fixed', () => {
      const field = (errors: readonly string[]): UseFormField =>
        function useField(name) {
          return { control: { name }, errors };
        };
      const { container, rerender } = render(
        <UiProvider
          adapters={{
            i18n: { locale: 'en' },
            form: { field: field(['Too short.', 'Needs a digit.']) },
          }}
        >
          <FormInput name="email" label="Email" />
        </UiProvider>,
      );
      const survivor = container.querySelectorAll('p')[1];

      rerender(
        <UiProvider
          adapters={{
            i18n: { locale: 'en' },
            form: { field: field(['Needs a digit.']) },
          }}
        >
          <FormInput name="email" label="Email" />
        </UiProvider>,
      );

      expect(container.querySelectorAll('p')[0]).toBe(survivor);
    });
  });

  it('throws by name when there is no binding in scope', () => {
    // Silently unbound is worse: it renders, it types, and it submits nothing.
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    expect(() => render(<FormInput name="email" label="Email" />)).toThrow(
      /FormInput: no form binding in scope/,
    );
    error.mockRestore();
  });
});
