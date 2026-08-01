import type { ReactNode } from 'react';
import type { UseFormField, UseFormStatus } from './form-adapter.types.js';

export interface FormAdapterProviderProps {
  /**
   * The field-binding HOOK — one per form library, written once in your app. It
   * is called inside each bound field, so each subscribes for itself.
   */
  field: UseFormField;
  /**
   * The form-state hook, for `FormSubmit` and `FormErrorSummary`. Optional: a
   * form that uses neither never needs to supply it, and asking for it when it
   * was not supplied throws by name rather than rendering something empty.
   */
  status?: UseFormStatus;
  children?: ReactNode;
}
