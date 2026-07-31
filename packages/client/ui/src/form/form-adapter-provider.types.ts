import type { ReactNode } from 'react';
import type { UseFormField } from './form-adapter.types.js';

export interface FormAdapterProviderProps {
  /**
   * The binding HOOK — one per form library, written once in your app. It is
   * called inside each bound field, so each subscribes for itself.
   */
  adapter: UseFormField;
  children?: ReactNode;
}
