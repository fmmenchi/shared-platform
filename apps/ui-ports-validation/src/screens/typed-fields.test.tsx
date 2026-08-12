import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { UiProvider, FormInput as PlainInput } from '@fmmenchi/ui';
import type { FieldName } from '@conform-to/react';
import {
  createRhfForm,
  useRhfField,
} from '@fmmenchi/ui-form-ports/react-hook-form';
import { createTanstackFields } from '@fmmenchi/ui-form-ports/tanstack';
import { createFormikFields } from '@fmmenchi/ui-form-ports/formik';

/**
 * A NAME is the whole binding, so a misspelt one fails the way an unbound field
 * fails — it renders, it types, and it submits nothing. These kits move that
 * failure to the editor.
 *
 * Each takes the VALUES type and derives the paths with its own library's
 * machinery, which is why the accepted syntax differs below: `guests.0.name`
 * for react-hook-form, `guests[0].name` for TanStack. That difference is the
 * reason the kits live in the adapters and not in the design system.
 *
 * The runtime side — that those names actually bind on all four — is proved by
 * the recipe and repeated-field suites next door; what is pinned here is the
 * typing, plus one real form to show the kit is not a type-level fiction.
 */
interface SignupValues {
  email: string;
  tos: boolean;
  notes: string;
  country: string;
  guests: { name: string }[];
}

/* ── react-hook-form: the kit, against a real form ───────────────────────── */

const { Form, FormInput, FormChoice, FormTextarea, FormSelect } =
  createRhfForm<SignupValues>();

describe('createRhfForm', () => {
  it('binds and submits, with no library named at the call site', async () => {
    const onSubmit = vi.fn();

    render(
      <Form
        onSubmit={onSubmit}
        options={{
          defaultValues: {
            email: '',
            tos: false,
            notes: '',
            country: '',
            guests: [],
          },
        }}
      >
        <UiProvider
          adapters={{ i18n: { locale: 'en' }, form: { field: useRhfField } }}
        >
          <FormInput name="email" label="Email" />
          <FormChoice name="tos" label="Accept" />
        </UiProvider>
        <button type="submit">Send</button>
      </Form>,
    );

    await browser.type(
      screen.getByRole('textbox', { name: 'Email' }),
      'a@b.it',
    );
    await browser.click(screen.getByRole('checkbox', { name: 'Accept' }));
    await browser.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      email: 'a@b.it',
      tos: true,
    });
  });

  it('checks every name against the form’s own fields', () => {
    const tree = (
      <>
        <FormInput name="email" label="Email" />
        <FormInput name="guests.0.name" label="Guest 1" />
        <FormChoice name="tos" label="Accept" />
        {/* the kit hands out EVERY bound component, including the two that
            landed after it was written — the interface lives in the design
            system, so no adapter had to be touched */}
        <FormTextarea name="notes" label="Notes" />
        <FormSelect name="country" label="Country">
          <option value="it">Italy</option>
        </FormSelect>
        {/* @ts-expect-error 'notse' is not a field of SignupValues */}
        <FormTextarea name="notse" label="Notes" />
        {/* @ts-expect-error 'emial' is not a field of SignupValues */}
        <FormInput name="emial" label="Email" />
        {/* @ts-expect-error a row is reached by index, not by name */}
        <FormInput name="guests.name" label="Guest" />
        {/* @ts-expect-error TanStack's bracket syntax is not this library's */}
        <FormInput name="guests[0].name" label="Guest 1" />
      </>
    );
    expect(tree).toBeTruthy();
  });

  it('refuses the call that would silently type nothing', () => {
    // Without the values type every path widens to `string`, so the kit says so
    // instead of handing back something that looks checked and is not.
    // @ts-expect-error the message type has no `FormInput`
    const { FormInput: Untyped } = createRhfForm();

    // The guard is type-level ONLY, and that is on purpose: a JavaScript
    // consumer still gets working components, just unchecked ones. Nothing is
    // broken at runtime to make a point in the editor.
    expect(typeof Untyped).toBe('function');
  });
});

/* ── TanStack: same call, its own path syntax ────────────────────────────── */

describe('createTanstackFields', () => {
  it('accepts TanStack’s paths and refuses the others', () => {
    const { FormInput: Field } = createTanstackFields<SignupValues>();
    const tree = (
      <>
        <Field name="email" label="Email" />
        <Field name="guests[0].name" label="Guest 1" />
        {/* @ts-expect-error react-hook-form's dotted index is not this one */}
        <Field name="guests.0.name" label="Guest 1" />
        {/* @ts-expect-error 'emial' is not a field of SignupValues */}
        <Field name="emial" label="Email" />
      </>
    );
    expect(tree).toBeTruthy();
  });
});

/* ── Formik: the one with no path type of its own ────────────────────────── */

describe('createFormikFields', () => {
  it('accepts the paths Formik resolves, derived by the adapter', () => {
    const { FormInput: Field } = createFormikFields<SignupValues>();
    const tree = (
      <>
        <Field name="email" label="Email" />
        <Field name="guests.0.name" label="Guest 1" />
        {/* @ts-expect-error 'emial' is not a field of SignupValues */}
        <Field name="emial" label="Email" />
        {/* @ts-expect-error one spelling per path, and Formik's is the dotted one */}
        <Field name="guests[0].name" label="Guest 1" />
      </>
    );
    expect(tree).toBeTruthy();
  });
});

/* ── Conform: nothing to add, and here is why ────────────────────────────── */

describe('Conform', () => {
  it('needs no kit — the name comes from the metadata, already right', () => {
    // `fields.email.name` cannot be misspelt: the mistake would be on the
    // PROPERTY, which does not exist. So the plain component takes Conform's
    // name as it comes, and there is nothing for a kit to add.
    //
    // Measured on the way here, which is why no kit was written: Conform's own
    // `FieldName<Schema>` is `string & { [brand]?: … }` with every brand
    // property OPTIONAL, so it accepts any string — a name typed against it
    // would check nothing.
    const fromMetadata = 'email' as FieldName<string>;
    const tree = <PlainInput name={fromMetadata} label="Email" />;
    expect(tree).toBeTruthy();
  });
});
