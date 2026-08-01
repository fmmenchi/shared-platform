import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RhfForm } from '@fmmenchi/ui-form-ports/react-hook-form';
import { FormChoice, FormErrorSummary, FormInput } from '@fmmenchi/ui';

/* ══════════════════════ app/signup/schema.ts ═══════════════════════════════
   The rules, in one place, in the app. The design system never sees them —
   it only ever sees the messages they produce, by field name.
   ═════════════════════════════════════════════════════════════════════════ */

const SignupSchema = z
  .object({
    email: z.string().email('Enter a valid email address.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirm: z.string(),
    tos: z.literal(true, { message: 'You have to accept to continue.' }),
  })
  // A cross-field rule lives in the schema like any other, and its message
  // still arrives BY NAME — which is all the port transports.
  //
  // Worth knowing: `.refine()` on an object runs ONLY once that object itself
  // parses. While any base rule is still failing, this one does not execute and
  // its message does not appear — which reads as "the rule is broken" when it
  // is zod doing what it documents.
  .refine((v) => v.confirm === v.password, {
    message: 'The passwords do not match.',
    path: ['confirm'],
  });

type SignupValues = z.infer<typeof SignupSchema>;

const LABELS: Record<string, string> = {
  email: 'Email',
  password: 'Password',
  confirm: 'Confirm password',
  tos: 'Terms and conditions',
};

/* ══════════════════════ app/signup/signup.tsx ══════════════════════════════
   The whole form. No useForm, no FormProvider, no handleSubmit, no <form> —
   `RhfForm` is those four, written once in the adapter package.
   ═════════════════════════════════════════════════════════════════════════ */

export function ZodScreen() {
  const [saved, setSaved] = useState<SignupValues | null>(null);

  return (
    <>
      <RhfForm<SignupValues>
        options={{
          defaultValues: {
            email: '',
            password: '',
            confirm: '',
            tos: false as true,
          },
          // the ONE line that says zod
          resolver: zodResolver(SignupSchema),
        }}
        onSubmit={async (values) => {
          await new Promise((r) => setTimeout(r, 600));
          setSaved(values);
        }}
      >
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
        <FormChoice name="tos" label="I accept the terms and conditions" />
        <button type="submit">Create account</button>
      </RhfForm>
      {saved ? (
        <output className="saved">Submitted: {JSON.stringify(saved)}</output>
      ) : null}
    </>
  );
}
