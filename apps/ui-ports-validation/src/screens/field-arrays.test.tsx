import { describe, it, expect } from 'vitest';
import { useState, type ComponentType } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { z } from 'zod';
import { UiProvider, FormInput, createBoundFields } from '@fmmenchi/ui';
import {
  FormProvider,
  useFieldArray,
  useForm as useRhfForm,
  type FieldPath,
  type Resolver,
} from 'react-hook-form';
import { useRhfField } from '@fmmenchi/ui-form-ports/react-hook-form';
import { Formik, Form as FormikForm, setIn } from 'formik';
import { createFormikField } from '@fmmenchi/ui-form-ports/formik';
import { useForm as useTanstackForm, useSelector } from '@tanstack/react-form';
import {
  createTanstackField,
  createTanstackErrors,
} from '@fmmenchi/ui-form-ports/tanstack';
import { FormProvider as ConformProvider, useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod/v4';
import { createConformField } from '@fmmenchi/ui-form-ports/conform';

/**
 * REPEATED FIELDS — one suite, four libraries.
 *
 * The port binds by NAME, and an indexed name is still a name, so a row's field
 * needs nothing new from it. What a list also needs — how many rows there are,
 * how to add one, how to remove one, and what key each row has — is form-library
 * STATE, and it stays with the library: the four blocks below are the whole of
 * what an app writes, and they are the honest cost of this shape. Swapping
 * libraries touches the screen that owns a list, and only that screen.
 *
 * That is why nothing is exported for this. A port member has to be rendered by
 * a component to be owed by every adapter, and the design system draws no rows;
 * worse, two of these four libraries have no row key of their own, so a port
 * promising a stable one would be inventing it in half its implementations.
 *
 * The shape the four converge on is written here as a local type instead —
 * proof that they CAN converge, and the thing to lift if a component ever earns
 * it.
 */
interface Row {
  /** Stable across a removal — from the library where it has one. */
  key: string;
  /** The row's own prefix, IN THE LIBRARY'S SYNTAX: `guests.0` or `guests[0]`. */
  name: string;
}

const GUEST_REQUIRED = 'Every guest needs a name.';
const GuestsSchema = z.object({
  guests: z.array(z.object({ name: z.string().min(1, GUEST_REQUIRED) })),
});
type GuestValues = z.infer<typeof GuestsSchema>;

/**
 * The markup, written ONCE and shared by all four screens — which is the claim
 * under test. If a library needed something of its own in here, the port would
 * be leaking.
 */
function GuestList(props: {
  rows: readonly Row[];
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <>
      {props.rows.map((row, index) => (
        <div key={row.key}>
          <FormInput name={`${row.name}.name`} label={`Guest ${index + 1}`} />
          <button type="button" onClick={() => props.onRemove(index)}>
            Remove guest {index + 1}
          </button>
        </div>
      ))}
      <button type="button" onClick={props.onAdd}>
        Add guest
      </button>
    </>
  );
}

function Saved({ values }: { values: unknown }) {
  return values == null ? null : <output>{JSON.stringify(values)}</output>;
}

/* ── react-hook-form ─────────────────────────────────────────────────────── */

const rhfResolver: Resolver<GuestValues> = (values) => {
  const result = GuestsSchema.safeParse(values);
  if (result.success) return { values: result.data, errors: {} };
  const errors: Record<string, unknown> = {};
  for (const issue of result.error.issues) {
    errors[issue.path.join('.')] = { type: 'schema', message: issue.message };
  }
  return { values: {}, errors: errors as never };
};

function RhfGuests() {
  const [saved, setSaved] = useState<unknown>(null);
  const form = useRhfForm<GuestValues>({
    defaultValues: { guests: [] },
    resolver: rhfResolver,
  });
  // The library's own list API. `fields` carries a real row key, which is used
  // here because it exists — though the suite below passes with the index too:
  // react-hook-form writes the surviving values back onto the inputs itself
  // after a removal. Measured, both ways. The key earns its place on the cases
  // this form does not have (reordering, a row holding state of its own), not
  // on this one.
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'guests',
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(setSaved)}>
        <UiProvider
          adapters={{ i18n: { locale: 'en' }, form: { field: useRhfField } }}
        >
          <GuestList
            rows={fields.map((field, index) => ({
              key: field.id,
              name: `guests.${index}`,
            }))}
            onAdd={() => append({ name: '' })}
            onRemove={remove}
          />
        </UiProvider>
        <button type="submit">Save</button>
        <Saved values={saved} />
      </form>
    </FormProvider>
  );
}

