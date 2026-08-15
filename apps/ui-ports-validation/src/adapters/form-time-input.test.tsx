import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { UiProvider, FormTimeInput, type UseFormField } from '@fmmenchi/ui';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { Formik, Form as FormikForm, useFormikContext } from 'formik';
import { createFormikField } from '@fmmenchi/ui-form-ports/formik';

/**
 * The time field against two REAL form libraries, one of each shape.
 *
 * This file is here before anything goes wrong, which is the only reason worth
 * writing it down: the date family reached this app three separate times, each
 * time carrying a defect nothing in `packages/client/ui` could see, because
 * nothing there renders a form library. The binding's ref went unforwarded and
 * `register()` stored `undefined` for every date typed; a controlled library's
 * `value` was folded into a one-shot seed and `setFieldValue` then left the
 * field behind; a `defaultValues` holding an instant went past all three doors.
 * `FormTimeInput` is the same shape with the same two directions to get wrong,
 * so it starts covered rather than ending up covered.
 *
 * THE en-US LOCALE IS THE POINT. There the box and the value are never the same
 * string — `02:30 PM` against `14:30` — so a test that confused them cannot
 * pass by accident, which is exactly what an `it` locale would have allowed.
 */

// ── ref-based: react-hook-form ──────────────────────────────────────────────

const useRhfField: UseFormField = (name) => {
  const { register } = useFormContext();
  return { control: register(name), errors: [] };
};

function RhfForm({
  onSubmit,
  defaultValues = { opens: '' },
}: {
  onSubmit: (values: unknown) => void;
  defaultValues?: { opens: string };
}) {
  const form = useForm({ defaultValues });
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <UiProvider
          adapters={{ i18n: { locale: 'en-US' }, form: { field: useRhfField } }}
        >
          <FormTimeInput name="opens" label="Opens at" />
        </UiProvider>
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
}

describe('FormTimeInput through react-hook-form', () => {
  it('submits the ISO time the user typed, not undefined and not the text', async () => {
    const onSubmit = vi.fn();
    render(<RhfForm onSubmit={onSubmit} />);

    const field = screen.getByRole('textbox', { name: 'Opens at' });
    await browser.click(field);
    await browser.keyboard('0230p');
    expect(field).toHaveValue('02:30 PM');

    await browser.click(screen.getByRole('button', { name: 'Submit' }));
    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ opens: '14:30' }),
        expect.anything(),
      );
    });
  });

  it('shows a defaultValues time in the readers own cycle', () => {
    render(<RhfForm onSubmit={vi.fn()} defaultValues={{ opens: '21:05' }} />);
    expect(screen.getByRole('textbox', { name: 'Opens at' })).toHaveValue(
      '09:05 PM',
    );
  });

  it('takes a defaultValues holding a full instant, and posts only the reading', async () => {
    // What a library holds when somebody stored a `Date` — and the shape that
    // went straight past all three of the date field's doors, leaving it empty
    // while the form held the instant.
    const onSubmit = vi.fn();
    render(
      <RhfForm
        onSubmit={onSubmit}
        defaultValues={{ opens: '2026-08-12T21:05:00.000Z' }}
      />,
    );
    await vi.waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Opens at' })).toHaveValue(
        '09:05 PM',
      );
    });

    await browser.click(screen.getByRole('button', { name: 'Submit' }));
    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ opens: '21:05' }),
        expect.anything(),
      );
    });
  });
});

// ── controlled: Formik ──────────────────────────────────────────────────────

const useFormikTime = createFormikField();

function Setter() {
  const { setFieldValue, values } = useFormikContext<{ opens: string }>();
  return (
    <>
      <button
        type="button"
        onClick={() => void setFieldValue('opens', '21:05')}
      >
        From outside
      </button>
      <button type="button" onClick={() => void setFieldValue('opens', '')}>
        Clear
      </button>
      <output data-testid="state">{JSON.stringify(values)}</output>
    </>
  );
}

function FormikTimeForm() {
  return (
    <Formik initialValues={{ opens: '14:30' }} onSubmit={() => undefined}>
      <FormikForm>
        <UiProvider
          adapters={{
            i18n: { locale: 'en-US' },
            form: { field: useFormikTime },
          }}
        >
          <FormTimeInput name="opens" label="Opens at" />
        </UiProvider>
        <Setter />
      </FormikForm>
    </Formik>
  );
}

const carrier = (container: HTMLElement, name: string) =>
  container.querySelector(`[data-carrier][name="${name}"]`) as HTMLInputElement;

describe('FormTimeInput under Formik, which holds the value itself', () => {
  it('shows what the library holds, on the first render', () => {
    render(<FormikTimeForm />);
    expect(screen.getByRole('textbox', { name: 'Opens at' })).toHaveValue(
      '02:30 PM',
    );
  });

  it('follows setFieldValue — the box, the carrier and the form agree', async () => {
    // A CONTROLLED library hands over `value` and no ref, expecting the value it
    // holds to be rendered back. This family cannot render it back — `14:30` in
    // an `en-US` box would be the very disagreement it exists to remove — so the
    // value has to reach the carrier instead.
    const { container } = render(<FormikTimeForm />);

    await browser.click(screen.getByRole('button', { name: 'From outside' }));

    expect(screen.getByRole('textbox', { name: 'Opens at' })).toHaveValue(
      '09:05 PM',
    );
    expect(carrier(container, 'opens').value).toBe('21:05');
    expect(screen.getByTestId('state').textContent).toContain('21:05');
  });

  it('follows a clear', async () => {
    const { container } = render(<FormikTimeForm />);

    await browser.click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.getByRole('textbox', { name: 'Opens at' })).toHaveValue('');
    expect(carrier(container, 'opens').value).toBe('');
  });

  it('still lets the user type, and tells Formik what was typed', async () => {
    // The other direction, which must not have been broken by the first.
    const { container } = render(<FormikTimeForm />);

    const field = screen.getByRole('textbox', {
      name: 'Opens at',
    }) as HTMLInputElement;
    await browser.click(field);
    // Selected with the DOM rather than with `Ctrl`+`A`: select-all is `Cmd` on
    // macOS and `Ctrl` elsewhere, and a test that picked one would be measuring
    // the keyboard layout of whoever ran it.
    field.setSelectionRange(0, field.value.length);
    await browser.keyboard('0915a');

    expect(carrier(container, 'opens').value).toBe('09:15');
    expect(screen.getByTestId('state').textContent).toContain('09:15');
  });
});
