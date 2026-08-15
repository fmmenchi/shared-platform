import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { UiProvider, FormCombobox, type UseFormField } from '@fmmenchi/ui';
import {
  useForm as useRhf,
  FormProvider as RhfProvider,
  useFormContext,
} from 'react-hook-form';
import { Formik, Form as FormikForm, useFormikContext } from 'formik';
import {
  FormProvider as ConformProvider,
  getFormProps,
  useForm as useConform,
} from '@conform-to/react';
import { createFormikField } from '@fmmenchi/ui-form-ports/formik';
import { createConformField } from '@fmmenchi/ui-form-ports/conform';

/**
 * `FormCombobox` against the REAL libraries — the row this package's own rule
 * says a new bound component is not done without, and which the combobox
 * shipped without.
 *
 * Its own suite in `packages/client/ui` binds it to a hand-written stub that
 * emits four keys, and an adversarial review made the point that the stub
 * cannot see what the component is FOR: the routing table exists because
 * `getInputProps` forwards `type`, `pattern`, `multiple` and the length
 * constraints, and the stub emits none of them. Delete the whole destructure
 * and spread the binding blind, and every test in that file still passes.
 *
 * THREE LIBRARIES BECAUSE THERE ARE THREE MECHANICS, not because the port
 * leaks. Ref-based (react-hook-form) writes the DOM node and reads it back;
 * CONTROLLED (Formik, and TanStack identically) hands over a `value` and no ref
 * at all; FORMDATA (Conform) emits a `defaultValue` and lets the DOM keep the
 * value, then reads the form on submit. The carrier has to answer all three,
 * and the first version of it answered none — pushed to and never read from, it
 * wiped `defaultValues` on mount and clobbered every later write.
 *
 * The assertions below are the SAME four in each block, which is the shape the
 * rule asks for.
 */

interface City {
  id: string;
  name: string;
}

const CITIES: City[] = [
  { id: '1', name: 'Milano' },
  { id: '2', name: 'Torino' },
  { id: '3', name: 'Manchester' },
];

const wiring = {
  items: CITIES,
  getKey: (city: City) => city.id,
  getLabel: (city: City) => city.name,
};

const field = () => screen.getByRole('combobox', { name: 'Città' });
const carrier = (container: HTMLElement) =>
  container.querySelector('[data-carrier]') as HTMLInputElement;

/** Choose Manchester with the keyboard — three rows down, then commit. */
const chooseManchester = async () => {
  await browser.click(field());
  await browser.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
};

// ── react-hook-form: ref-based ───────────────────────────────────────────────

const useRhfField: UseFormField = (name) => {
  const { register } = useFormContext();
  return { control: register(name), errors: [] };
};

function RhfForm({
  onSubmit,
  defaultValues = { city: '' },
  children,
}: {
  onSubmit: (values: unknown) => void;
  defaultValues?: { city: string };
  children?: ReactNode;
}) {
  const form = useRhf({ defaultValues });
  return (
    <RhfProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <UiProvider
          adapters={{ i18n: { locale: 'it' }, form: { field: useRhfField } }}
        >
          <FormCombobox {...wiring} name="city" label="Città" />
        </UiProvider>
        <button type="submit">Invia</button>
        {children}
      </form>
    </RhfProvider>
  );
}

