import { describe, it, expect } from 'vitest';
import { useState, type ComponentProps, type ComponentType } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { z } from 'zod';
import {
  FormSegmentedControl,
  SegmentedControlItem,
  UiProvider,
  type UseFormOptionField,
} from '@fmmenchi/ui';
import {
  FormProvider,
  useForm as useRhfForm,
  type Resolver,
} from 'react-hook-form';
import { useRhfOptionField } from '@fmmenchi/ui-form-ports/react-hook-form';
import { Formik, Form as FormikForm } from 'formik';
import { createFormikOptionField } from '@fmmenchi/ui-form-ports/formik';
import { useForm as useTanstackForm } from '@tanstack/react-form';
import { createTanstackOptionField } from '@fmmenchi/ui-form-ports/tanstack';
import { FormProvider as ConformProvider, useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod/v4';
import { createConformOptionField } from '@fmmenchi/ui-form-ports/conform';
import { useActionOptionField } from '@fmmenchi/ui-form-ports/react-19';

/**
 * ONE FIELD, MANY CONTROLS — one suite, five bindings.
 *
 * The per-field port binds one control per name, which a radio group and a set
 * of checkboxes under one name cannot be. `UseFormOptionField` is the shape that
 * fits them: the hook runs once for the FIELD, and `option(value)` answers per
 * control — a plain function, so the number of options stays data and never
 * decides how many hooks run.
 *
 * What is asserted is the same for every library and is deliberately about the
 * STORED value rather than the pixels: which option the field holds after a
 * click, and — the half no per-field binding can express — that several
 * checkboxes under one name come out as a LIST, in DOCUMENT order, with an
 * untick removing exactly one.
 *
 * That order is not a preference; this suite decided it. Written as tick order
 * it passed for the two controlled libraries and failed for the three
 * uncontrolled ones, where nobody stores anything and the browser answers with
 * `FormData.getAll()`. See `checkedInGroup`.
 *
 * If a library needed its own assertions here, the port would be leaking.
 */

const COLOURS = ['red', 'green', 'blue'] as const;
const TAGS = ['news', 'offers', 'events'] as const;

const Schema = z.object({
  colour: z.string().min(1, 'Pick a colour.'),
  tags: z.array(z.string()).min(1, 'Pick at least one.'),
  // OPTIONAL on purpose: the assertions that do not touch the design system's
  // group must still be able to submit, or adding it here would rewrite what
  // the other four tests mean.
  size: z.string().optional(),
});
type Values = z.infer<typeof Schema>;

const TYPES = {
  colour: 'radio',
  tags: 'checkbox-group',
  size: 'radio',
} as const;

/**
 * The markup, written ONCE and rendered by every screen — which is the claim
 * under test. Nothing in here names a library.
 *
 * `type` is set BEFORE the spread on purpose: Conform emits its own (it shapes
 * the props by it) and must win, while the three libraries that emit none get
 * the one the group needs.
 */
function Group(props: {
  legend: string;
  type: 'radio' | 'checkbox';
  values: readonly string[];
  option: (value: string) => Omit<ComponentProps<'input'>, 'size'>;
}) {
  return (
    <fieldset>
      <legend>{props.legend}</legend>
      {props.values.map((value) => (
        <label key={value}>
          {value}
          <input type={props.type} {...props.option(value)} />
        </label>
      ))}
    </fieldset>
  );
}

/** Both groups, bound through whatever adapter the screen was given. */
function Groups(props: {
  colour: ReturnType<UseFormOptionField>;
  tags: ReturnType<UseFormOptionField>;
}) {
  return (
    <>
      <Group
        legend="Colour"
        type="radio"
        values={COLOURS}
        option={props.colour.option}
      />
      <Group
        legend="Tags"
        type="checkbox"
        values={TAGS}
        option={props.tags.option}
      />
    </>
  );
}

function Saved({ values }: { values: unknown }) {
  return values == null ? null : <output>{JSON.stringify(values)}</output>;
}

/* ── react-hook-form ─────────────────────────────────────────────────────── */

const rhfResolver: Resolver<Values> = (values) => {
  const result = Schema.safeParse(values);
  return result.success
    ? { values: result.data, errors: {} }
    : { values: {}, errors: {} as never };
};

function RhfScreen() {
  const [saved, setSaved] = useState<unknown>(null);
  const form = useRhfForm<Values>({
    defaultValues: { colour: '', tags: [], size: '' },
    resolver: rhfResolver,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(setSaved)}>
        <Bound saved={saved} useOptionField={useRhfOptionField} />
      </form>
    </FormProvider>
  );
}

/* ── Formik ──────────────────────────────────────────────────────────────── */

const formikOptionField = createFormikOptionField({ types: TYPES });

function FormikScreen() {
  const [saved, setSaved] = useState<unknown>(null);
  return (
    <Formik
      initialValues={{ colour: '', tags: [] as string[], size: '' }}
      onSubmit={setSaved}
    >
      <FormikForm>
        <Bound saved={saved} useOptionField={formikOptionField} />
      </FormikForm>
    </Formik>
  );
}

/* ── TanStack Form ───────────────────────────────────────────────────────── */

function TanstackScreen() {
  const [saved, setSaved] = useState<unknown>(null);
  const form = useTanstackForm({
    defaultValues: { colour: '', tags: [] as string[], size: '' },
    onSubmit: ({ value }) => setSaved(value),
  });
  const optionField = createTanstackOptionField(form, { types: TYPES });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <Bound saved={saved} useOptionField={optionField} />
    </form>
  );
}

