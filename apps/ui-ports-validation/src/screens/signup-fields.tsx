import {
  Fieldset,
  FieldsetContent,
  FieldsetLegend,
  FormChoice,
  FormErrorSummary,
  FormInput,
  FormSubmit,
  Radio,
} from '@fmmenchi/ui';

export const LABELS: Record<string, string> = {
  email: 'Email',
  password: 'Password',
  confirm: 'Confirm password',
  tos: 'Terms and conditions',
};

/**
 * The screen's fields, written ONCE.
 *
 * Nothing here names a form library — that is the whole thing being validated.
 * Every screen renders this same component and only swaps what is above it.
 */
export function SignupFields({ register }: { register?: unknown }) {
  return (
    <>
      <FormErrorSummary labelFor={(name) => LABELS[name] ?? name} />

      <FormInput
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        hint="We’ll only use it to sign you in."
      />
      <FormInput
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
      />
      <FormInput
        name="confirm"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
      />

      {/* A GROUP is the group's field: bound per option, named by a legend. */}
      <Fieldset role="radiogroup">
        <FieldsetLegend>Plan</FieldsetLegend>
        <FieldsetContent>
          <label className="row">
            <Radio name="plan" value="free" defaultChecked /> Free
          </label>
          <label className="row">
            <Radio name="plan" value="pro" /> Pro — 10 € / month
          </label>
        </FieldsetContent>
      </Fieldset>

      <FormChoice name="tos" label="I accept the terms and conditions" />
      <FormSubmit>Create account</FormSubmit>
    </>
  );
}

export type SignupValues = {
  email: string;
  password: string;
  confirm: string;
  plan: string;
  tos: boolean;
};

export const EMPTY: SignupValues = {
  email: '',
  password: '',
  confirm: '',
  plan: 'free',
  tos: false,
};

/** The rules, in one place, in the shape a schema library would produce. */
export function validate(values: SignupValues): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (!/.+@.+\..+/.test(values.email))
    errors.email = ['Enter a valid email address.'];
  if (values.password.length < 8)
    errors.password = ['Use at least 8 characters.'];
  if (values.confirm !== values.password)
    errors.confirm = ['The passwords do not match.'];
  if (values.tos !== true) errors.tos = ['You have to accept to continue.'];
  return errors;
}
