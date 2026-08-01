/**
 * What `createFormikFields` gives back when the values type is missing —
 * without it every name would be accepted, silently. As a message it fails at
 * the destructuring, where the mistake is.
 */
export type MissingFormValues =
  'createFormikFields needs your form values type — createFormikFields<MyFormValues>()';
