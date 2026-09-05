import { describe, it, expect } from 'vitest';
import { useState, type ComponentType } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { z } from 'zod';
import { FormCombobox, UiProvider } from '@fmmenchi/ui';
import type { UseFormField, UseFormOptionField } from '@fmmenchi/ui';
import {
  FormProvider,
  useForm as useRhfForm,
  type Resolver,
} from 'react-hook-form';
import {
  useRhfField,
  useRhfOptionField,
} from '@fmmenchi/ui-form-ports/react-hook-form';
import { Formik, Form as FormikForm } from 'formik';
import {
  createFormikField,
  createFormikOptionField,
} from '@fmmenchi/ui-form-ports/formik';
import { useForm as useTanstackForm } from '@tanstack/react-form';
import {
  createTanstackField,
  createTanstackOptionField,
} from '@fmmenchi/ui-form-ports/tanstack';
import { FormProvider as ConformProvider, useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod/v4';
import {
  createConformField,
  createConformOptionField,
} from '@fmmenchi/ui-form-ports/conform';
import {
  useActionField,
  useActionOptionField,
} from '@fmmenchi/ui-form-ports/react-19';

/**
 * THE COMPONENT, against the five real libraries — which is what the in-package
 * tests cannot be.
 *
 * `combobox.multiple.test.tsx` and `form-combobox.test.tsx` bind through a stub
 * written in the same commit as the component, and a stub written by the author
 * of an assumption confirms it by construction. Two defects lived exactly there
 * and only a real adapter could have shown them: the carriers took `checked`
 * from the binding's bag, which three of the five do not answer, so the form
 * posted an empty field; and the carrier's `type` sat before the adapter's, so
 * Conform's `radio` won and a set of choices became mutually exclusive.
 *
 * So the assertions here are about the STORED VALUE and nothing else — what the
 * library holds after picking, after removing, and what it seeds the control
 * with. Identical for all five, which is this package's own test of whether the
 * port leaks.
 */

interface City {
  id: string;
  name: string;
}

const CITIES: City[] = [
  { id: '1', name: 'Milano' },
  { id: '2', name: 'Torino' },
  { id: '3', name: 'Napoli' },
];

const wiring = {
  items: CITIES,
  getKey: (city: City) => city.id,
  getLabel: (city: City) => city.name,
};

const Schema = z.object({ cities: z.array(z.string()) });
type Values = z.infer<typeof Schema>;

/**
 * A SET UNDER ONE NAME, which is what the adapters call a checkbox group — and
 * declaring it is not optional here: Conform shapes the control's props by this
 * map, and anything else makes the carriers radios.
 */
const TYPES = { cities: 'checkbox-group' } as const;

/** The markup, written once and rendered by every screen. Nothing names a library. */
function Screen(props: {
  saved: unknown;
  field: UseFormField;
  optionField: UseFormOptionField;
  /** Writes the field the way an app does — a "clear all", a draft loaded. */
  fromOutside?: () => void;
}) {
  return (
    <UiProvider
      adapters={{
        i18n: { locale: 'en' },
        form: { field: props.field, optionField: props.optionField },
      }}
    >
      <FormCombobox {...wiring} multiple name="cities" label="Cities" />
      <button type="submit">Save</button>
      {props.fromOutside === undefined ? null : (
        <button type="button" onClick={props.fromOutside}>
          Set from outside
        </button>
      )}
      {props.saved == null ? null : (
        <output data-testid="saved">{JSON.stringify(props.saved)}</output>
      )}
    </UiProvider>
  );
}

/* ── react-hook-form ─────────────────────────────────────────────────────── */

const rhfResolver: Resolver<Values> = (values) => {
  const result = Schema.safeParse(values);
  return result.success
    ? { values: result.data, errors: {} }
    : { values: {}, errors: {} };
};

function RhfScreen({ seed = [] }: { seed?: string[] }) {
  const [saved, setSaved] = useState<unknown>(null);
  const form = useRhfForm<Values>({
    defaultValues: { cities: seed },
    resolver: rhfResolver,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(setSaved)}>
        <Screen
          saved={saved}
          field={useRhfField}
          optionField={useRhfOptionField}
          fromOutside={() => form.setValue('cities', ['2'])}
        />
      </form>
    </FormProvider>
  );
}

/* ── Formik ──────────────────────────────────────────────────────────────── */

const formikField = createFormikField({ types: TYPES });
const formikOptionField = createFormikOptionField({ types: TYPES });

function FormikScreen({ seed = [] }: { seed?: string[] }) {
  const [saved, setSaved] = useState<unknown>(null);
  return (
    <Formik initialValues={{ cities: seed }} onSubmit={setSaved}>
      {(formik) => (
        <FormikForm>
          <Screen
            saved={saved}
            field={formikField}
            optionField={formikOptionField}
            fromOutside={() => void formik.setFieldValue('cities', ['2'])}
          />
        </FormikForm>
      )}
    </Formik>
  );
}

/* ── TanStack Form ───────────────────────────────────────────────────────── */

function TanstackScreen({ seed = [] }: { seed?: string[] }) {
  const [saved, setSaved] = useState<unknown>(null);
  const form = useTanstackForm({
    defaultValues: { cities: seed },
    onSubmit: ({ value }) => setSaved(value),
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <Screen
        saved={saved}
        field={createTanstackField(form, { types: TYPES })}
        optionField={createTanstackOptionField(form, { types: TYPES })}
        fromOutside={() => form.setFieldValue('cities', ['2'])}
      />
    </form>
  );
}

/* ── Conform ─────────────────────────────────────────────────────────────── */

const conformField = createConformField({ types: TYPES });
const conformOptionField = createConformOptionField({ types: TYPES });

function ConformScreen({ seed = [] }: { seed?: string[] }) {
  const [saved, setSaved] = useState<unknown>(null);
  const [form] = useForm({
    defaultValue: { cities: seed },
    onValidate: ({ formData }) => parseWithZod(formData, { schema: Schema }),
    onSubmit: (event, { formData }) => {
      event.preventDefault();
      setSaved({ cities: formData.getAll('cities') });
    },
    shouldValidate: 'onSubmit',
  });
  return (
    <ConformProvider context={form.context}>
      <form id={form.id} onSubmit={form.onSubmit}>
        <Screen
          saved={saved}
          field={conformField}
          optionField={conformOptionField}
        />
      </form>
    </ConformProvider>
  );
}

/* ── React 19, no library ────────────────────────────────────────────────── */

function React19Screen() {
  const [saved, setSaved] = useState<unknown>(null);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setSaved({ cities: data.getAll('cities') });
      }}
    >
      <Screen
        saved={saved}
        field={useActionField}
        optionField={useActionOptionField}
      />
    </form>
  );
}

