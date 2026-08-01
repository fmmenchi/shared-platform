import type { FieldError } from 'react-hook-form';
import type { FieldMessages } from '@fmmenchi/ui';

/**
 * One react-hook-form error, as the port's list of messages.
 *
 * Two shapes come out of the library and both are handled here rather than at
 * either call site: `message` by default, and `types` — one entry per rule that
 * failed — under `criteriaMode: 'all'`, where a single rule may itself carry
 * several messages. Reading only `message` under that mode is a quiet loss: the
 * field is invalid for three reasons and shows one.
 *
 * The port takes a list, so this is where the library's shapes stop. The field
 * binding and the summary share it, which is also what keeps a field and the
 * summary entry for that same field from disagreeing.
 */
export function toFieldMessages(error: FieldError | undefined): FieldMessages {
  if (error == null) return [];
  if (error.types != null) {
    return Object.values(error.types).flat().filter(isMessage);
  }
  return [error.message].filter(isMessage);
}

function isMessage(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}
