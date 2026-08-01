import type {
  ChangeEventHandler,
  ComponentProps,
  FocusEventHandler,
} from 'react';

/**
 * The props a form binding owns — the value of a field and the events that
 * change it.
 *
 * A bound component (`FormInput`, `FormChoice`) omits every one of them, so
 * passing one is a compile error rather than a field that quietly stops
 * reporting: the call site winning `onChange` or `value` does not override the
 * binding, it severs it, and the field then renders, accepts typing, and
 * submits nothing.
 *
 * To react to a value change, use your form library's own lever —
 * react-hook-form's `watch`, Formik's `useField`, TanStack's `subscribe` —
 * which hands over the parsed value rather than a DOM event. To own these
 * outright, compose `Field` + the control and bind them yourself; the bound
 * components add no markup, so nothing else changes.
 *
 * It exists as ONE named type because the same list is needed in three places
 * and must not drift: what the components omit, what they drop at runtime for
 * callers TypeScript cannot reach, and what the dev warning names.
 *
 * `ref` is deliberately absent: it is the one binding-owned prop that can be
 * SHARED, so a call-site ref is merged with the binding's rather than refused.
 */
export interface BindingOwned {
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  value?: ComponentProps<'input'>['value'];
  defaultValue?: ComponentProps<'input'>['defaultValue'];
  checked?: boolean;
  defaultChecked?: boolean;
}