/* ── the suite ───────────────────────────────────────────────────────────── */

const SCREENS: ReadonlyArray<[string, ComponentType<{ seed?: string[] }>]> = [
  ['react-hook-form', RhfScreen],
  ['Formik', FormikScreen],
  ['TanStack Form', TanstackScreen],
  ['Conform', ConformScreen],
  ['React 19', React19Screen],
];

/**
 * THE `<output>`, found by its element rather than by `role="status"` — which
 * this suite's first version used, the way its siblings do, and which is wrong
 * HERE: a combobox renders a live region of its own and every `Button` an empty
 * status span, so the role matched the component's own announcements and the
 * assertions compared against an empty string. The other suites get away with it
 * because nothing they render speaks.
 */
const saved = async () => {
  const output = await screen.findByTestId('saved');
  return JSON.parse(output.textContent ?? '{}') as { cities?: unknown };
};

const open = () => browser.click(screen.getByRole('combobox'));
const pick = (name: string) =>
  browser.click(screen.getByRole('option', { name }));
const drop = (name: string) =>
  browser.click(screen.getByRole('button', { name: `Remove ${name}` }));
const save = () => browser.click(screen.getByRole('button', { name: 'Save' }));
const tags = () =>
  screen.queryAllByRole('listitem').map((item) => item.textContent);

describe.each(SCREENS)('a bound multi-select — %s', (_name, Bound) => {
  it('holds what was picked, in the order it was picked', async () => {
    render(<Bound />);

    await open();
    await pick('Napoli');
    await pick('Milano');
    // THE LIST STAYS OPEN AFTER A PICK — that is the component's decision, and
    // it covers what is under it. Closed first, the way a person would before
    // reaching for Save.
    await browser.keyboard('{Escape}');
    await save();

    await waitFor(async () => {
      expect((await saved()).cities).toEqual(['3', '1']);
    });
  });

  it('loses a key whose tag was removed', async () => {
    render(<Bound />);

    await open();
    await pick('Milano');
    await pick('Torino');
    await pick('Napoli');
    await browser.keyboard('{Escape}');
    await drop('Torino');
    await save();

    await waitFor(async () => {
      expect((await saved()).cities).toEqual(['1', '3']);
    });
  });

  it('comes back empty when the last one goes', async () => {
    render(<Bound />);

    await open();
    await pick('Milano');
    await browser.keyboard('{Escape}');
    await drop('Milano');
    await save();

    await waitFor(async () => {
      expect((await saved()).cities).toEqual([]);
    });
  });
});

/**
 * THE SEED, which only a real library can prove: the control asks the binding
 * what it already holds, once at mount, and the answer is the form's own
 * starting value. React 19 is left out — there is no store to seed from, and
 * the document starts empty.
 */
describe.each(SCREENS.filter(([name]) => name !== 'React 19'))(
  'a bound multi-select, seeded — %s',
  (_name, Bound) => {
    it('opens showing what the form already holds', async () => {
      render(<Bound seed={['1', '3']} />);

      await waitFor(() => expect(tags()).toEqual(['Milano', 'Napoli']));
    });
  },
);

/**
 * WRITTEN FROM OUTSIDE THE CONTROL — an app's "clear all", a draft loaded into
 * the form, a server round trip that rewrites the selection. Only the three
 * that keep a store can do it: for the two that read the document the carriers
 * ARE the value, so there is nothing to write into.
 *
 * It was outbound-only at first: the library moved and the control kept showing
 * the old choices, which is the divergence the carriers exist to prevent
 * arriving through the one door the mount-time seed does not cover.
 */
describe.each(
  SCREENS.filter(([name]) => name !== 'React 19' && name !== 'Conform'),
)('a bound multi-select, written from outside — %s', (_name, Bound) => {
  it('follows the library after mount, not only at it', async () => {
    render(<Bound seed={['1']} />);
    await waitFor(() => expect(tags()).toEqual(['Milano']));

    await browser.click(
      screen.getByRole('button', { name: 'Set from outside' }),
    );

    await waitFor(() => expect(tags()).toEqual(['Torino']));
  });
});
