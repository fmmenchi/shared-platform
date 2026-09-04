import { describe, it, expect } from 'vitest';
import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type Ref,
} from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { z } from 'zod';
import type { UseFormOptionField } from '@fmmenchi/ui';
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
 * A COUNT THAT CHANGES — the half of "one name, many controls" that
 * `option-fields` cannot reach, and the precondition ADR-0028 §12 puts in front
 * of the combobox's multiple mode.
 *
 * That suite proves the five bindings agree about a FIXED set of checkboxes.
 * Every control is mounted from the first render, so the question it answers is
 * only "which of them are on". A multi-select combobox is the other shape: the
 * controls themselves come and go as chips are added and removed, and the count
 * under one name is whatever the reader has chosen so far.
 *
 * What is asserted is deliberately about the STORED value rather than the
 * pixels — which keys the field holds after each change, in DOCUMENT order,
 * with a removal taking exactly one away. The harness is a hand-written stand-in
 * for the component, not the component: proving the port before building on it
 * is the whole point of the ordering the ADR sets out, and a proof that used
 * the component would move the moment the component did.
 *
 * THE MODEL IT SET OUT TO PROVE was that, to a form, a multi-select is N checked
 * checkboxes under one name — which is what `<select multiple>` already is, and
 * would have asked nothing new of the port.
 *
 * IT DID NOT HOLD, and closing that is what this file bought. With no library
 * at all the model is exact: `FormData` reads the document, so the carriers ARE
 * the value. Every binding that keeps a store disagreed — see the note over the
 * assertions below for what each of them did, and why it was nobody's defect.
 *
 * The port gained one optional member for it (`setValues` on the option field),
 * and the assertions below are now the same three for all five.
 */

const CITIES = ['Milano', 'Torino', 'Napoli'] as const;

const Schema = z.object({
  cities: z.array(z.string()),
});
type Values = z.infer<typeof Schema>;

// A SET UNDER ONE NAME, which is what the adapters call a checkbox group — the
// same declaration `option-fields` makes for its fixed set of tags. The whole
// question this file asks is whether that declaration survives the set becoming
// dynamic.
const TYPES = { cities: 'checkbox-group' } as const;

/**
 * The stand-in for what a multi-select combobox renders: one carrier per chosen
 * key, and nothing at all for a key that is not chosen.
 *
 * SR-ONLY CHECKBOXES, not hidden inputs. A `type="hidden"` is in value mode
 * "default", so `form.reset()` restores it onto itself and the field comes back
 * from a reset holding what it held before — the reason the single-select
 * carrier is a real, focusable control too.
 *
 * A carrier that exists IS a chosen key: there is no state in which one is
 * rendered and off. How it says so is `Carrier`'s business, below.
 */
function Carriers(props: {
  chosen: readonly string[];
  option: (value: string) => Omit<ComponentProps<'input'>, 'size'>;
}) {
  return (
    <>
      {props.chosen.map((city) => (
        <Carrier key={city} city={city} option={props.option} />
      ))}
    </>
  );
}

/**
 * ONE CARRIER, AND THE TWO EVENTS IT OWES THE BINDING — which is this file's
 * whole finding, and it was measured rather than assumed.
 *
 * Rendering a checked control and letting the binding notice is enough for
 * exactly one of the five: React 19, where nobody stores anything and
 * `FormData` reads the document. The other four said otherwise:
 *
 *   - Formik, TanStack and Conform answer `option(value)` from a store that has
 *     never been told about this key, so the props they hand back turn the
 *     control OFF again — the field came out empty however many carriers were
 *     mounted;
 *   - react-hook-form went the other way and kept what it had been told: a
 *     carrier that was unmounted stayed in the value, and the last removal left
 *     the field still holding it. It also stored in the order the keys were
 *     PICKED, where the document says otherwise.
 *
 * So a mounted carrier is not an announcement, and an unmounted one is not a
 * retraction. Both have to be said, in the language every binding already
 * listens to: a real event on a real control. `click()` is that — it flips
 * `checked` and dispatches through React's own handler, so a ref-based library
 * and a controlled one hear the same thing.
 *
 * THE RETRACTION RUNS IN THE CLEANUP, before React takes the node out. The
 * alternative is telling the binding nothing and hoping it watches the DOM,
 * which is the half react-hook-form measurably does not do.
 */
function Carrier(props: {
  city: string;
  option: (value: string) => Omit<ComponentProps<'input'>, 'size'>;
}) {
  const node = useRef<HTMLInputElement | null>(null);
  const bound = props.option(props.city);

  useLayoutEffect(() => {
    const element = node.current;
    if (element === null) return;
    if (!element.checked) element.click();
    return () => {
      if (element.checked) element.click();
    };
  }, []);

  return (
    <input
      type="checkbox"
      aria-label={`carrier ${props.city}`}
      style={{ position: 'absolute', inlineSize: 1, blockSize: 1 }}
      {...bound}
      ref={mergeRefs(bound.ref as Ref<HTMLInputElement> | undefined, node)}
    />
  );
}

/** The binding may want the node too — a ref-based one always does. */
function mergeRefs(
  ...refs: Array<Ref<HTMLInputElement> | undefined>
): (element: HTMLInputElement | null) => void {
  return (element) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(element);
      else if (ref != null)
        (ref as { current: HTMLInputElement | null }).current = element;
    }
  };
}

