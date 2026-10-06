/**
 * ONE definition of "given", for the links and the sheet alike: a field that
 * is absent, empty or only whitespace was not given. A form or a CMS writes
 * an optional field as `''` far more often than it leaves it out.
 */
export const given = (value: string | undefined): string | undefined =>
  value?.trim() || undefined;
