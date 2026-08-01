import { createContext, useContext, type ReactNode } from 'react';
import type { UseFormErrors, UseFormField } from '@fmmenchi/ui';

/**
 * The port, fed by REACT 19 ALONE — no form library.
 *
 * React 19 covers the half a library used to be needed for: `<form action>`
 * replaces the submit handler, `useFormStatus` reports the wait, `useActionState`
 * carries what the action returned. What it does NOT do is validation or
 * per-field error tracking — which is precisely the half this port transports.
 *
 * So the two fit together with nothing in between: the action validates however
 * it likes (a zod schema, a server round trip) and returns errors keyed by
 * NAME; this hands them to the design system.
 *
 * Everything else is native: the controls are uncontrolled, so `FormData`
 * collects the values and the form submits without JavaScript.
 */
export interface ActionErrors {
  readonly [field: string]: readonly string[];
}

const ActionErrorsContext = createContext<ActionErrors>({});

/** Puts the last action's errors in scope. */
export function ActionErrorsProvider(props: {
  errors: ActionErrors;
  children: ReactNode;
}) {
  return (
    <ActionErrorsContext value={props.errors}>
      {props.children}
    </ActionErrorsContext>
  );
}

/**
 * The field binding: the control is left entirely native — no value, no
 * onChange — because with an action the browser collects it.
 */
export const useActionField: UseFormField = (name) => {
  const errors = useContext(ActionErrorsContext);
  return { control: { name }, errors: errors[name] };
};

export const useActionErrors: UseFormErrors = () =>
  useContext(ActionErrorsContext);
