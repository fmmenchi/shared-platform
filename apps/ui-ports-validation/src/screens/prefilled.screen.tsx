import { useEffect, useState } from 'react';
import { SignupWithRhf } from './signup.screen.js';
import type { SignupValues } from './signup-fields.js';

/**
 * The record arrives 900ms after the fields are already on screen — the case
 * where `defaultValue` silently does nothing and `values` is the answer.
 */
export function PrefilledScreen() {
  const [prefill, setPrefill] = useState<SignupValues | undefined>();
  useEffect(() => {
    const id = setTimeout(
      () =>
        setPrefill({
          email: 'ada@example.com',
          password: '',
          confirm: '',
          plan: 'pro',
          tos: true,
        }),
      900,
    );
    return () => clearTimeout(id);
  }, []);

  return (
    <>
      <p className="hint">{prefill ? 'Loaded.' : 'Loading the record…'}</p>
      <SignupWithRhf prefill={prefill} />
    </>
  );
}
