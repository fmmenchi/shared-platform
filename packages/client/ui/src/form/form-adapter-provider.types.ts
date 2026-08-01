import type { ReactNode } from 'react';
import type { UseFormErrors, UseFormField } from './form-adapter.types.js';

export interface FormAdapterProviderProps {
  /**
   * The field-binding HOOK — one per form library, written once in your app. It
   * is called inside each bound field, so each subscribes for itself.
   */
  field: UseFormField;
  /**
   * Every field in error, by name — what `FormErrorSummary` renders. Optional:
   * a form without a summary never needs it, and asking for it when it was not
   * supplied throws by name rather than rendering something empty.
   */
  errors?: UseFormErrors;
  children?: ReactNode;
}