/* ── Conform ─────────────────────────────────────────────────────────────── */

const conformOptionField = createConformOptionField({ types: TYPES });

function ConformScreen() {
  const [saved, setSaved] = useState<unknown>(null);
  const [form] = useForm({
    onValidate: ({ formData }) => parseWithZod(formData, { schema: Schema }),
    onSubmit: (event, { formData }) => {
      event.preventDefault();
      // Conform is uncontrolled, so the answer is in the FormData the browser
      // built — including `getAll`, which is how several checkboxes under one
      // name become a list without a line of ours.
      setSaved({
        colour: formData.get('colour'),
        tags: formData.getAll('tags'),
        size: formData.get('size'),
      });
    },
    shouldValidate: 'onSubmit',
  });
  return (
    <ConformProvider context={form.context}>
      <form id={form.id} onSubmit={form.onSubmit}>
        <Bound saved={saved} useOptionField={conformOptionField} />
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
        setSaved({
          colour: data.get('colour'),
          tags: data.getAll('tags'),
          size: data.get('size'),
        });
      }}
    >
      <Bound saved={saved} useOptionField={useActionOptionField} />
    </form>
  );
}

/**
 * The one component every screen renders, so the hook is called in the same
 * place each time — once per field, inside the form's provider.
 *
 * It also renders the DESIGN SYSTEM's own bound group through the same binding,
 * which is the half a port test alone cannot reach: `option-fields` proves the
 * five adapters agree, and this proves the component that consumes them works
 * against a real library rather than against a hand-written stub.
 */
function Bound(props: { saved: unknown; useOptionField: UseFormOptionField }) {
  const colour = props.useOptionField('colour');
  const tags = props.useOptionField('tags');
  return (
    <>
      <Groups colour={colour} tags={tags} />
      <UiProvider
        adapters={{
          i18n: { locale: 'en' },
          form: { optionField: props.useOptionField },
        }}
      >
        <FormSegmentedControl name="size" label="Size">
          <SegmentedControlItem value="s">Small</SegmentedControlItem>
          <SegmentedControlItem value="l">Large</SegmentedControlItem>
        </FormSegmentedControl>
      </UiProvider>
      <button type="submit">Save</button>
      <Saved values={props.saved} />
    </>
  );
}

/* ── the suite ───────────────────────────────────────────────────────────── */

const SCREENS: ReadonlyArray<[string, ComponentType]> = [
  ['react-hook-form', RhfScreen],
  ['Formik', FormikScreen],
  ['TanStack Form', TanstackScreen],
  ['Conform', ConformScreen],
  ['React 19', React19Screen],
];

const saved = async () =>
  JSON.parse((await screen.findByRole('status')).textContent ?? '{}') as Record<
    string,
    unknown
  >;

describe.each(SCREENS)('one name, many controls — %s', (_name, Screen) => {
  it('stores the option that was chosen, out of many controls', async () => {
    render(<Screen />);

    await browser.click(screen.getByRole('radio', { name: 'green' }));
    await browser.click(screen.getByRole('checkbox', { name: 'news' }));
    await browser.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      expect((await saved()).colour).toBe('green');
    });
  });

  it('collects several controls under one name into a list, in document order', async () => {
    render(<Screen />);

    // TICKED OUT OF ORDER ON PURPOSE, and the expectation is the order the
    // options are DECLARED in — not the order they were ticked. This assertion
    // is the reason `checkedInGroup` exists: written the other way it passed
    // for Formik and TanStack, which store what the handler appends, and failed
    // for react-hook-form, Conform and React 19, where nobody stores anything
    // and `FormData.getAll()` reads the document. One port cannot have two
    // answers, and document order is the only one all five can give.
    await browser.click(screen.getByRole('radio', { name: 'red' }));
    await browser.click(screen.getByRole('checkbox', { name: 'events' }));
    await browser.click(screen.getByRole('checkbox', { name: 'news' }));
    await browser.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      expect((await saved()).tags).toEqual(['news', 'events']);
    });
  });

  it('removes exactly the option that was unticked', async () => {
    render(<Screen />);

    await browser.click(screen.getByRole('radio', { name: 'red' }));
    await browser.click(screen.getByRole('checkbox', { name: 'news' }));
    await browser.click(screen.getByRole('checkbox', { name: 'offers' }));
    await browser.click(screen.getByRole('checkbox', { name: 'news' }));
    await browser.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      expect((await saved()).tags).toEqual(['offers']);
    });
  });

  it("binds the design system's own group, through the same adapter", async () => {
    // `FormSegmentedControl` migrated onto this shape, and until now it was
    // only ever exercised against a hand-written stub. Here it meets a real
    // library: the pick has to reach the form's state like any other field.
    render(<Screen />);

    await browser.click(
      screen.getByRole('radio', { name: 'Large' }).closest('label') as Element,
    );
    await browser.click(screen.getByRole('radio', { name: 'red' }));
    await browser.click(screen.getByRole('checkbox', { name: 'news' }));
    await browser.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      expect((await saved()).size).toBe('l');
    });
  });

  it('shows the chosen option as checked', async () => {
    render(<Screen />);

    await browser.click(screen.getByRole('radio', { name: 'blue' }));

    // The DOM is what a reader sees, whether the library holds the value or
    // the browser does — so this assertion is the same for the controlled
    // bindings and the uncontrolled ones.
    expect(screen.getByRole('radio', { name: 'blue' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'red' })).not.toBeChecked();
  });
});