/** The chips, and the two ways their number changes. */
function Picker(props: { field: ReturnType<UseFormOptionField> }) {
  const [chosen, setChosen] = useState<readonly string[]>([]);

  // THE WHOLE LIST, said to the binding on every change — the port member that
  // exists because a carrier which unmounts sends nothing. An adapter whose
  // library reads the document implements nothing and this is a no-op there.
  const choose = (next: readonly string[]) => {
    setChosen(next);
    props.field.setValues?.(next);
  };

  return (
    <>
      {CITIES.map((city) => (
        <button
          key={city}
          type="button"
          onClick={() =>
            // DOCUMENT ORDER IS THE DECLARED ORDER, not the order things were
            // picked: the uncontrolled bindings answer with `FormData.getAll()`,
            // which reads the document, and one port cannot have two answers.
            // Told to the binding as well, so the ones that keep a store hold
            // the same order rather than the order they were told about.
            choose(
              chosen.includes(city)
                ? chosen
                : CITIES.filter((c) => chosen.includes(c) || c === city),
            )
          }
        >
          Add {city}
        </button>
      ))}
      {chosen.map((city) => (
        <button
          key={city}
          type="button"
          onClick={() => choose(chosen.filter((c) => c !== city))}
        >
          Remove {city}
        </button>
      ))}
      <Carriers chosen={chosen} option={props.field.option} />
    </>
  );
}

function Saved({ values }: { values: unknown }) {
  return values == null ? null : <output>{JSON.stringify(values)}</output>;
}

function Bound(props: { saved: unknown; useOptionField: UseFormOptionField }) {
  const cities = props.useOptionField('cities');
  return (
    <>
      <Picker field={cities} />
      <button type="submit">Save</button>
      <Saved values={props.saved} />
    </>
  );
}

/* ── react-hook-form ─────────────────────────────────────────────────────── */

const rhfResolver: Resolver<Values> = (values) => {
  const result = Schema.safeParse(values);
  return result.success
    ? { values: result.data, errors: {} }
    : { values: {}, errors: {} };
};

function RhfScreen() {
  const [saved, setSaved] = useState<unknown>(null);
  const form = useRhfForm<Values>({
    defaultValues: { cities: [] },
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
    <Formik initialValues={{ cities: [] as string[] }} onSubmit={setSaved}>
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
    defaultValues: { cities: [] as string[] },
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
      setSaved({ cities: formData.getAll('cities') });
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
        setSaved({ cities: data.getAll('cities') });
      }}
    >
      <Bound saved={saved} useOptionField={useActionOptionField} />
    </form>
  );
}

/* ── the suite ───────────────────────────────────────────────────────────── */

const saved = async () =>
  JSON.parse((await screen.findByRole('status')).textContent ?? '{}') as {
    cities?: unknown;
  };

const add = (city: string) =>
  browser.click(screen.getByRole('button', { name: `Add ${city}` }));
const remove = (city: string) =>
  browser.click(screen.getByRole('button', { name: `Remove ${city}` }));
const save = () => browser.click(screen.getByRole('button', { name: 'Save' }));

/**
 * ONE CONTRACT, FIVE BINDINGS — which is this package's own test of whether a
 * port leaks: if a library needed its own assertions, it would.
 *
 * It did not always pass. The first version of this file measured the five
 * against a set that the carriers alone reported, and the answer was no: the
 * two bindings that read the document at submit were exact, and the three that
 * keep a store were told when a carrier arrived and never told when one left,
 * so the value kept a key the reader had removed. One of them also stored in
 * the order it was TOLD rather than the document's, so two readers who picked
 * the same two cities in a different order submitted different values.
 *
 * The cause was not a defect in any library. **A removal is the absence of an
 * element, so it has nobody to send an event for it** — an unmounting control
 * is silent by construction, and a store cannot hear silence.
 *
 * So the field says the whole truth instead, through `setValues` on the option
 * port: the carriers DRAW the value and no longer report it. Three adapters
 * implement it in a line with the API their library already has; the two that
 * read the document implement nothing, because there is nothing to update.
 * These assertions are what that bought.
 */

const SCREENS: ReadonlyArray<[string, ComponentType]> = [
  ['react-hook-form', RhfScreen],
  ['Formik', FormikScreen],
  ['TanStack Form', TanstackScreen],
  ['Conform', ConformScreen],
  ['React 19', React19Screen],
];

describe.each(SCREENS)('a count that changes — %s', (_name, Screen) => {
  it('holds every carrier that is mounted, in document order', async () => {
    render(<Screen />);

    // PICKED OUT OF ORDER, stored in the declared one. The uncontrolled
    // bindings answer with `FormData.getAll()`, which reads the document; the
    // ones that keep a store are handed the same order rather than the order
    // they happened to be told about.
    await add('Napoli');
    await add('Milano');
    await save();

    await waitFor(async () => {
      expect((await saved()).cities).toEqual(['Milano', 'Napoli']);
    });
  });

  it('loses exactly the carrier that was unmounted', async () => {
    render(<Screen />);

    await add('Milano');
    await add('Torino');
    await add('Napoli');
    await remove('Torino');
    await save();

    await waitFor(async () => {
      expect((await saved()).cities).toEqual(['Milano', 'Napoli']);
    });
  });

  it('comes back empty when the last carrier goes, not absent', async () => {
    // THE CASE A FIXED SET CANNOT REACH: with nothing mounted under the name
    // there is no entry in the `FormData` at all, so a server would see the
    // field as MISSING rather than empty. Every binding now answers with an
    // empty list instead.
    render(<Screen />);

    await add('Milano');
    await remove('Milano');
    await save();

    await waitFor(async () => {
      expect((await saved()).cities).toEqual([]);
    });
  });
});
