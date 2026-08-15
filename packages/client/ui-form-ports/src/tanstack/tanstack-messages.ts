/**
 * TanStack keeps whatever the validator produced — and with a Standard Schema
 * validator that is an ISSUE OBJECT (`{ message, path }`), not a string. The
 * port carries messages, so unwrap it here rather than in every app.
 *
 * In its own file because it now has two callers, the per-field binding and the
 * option-field one, and this package moves a policy at two rather than letting
 * the second copy drift.
 */
export function toMessages(errors: unknown): readonly string[] {
  if (!Array.isArray(errors)) return [];
  return errors
    .map((error) =>
      typeof error === 'string'
        ? error
        : ((error as { message?: unknown })?.message ?? ''),
    )
    .filter(
      (message): message is string =>
        typeof message === 'string' && message !== '',
    );
}