/* ── Formik ──────────────────────────────────────────────────────────────── */

const formikField = createFormikField();

function FormikGuests() {
  const [saved, setSaved] = useState<unknown>(null);
  return (
    <Formik
      initialValues={{ guests: [] as GuestValues['guests'] }}
      validate={(values) => {
        const result = GuestsSchema.safeParse(values);
        if (result.success) return {};
        // Formik reads errors by PATH, not by a flat key: `errors` mirrors the
        // shape of `values`, so a row's message has to be nested to be found.
        // Keyed flat, it is simply never read — measured, the field stayed
        // silent while the form refused to submit.
        let errors = {};
        for (const issue of result.error.issues) {
          errors = setIn(errors, issue.path.join('.'), issue.message);
        }
        return errors;
      }}
      onSubmit={setSaved}
    >
      {({ values, setFieldValue }) => (
        <FormikForm>
          <UiProvider
            adapters={{ i18n: { locale: 'en' }, form: { field: formikField } }}
          >
            <GuestList
              // No row key of its own: the index is what Formik's own examples
              // use, and it holds because Formik is CONTROLLED — the value shown
              // comes from its state, whatever node React kept.
              rows={values.guests.map((_, index) => ({
                key: String(index),
                name: `guests[${index}]`,
              }))}
              onAdd={() =>
                void setFieldValue('guests', [...values.guests, { name: '' }])
              }
              onRemove={(index) =>
                void setFieldValue(
                  'guests',
                  values.guests.filter((_, i) => i !== index),
                )
              }
            />
          </UiProvider>
          <button type="submit">Save</button>
          <Saved values={saved} />
        </FormikForm>
      )}
    </Formik>
  );
}

/* ── TanStack Form ───────────────────────────────────────────────────────── */

function TanstackGuests() {
  const [saved, setSaved] = useState<unknown>(null);
  const form = useTanstackForm({
    defaultValues: { guests: [] as GuestValues['guests'] },
    validators: { onSubmit: GuestsSchema },
    onSubmit: ({ value }) => setSaved(value),
  });
  const guests = useSelector(form.store, (state) => state.values.guests);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <UiProvider
        adapters={{
          i18n: { locale: 'en' },
          form: {
            field: createTanstackField(form),
            errors: createTanstackErrors(form),
          },
        }}
      >
        <GuestList
          rows={guests.map((_, index) => ({
            key: String(index),
            name: `guests[${index}]`,
          }))}
          onAdd={() => form.pushFieldValue('guests', { name: '' })}
          onRemove={(index) => form.removeFieldValue('guests', index)}
        />
      </UiProvider>
      <button type="submit">Save</button>
      <Saved values={saved} />
    </form>
  );
}

/* ── Conform ─────────────────────────────────────────────────────────────── */

const conformField = createConformField();

/**
 * Conform validates the form's `FormData`, where an empty input arrives as
 * `undefined` rather than as `''` — so `.min(1)` never runs and the message
 * would be zod's own "expected string, received undefined". The missing case
 * needs its own message, which is Conform being Conform rather than the port
 * leaking: the message still arrives keyed by the row's name, which is all the
 * port carries.
 */
const ConformGuestsSchema = z.object({
  guests: z.array(
    z.object({
      name: z.string({ message: GUEST_REQUIRED }).min(1, GUEST_REQUIRED),
    }),
  ),
});

