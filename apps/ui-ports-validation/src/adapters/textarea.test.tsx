import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { UiProvider, FormTextarea, FormInput } from '@fmmenchi/ui';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { useRhfField } from '@fmmenchi/ui-form-ports/react-hook-form';

/**
 * The tag question, against a real library.
 *
 * `register()` hands back ONE bag of props, built without knowing which control
 * will receive it — and the design system now declares the tag on its side
 * (`useBoundField<'textarea'>`) because the types of `ref` and the handlers
 * mention an element while the runtime does not. That reasoning is only worth
 * anything if the bag actually drives a `<textarea>`: registration, value,
 * validation and submission, from the library that produced it.
 */
type Values = { title: string; notes: string };

const NOTES_REQUIRED = 'Notes are required.';

/**
 * Collected into a Record before the return: an object literal with an optional
 * key makes the two branches infer a union that fits neither half of
 * `ResolverResult` — the same trap that once reached `main` from a test.
 */
const notesResolver: Resolver<Values> = (values) => {
  const errors: Record<string, { type: string; message: string }> = {};
  if (values.notes.trim() === '') {
    errors.notes = { type: 'required', message: NOTES_REQUIRED };
  }
  return Object.keys(errors).length > 0
    ? { values: {}, errors }
    : { values, errors: {} };
};

function NoteForm({ onSubmit }: { onSubmit: (v: Values) => void }) {
  const form = useForm<Values>({
    defaultValues: { title: '', notes: '' },
    resolver: notesResolver,
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <UiProvider
          adapters={{ i18n: { locale: 'en' }, form: { field: useRhfField } }}
        >
          <FormInput name="title" label="Title" />
          <FormTextarea name="notes" label="Notes" rows={4} />
        </UiProvider>
        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
}

describe('FormTextarea over react-hook-form', () => {
  it('registers, collects and submits the multi-line value', async () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} />);

    const notes = screen.getByRole('textbox', { name: 'Notes' });
    expect(notes.tagName).toBe('TEXTAREA');

    await browser.type(screen.getByRole('textbox', { name: 'Title' }), 'A day');
    await browser.type(notes, 'Two lines{Enter}of it');
    await browser.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // The newline is the whole reason this control exists: it must survive the
    // trip through the library, not be flattened on the way.
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      title: 'A day',
      notes: 'Two lines\nof it',
    });
  });

  it('carries the library’s message to the eye and to assistive tech', async () => {
    render(<NoteForm onSubmit={vi.fn()} />);

    await browser.click(screen.getByRole('button', { name: 'Save' }));

    const notes = screen.getByRole('textbox', { name: 'Notes' });
    await waitFor(() => expect(notes).toHaveAttribute('aria-invalid', 'true'));
    await waitFor(() =>
      expect(notes).toHaveAccessibleDescription(NOTES_REQUIRED),
    );
  });
});