describe('FormCombobox through react-hook-form', () => {
  it('submits the KEY the user chose, not the label they read', async () => {
    const onSubmit = vi.fn();
    render(<RhfForm onSubmit={onSubmit} />);

    await chooseManchester();
    await browser.click(screen.getByRole('button', { name: 'Invia' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    // The two ways this goes wrong: `Manchester` (the ref on the visible field,
    // so the library stored the search text) and `undefined` (no ref at all).
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ city: '3' });
  });

  it('keeps defaultValues, which the first carrier destroyed on mount', async () => {
    // `register()`'s ref callback fires in the COMMIT phase, so the node already
    // holds `2` when the component's first passive effect runs. Pushing blindly,
    // that effect wrote an empty string over it AND dispatched an `input` event
    // saying so — the form's own default value deleted by the control that was
    // supposed to display it, before the user touched anything.
    const onSubmit = vi.fn();
    render(<RhfForm onSubmit={onSubmit} defaultValues={{ city: '2' }} />);

    await waitFor(() => {
      expect(field()).toHaveValue('Torino');
    });

    await browser.click(screen.getByRole('button', { name: 'Invia' }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ city: '2' });
  });

  it('follows setValue, which writes the node with no event and no render', async () => {
    function SetValueForm() {
      const form = useRhf({ defaultValues: { city: '' } });
      return (
        <RhfProvider {...form}>
          <UiProvider
            adapters={{ i18n: { locale: 'it' }, form: { field: useRhfField } }}
          >
            <FormCombobox {...wiring} name="city" label="Città" />
          </UiProvider>
          <button type="button" onClick={() => form.setValue('city', '1')}>
            Da fuori
          </button>
        </RhfProvider>
      );
    }
    render(<SetValueForm />);

    await chooseManchester();
    expect(field()).toHaveValue('Manchester');

    // Only the wrapped `value` descriptor can see this. Unheard, the box went on
    // reading `Manchester` over a form holding `1`.
    await browser.click(screen.getByRole('button', { name: 'Da fuori' }));
    await waitFor(() => {
      expect(field()).toHaveValue('Milano');
    });
  });

  it('follows a reset back to what the form started with', async () => {
    function ResetForm() {
      const form = useRhf({ defaultValues: { city: '2' } });
      return (
        <RhfProvider {...form}>
          <UiProvider
            adapters={{ i18n: { locale: 'it' }, form: { field: useRhfField } }}
          >
            <FormCombobox {...wiring} name="city" label="Città" />
          </UiProvider>
          <button type="button" onClick={() => form.reset()}>
            Azzera
          </button>
        </RhfProvider>
      );
    }
    const { container } = render(<ResetForm />);
    await waitFor(() => {
      expect(field()).toHaveValue('Torino');
    });

    await chooseManchester();
    expect(carrier(container)).toHaveValue('3');

    await browser.click(screen.getByRole('button', { name: 'Azzera' }));
    await waitFor(() => {
      expect(field()).toHaveValue('Torino');
    });
    expect(carrier(container)).toHaveValue('2');
  });
});

// ── Formik: controlled ───────────────────────────────────────────────────────

const useFormikCombobox = createFormikField();

function FormikSetter() {
  const { setFieldValue, values } = useFormikContext<{ city: string }>();
  return (
    <>
      <button
        type="button"
        onClick={() => void setFieldValue('city', '1')}
        // eslint-disable-next-line react/jsx-no-literals -- a test fixture's label
      >
        Da fuori
      </button>
      <output data-testid="held">{values.city}</output>
    </>
  );
}

function FormikHost({ initial = '' }: { initial?: string }) {
  return (
    <Formik initialValues={{ city: initial }} onSubmit={() => undefined}>
      <FormikForm>
        <UiProvider
          adapters={{
            i18n: { locale: 'it' },
            form: { field: useFormikCombobox },
          }}
        >
          <FormCombobox {...wiring} name="city" label="Città" />
        </UiProvider>
        <FormikSetter />
      </FormikForm>
    </Formik>
  );
}

describe('FormCombobox through Formik, which is controlled', () => {
  it('submits the KEY the user chose', async () => {
    render(<FormikHost />);

    await chooseManchester();
    await waitFor(() => {
      expect(screen.getByTestId('held')).toHaveTextContent('3');
    });
  });

  it('takes the library’s initial value and shows the label for it', async () => {
    render(<FormikHost initial="2" />);
    await waitFor(() => {
      expect(field()).toHaveValue('Torino');
    });
  });

  it('follows setFieldValue, which arrives as a bare assignment', async () => {
    // A controlled adapter hands over `value` and no ref, so `useBoundCarrier`
    // assigns the node directly. Unheard, the box stayed on the old label AND
    // the component's next commit wrote the empty string back over it — Formik's
    // own state wiped through the control that was setting it.
    const { container } = render(<FormikHost />);

    await chooseManchester();
    expect(carrier(container)).toHaveValue('3');

    await browser.click(screen.getByRole('button', { name: 'Da fuori' }));
    await waitFor(() => {
      expect(field()).toHaveValue('Milano');
    });
    expect(carrier(container)).toHaveValue('1');
    expect(screen.getByTestId('held')).toHaveTextContent('1');
  });
});

// ── Conform: FormData, and the one that shapes props from a schema ───────────

/**
 * `types: { city: 'combobox' }` is declared because it is the natural thing to
 * declare — and because declaring it is NOT what keeps the constraint
 * attributes off the key. `getInputProps` emits `pattern`, `multiple` and the
 * length constraints whatever type it is handed; the routing table in
 * `FormCombobox` is what drops them, and this is the only place that can see it
 * work.
 */
const conformCombobox = createConformField({ types: { city: 'combobox' } });

function ConformForm() {
  const [form] = useConform({
    defaultValue: { city: '2' },
    // A key's constraint, which is what a schema over an id looks like — and
    // which is checked against the CARRIER's value while the user types into the
    // visible box. `maxLength` reaching the visible field truncates the query at
    // the length of a value nobody sees.
    constraint: { city: { required: true, maxLength: 1, pattern: '[0-9]+' } },
  });
  return (
    <ConformProvider context={form.context}>
      <form {...getFormProps(form)}>
        <UiProvider
          adapters={{
            i18n: { locale: 'it' },
            form: { field: conformCombobox },
          }}
        >
          <FormCombobox {...wiring} name="city" label="Città" />
        </UiProvider>
        <button type="reset">Annulla</button>
      </form>
    </ConformProvider>
  );
}

describe('FormCombobox under Conform', () => {
  it('takes the seed Conform emits and shows the label for it', () => {
    render(<ConformForm />);
    expect(field()).toHaveValue('Torino');
  });

  it('posts the KEY through FormData, which is Conform’s whole model', async () => {
    const { container } = render(<ConformForm />);

    await chooseManchester();
    const form = container.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).getAll('city')).toEqual(['3']);
  });

  it('keeps the key’s own constraints off the box you type in', async () => {
    render(<ConformForm />);
    const box = field();

    // NONE of these describe the visible field, which holds a query. A
    // `maxLength` of 1 would stop the search at one character; a `pattern` of
    // digits would block the submit for good against text that can never match.
    expect(box).not.toHaveAttribute('pattern');
    expect(box).not.toHaveAttribute('maxlength');
    expect(box).not.toHaveAttribute('multiple');
    expect(box).toHaveAttribute('type', 'text');

    // And the box still takes a query longer than the key it will submit —
    // eleven characters against the key's `maxLength: 1`, which is the proof
    // that reads as a number rather than as an absent attribute.
    await browser.click(box);
    await browser.keyboard('Manch');
    expect(box).toHaveValue('TorinoManch');
  });

  it('follows the form’s own reset back to the seed', async () => {
    const { container } = render(<ConformForm />);

    await chooseManchester();
    expect(carrier(container)).toHaveValue('3');

    await browser.click(screen.getByRole('button', { name: 'Annulla' }));
    await waitFor(() => {
      expect(carrier(container)).toHaveValue('2');
    });
    // The state followed the DOM, which is the half that did not exist: the box
    // went on showing the discarded choice, and the next commit wrote it back.
    expect(field()).toHaveValue('Torino');
  });
});
