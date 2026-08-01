import { useState } from 'react';
import { FormAdapterProvider } from '@fmmenchi/ui';
import type { Resolver } from 'react-hook-form';
import {
  RhfHost,
  useRhfField,
  useRhfErrors,
} from '../adapters/react-hook-form.js';
import { useHandRolledForm } from '../adapters/no-library.js';
import {
  EMPTY,
  SignupFields,
  validate,
  type SignupValues,
} from './signup-fields.js';

const resolver: Resolver<SignupValues> = (values) => {
  const errors = validate(values as SignupValues);
  const asRhf = Object.fromEntries(
    Object.entries(errors).map(([name, messages]) => [
      name,
      { type: 'schema', message: messages[0] },
    ]),
  );
  return Object.keys(errors).length > 0
    ? { values: {}, errors: asRhf }
    : { values: values as SignupValues, errors: {} };
};

/** The same screen, bound with react-hook-form. */
export function SignupWithRhf({ prefill }: { prefill?: SignupValues }) {
  const [saved, setSaved] = useState<SignupValues | null>(null);
  return (
    <>
      <RhfHost
        defaultValues={EMPTY}
        values={prefill}
        resolver={resolver}
        onSubmit={async (values) => {
          await new Promise((r) => setTimeout(r, 700));
          setSaved(values);
        }}
      >
        <FormAdapterProvider field={useRhfField} errors={useRhfErrors}>
          <SignupFields />
        </FormAdapterProvider>
      </RhfHost>
      <Saved values={saved} />
    </>
  );
}

/** The same screen, bound with no form library at all. */
export function SignupWithNoLibrary() {
  const [saved, setSaved] = useState<SignupValues | null>(null);
  const { field, formErrors, Host } = useHandRolledForm<SignupValues>({
    initial: EMPTY,
    validate,
    onSubmit: async (values) => {
      await new Promise((r) => setTimeout(r, 700));
      setSaved(values);
    },
  });
  return (
    <>
      <Host>
        <FormAdapterProvider field={field} errors={formErrors}>
          <SignupFields />
        </FormAdapterProvider>
      </Host>
      <Saved values={saved} />
    </>
  );
}

function Saved({ values }: { values: SignupValues | null }) {
  if (values == null) return null;
  return <output className="saved">Submitted: {JSON.stringify(values)}</output>;
}
