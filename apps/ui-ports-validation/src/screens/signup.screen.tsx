import { useState } from 'react';
import { UiProvider } from '@fmmenchi/ui';
import type { Resolver } from 'react-hook-form';
import { RhfForm } from '@fmmenchi/ui-form-ports/react-hook-form';
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
      {/* RhfForm is the library's: useForm, its provider, the <form> and
          handleSubmit, written once there instead of in every app. */}
      <RhfForm<SignupValues>
        options={{ defaultValues: EMPTY, values: prefill, resolver }}
        onSubmit={async (values) => {
          await new Promise((r) => setTimeout(r, 700));
          setSaved(values);
        }}
      >
        <SignupFields />
      </RhfForm>
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
        <UiProvider
          adapters={{
            i18n: { locale: 'en' },
            form: { field: field, errors: formErrors },
          }}
        >
          <SignupFields />
        </UiProvider>
      </Host>
      <Saved values={saved} />
    </>
  );
}

function Saved({ values }: { values: SignupValues | null }) {
  if (values == null) return null;
  return <output className="saved">Submitted: {JSON.stringify(values)}</output>;
}
