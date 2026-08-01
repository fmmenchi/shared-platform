/**
 * What `createTanstackFields` gives back when the values type is missing —
 * without it `DeepKeys` widens to `string` and the typing would switch itself
 * off in silence. As a message it fails at the destructuring, where the mistake
 * is.
 */
export type MissingFormValues =
  'createTanstackFields needs your form values type — createTanstackFields<MyFormValues>()';
