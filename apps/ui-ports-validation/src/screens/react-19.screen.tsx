import { useActionState } from 'react';
import { z } from 'zod';
import {
  FormChoice,
  FormErrorSummary,
  FormInput,
  UiProvider,
} from '@fmmenchi/ui';
import {
  ActionErrorsProvider,
  useActionErrors,
  useActionField,
  type ActionErrors,
} from '@fmmenchi/ui-form-ports/react-19';

const Schema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
  tos: z.literal('on', { message: 'You have to accept to continue.' }),
});

const LABELS: Record<string, string> = {
  email: 'Email',
  password: 'Password',
  tos: 'Terms and conditions',
};

/** The submit button, told it is waiting by React itself. */
function Submit() {
  return <button type="submit">Create account</button>;
}

/**
 * No form library at all. React 19 owns submission; a zod schema owns the
 * rules; the port carries the messages between them.
 */
export function React19Screen() {
  const [state, action] = useActionState<
    { errors: ActionErrors; saved?: Record<string, string> },
    FormData
  >(
    async (_previous, data) => {
      const parsed = Schema.safeParse(Object.fromEntries(data));
      if (!parsed.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0]);
          errors[key] = [...(errors[key] ?? []), issue.message];
        }
        return { errors };
      }
      await new Promise((r) => setTimeout(r, 500));
      return {
        errors: {},
        saved: parsed.data as unknown as Record<string, string>,
      };
    },
    { errors: {} },
  );

  return (
    <ActionErrorsProvider errors={state.errors}>
      {/* A NESTED UiProvider overrides the app-wide binding for this subtree —
          which is the whole reason a per-form binding prop was unnecessary. */}
      <UiProvider
        adapters={{
          i18n: { locale: 'en' },
          form: { field: useActionField, errors: useActionErrors },
        }}
      >
        <form action={action}>
          <FormErrorSummary labelFor={(name) => LABELS[name] ?? name} />
          <FormInput
            name="email"
            label="Email"
            type="email"
            hint="We’ll only use it to sign you in."
          />
          <FormInput name="password" label="Password" type="password" />
          <FormChoice name="tos" label="I accept the terms and conditions" />
          <Submit />
        </form>
      </UiProvider>
      {state.saved ? (
        <output className="saved">
          Submitted: {JSON.stringify(state.saved)}
        </output>
      ) : null}
    </ActionErrorsProvider>
  );
}
