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
 * IT DOES NOT HOLD, and that is this file's result. With no library at all the
 * model is exact: `FormData` reads the document, so the carriers ARE the value,
 * in document order, and the last one leaving empties the field. Every one of
 * the four bindings disagrees, each in its own way, and the disagreements are
 * asserted below at what they measurably do rather than at what they should.
 * ADR-0028 §12 put this proof BEFORE the component for exactly this outcome:
 * "building multiple against the existing shape would mean faking in the
 * component what the port refused to fake", and the port refuses.
 *
 * So multiple does not ship on this shape. What comes next is a port-level
 * decision — a set-shaped binding beside `option(value)`, or the fallback the
 * ADR already names, where multiple binds through each library's controlled API
 * and the carriers stay for `FormData` and the no-JavaScript remainder. That is
 * a decision, not an implementation detail, which is why this file stops here.
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
  return (
    <>
      {CITIES.map((city) => (
        <button
          key={city}
          type="button"
          onClick={() =>
            setChosen((rest) =>
              rest.includes(city)
                ? rest
                : // DOCUMENT ORDER IS THE DECLARED ORDER, not the order things
                  // were picked: the uncontrolled bindings answer with
                  // `FormData.getAll()`, which reads the document, and one port
                  // cannot have two answers.
                  CITIES.filter((c) => rest.includes(c) || c === city),
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
          onClick={() => setChosen((rest) => rest.filter((c) => c !== city))}
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
 * WHAT THE FIVE ACTUALLY DO, measured — and the answer is sharper than "it
 * works" or "it does not".
 *
 * Three scenarios, run against every binding: add two keys out of order; remove
 * one from the middle of three; remove the only one. What comes out:
 *
 *   React 19        document order yes · a removal yes · the last one yes
 *   Conform         document order yes · a removal yes · the last one yes
 *   Formik          document order yes · a removal NO  · the last one NO
 *   TanStack Form   document order yes · a removal NO  · the last one NO
 *   react-hook-form document order NO  · a removal NO  · the last one NO
 *
 * The line runs where you would expect once it is drawn. The two that READ THE
 * DOCUMENT are exact. The three that KEEP A STORE are told when a carrier
 * arrives and never told when one leaves — an unmounting control dispatches
 * nothing, so a store has no way to hear it, and the value then holds a key the
 * reader removed. That is a form posting something nobody asked for.
 *
 * react-hook-form adds the second half of the same cause: it stores in the order
 * it was TOLD, where the document says otherwise, so two readers who picked the
 * same two cities in a different order submit different values.
 *
 * WHAT IT DECIDES. Multiple does not ship on this shape — which is exactly what
 * ADR-0028 §12 put this proof in front of the component to find out: "building
 * multiple against the existing shape would mean faking in the component what
 * the port refused to fake". The next step is a port-level decision rather than
 * an implementation detail: a set-shaped binding beside `option(value)` that can
 * say "this key is gone", or the fallback the ADR already names, where multiple
 * binds through each library's controlled API and the carriers stay for
 * `FormData` and the no-JavaScript remainder.
 *
 * The rows marked NO are asserted below at what they measurably do. They are gap
 * records: each fails the day its adapter changes, which is when somebody should
 * read this file again.
 */

const READS_THE_DOCUMENT: ReadonlyArray<[string, ComponentType]> = [
  ['React 19', React19Screen],
  ['Conform', ConformScreen],
];

const KEEPS_A_STORE: ReadonlyArray<[string, ComponentType]> = [
  ['react-hook-form', RhfScreen],
  ['TanStack Form', TanstackScreen],
  ['Formik', FormikScreen],
];

const ORDERS_BY_THE_DOCUMENT: ReadonlyArray<[string, ComponentType]> = [
  ...READS_THE_DOCUMENT,
  ['Formik', FormikScreen],
  ['TanStack Form', TanstackScreen],
];

describe.each(ORDERS_BY_THE_DOCUMENT)(
  'the order a dynamic set comes out in — %s',
  (_name, Screen) => {
    it('is the document’s, not the order the keys were picked', async () => {
      render(<Screen />);

      await add('Napoli');
      await add('Milano');
      await save();

      await waitFor(async () => {
        expect((await saved()).cities).toEqual(['Milano', 'Napoli']);
      });
    });
  },
);

describe('the order a dynamic set comes out in — react-hook-form', () => {
  it('is the order it was TOLD, which the document contradicts', async () => {
    // A GAP RECORD, not a contract: two readers picking the same two cities in
    // a different order submit different values.
    render(<RhfScreen />);

    await add('Napoli');
    await add('Milano');
    await save();

    await waitFor(async () => {
      expect((await saved()).cities).toEqual(['Napoli', 'Milano']);
    });
  });
});

describe.each(READS_THE_DOCUMENT)(
  'a carrier that leaves — %s',
  (_name, Screen) => {
    it('takes exactly its own key with it', async () => {
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

    it('leaves the field EMPTY when it was the last, not absent', async () => {
      render(<Screen />);

      await add('Milano');
      await remove('Milano');
      await save();

      await waitFor(async () => {
        expect((await saved()).cities).toEqual([]);
      });
    });
  },
);

describe.each(KEEPS_A_STORE)('a carrier that leaves — %s', (_name, Screen) => {
  it('is NOT noticed: the key it carried stays in the value', async () => {
    // THE GAP THAT STOPS THE COMPONENT. An unmounting control dispatches
    // nothing, so a store has no way to hear it — and the form then posts a key
    // the reader removed.
    render(<Screen />);

    await add('Milano');
    await add('Torino');
    await add('Napoli');
    await remove('Torino');
    await save();

    await waitFor(async () => {
      expect((await saved()).cities).toEqual(['Milano', 'Torino', 'Napoli']);
    });
  });

  it('leaves the last key behind too, so the field never empties', async () => {
    render(<Screen />);

    await add('Milano');
    await remove('Milano');
    await save();

    await waitFor(async () => {
      expect((await saved()).cities).toEqual(['Milano']);
    });
  });
});