function ConformGuests() {
  const [saved, setSaved] = useState<unknown>(null);
  const [form, fields] = useForm({
    shouldValidate: 'onSubmit',
    onValidate: ({ formData }) =>
      parseWithZod(formData, { schema: ConformGuestsSchema }),
    onSubmit: (event, { submission }) => {
      event.preventDefault();
      if (submission?.status === 'success') setSaved(submission.value);
    },
  });
  const guests = fields.guests.getFieldList();

  return (
    <ConformProvider context={form.context}>
      <UiProvider
        adapters={{ i18n: { locale: 'en' }, form: { field: conformField } }}
      >
        <form id={form.id} onSubmit={form.onSubmit}>
          <GuestList
            // A real key, and mutations are INTENTS rather than state writes:
            // Conform is uncontrolled and the form's own DOM is the state.
            rows={guests.map((guest) => ({
              key: guest.key ?? guest.id,
              name: guest.name,
            }))}
            onAdd={() => form.insert({ name: fields.guests.name })}
            onRemove={(index) =>
              form.remove({ name: fields.guests.name, index })
            }
          />
          <button type="submit">Save</button>
          <Saved values={saved} />
        </form>
      </UiProvider>
    </ConformProvider>
  );
}

/* ── the suite ───────────────────────────────────────────────────────────── */

const SCREENS: Array<[string, ComponentType]> = [
  ['react-hook-form', RhfGuests],
  ['Formik', FormikGuests],
  ['TanStack Form', TanstackGuests],
  ['Conform', ConformGuests],
];

const guest = (n: number) =>
  screen.getByRole('textbox', { name: `Guest ${n}` });
const add = () => screen.getByRole('button', { name: 'Add guest' });
const save = () => screen.getByRole('button', { name: 'Save' });

describe.each(SCREENS)(
  'repeated fields through the port — %s',
  (_n, Screen) => {
    it('binds every row by its indexed name, and submits them in order', async () => {
      render(<Screen />);

      await browser.click(add());
      await browser.click(add());
      await browser.type(guest(1), 'Ada');
      await browser.type(guest(2), 'Grace');
      await browser.click(save());

      await waitFor(() =>
        expect(
          JSON.parse(screen.getByRole('status').textContent ?? '{}'),
        ).toMatchObject({ guests: [{ name: 'Ada' }, { name: 'Grace' }] }),
      );
    });

    it('removing a row leaves the OTHER row’s value where it was', async () => {
      // The trap this exists for: with no row key, React reuses the removed row's
      // input for the survivor and the wrong value stays on screen — and then
      // gets submitted.
      render(<Screen />);

      await browser.click(add());
      await browser.click(add());
      await browser.type(guest(1), 'Ada');
      await browser.type(guest(2), 'Grace');
      await browser.click(
        screen.getByRole('button', { name: 'Remove guest 1' }),
      );

      await waitFor(() => expect(guest(1)).toHaveValue('Grace'));
      expect(screen.queryByRole('textbox', { name: 'Guest 2' })).toBeNull();

      await browser.click(save());
      await waitFor(() =>
        expect(
          JSON.parse(screen.getByRole('status').textContent ?? '{}'),
        ).toMatchObject({ guests: [{ name: 'Grace' }] }),
      );
    });

    it('a row’s error lands on THAT row’s field', async () => {
      render(<Screen />);

      await browser.click(add());
      await browser.click(add());
      await browser.type(guest(1), 'Ada');
      // guest 2 left empty
      await browser.click(save());

      await waitFor(() =>
        expect(guest(2)).toHaveAccessibleDescription(GUEST_REQUIRED),
      );
      expect(guest(1)).not.toHaveAttribute('aria-invalid');
    });
  },
);

/* ── the names, checked against the library's own path type ──────────────── */

describe('a row’s field name, typed by the library', () => {
  it('accepts the library’s paths and refuses everything else', () => {
    // `FieldPath` is react-hook-form's, not one invented in the design system —
    // which is the point: the syntax of an indexed path belongs to the library
    // (`guests.0.name` here, `guests[0].name` for Conform), so only its own
    // type can tell a real path from a typo.
    const { FormInput: Guest } = createBoundFields<FieldPath<GuestValues>>();
    const index = 1;

    const tree = (
      <>
        <Guest name="guests.0.name" label="Guest 1" />
        {/* built from a number, and still typed */}
        <Guest name={`guests.${index}.name`} label="Guest 2" />
        {/* @ts-expect-error `nmae` is not a field of a guest */}
        <Guest name="guests.0.nmae" label="Guest 1" />
        {/* @ts-expect-error a guest is reached by index, not by name */}
        <Guest name="guests.name" label="Guest 1" />
      </>
    );
    expect(tree).toBeTruthy();
  });
});
