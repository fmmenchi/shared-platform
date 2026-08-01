/** Values a path stops at — there is nothing to reach inside them. */
type Leaf =
  string | number | boolean | bigint | symbol | Date | File | null | undefined;

/**
 * Every field path of `T`, in the syntax Formik reads.
 *
 * Written here because **Formik ships no path type of its own** — the one gap
 * among the four. It belongs in this adapter and nowhere else: the syntax is a
 * property of how the library resolves a name at runtime, and Formik's `getIn`
 * is lodash-shaped, so `guests.0.name` addresses the first row. A type written
 * in the design system would be a guess about a library it does not know; here
 * it is a statement about the one library this file is for.
 *
 * What it deliberately does NOT do is cover the bracket form (`guests[0].name`).
 * Formik accepts both, so allowing both would double every array path in the
 * union for no gain, and one spelling is easier to write and to read.
 */
export type FormikPath<T> = T extends Leaf
  ? never
  : T extends ReadonlyArray<infer Item>
    ? `${number}` | `${number}.${FormikPath<Item>}`
    : {
        [K in keyof T & string]: T[K] extends Leaf
          ? K
          : K | `${K}.${FormikPath<T[K]>}`;
      }[keyof T & string];
