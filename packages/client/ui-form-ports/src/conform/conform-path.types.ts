/** Values a path stops at — there is nothing to reach inside them. */
type Leaf =
  string | number | boolean | bigint | symbol | Date | File | null | undefined;

/**
 * Every field path of `T`, in the syntax Conform reads.
 *
 * `FormikPath`'s twin, and separate for the same reason that one is local to
 * its adapter: the syntax is a property of how the library resolves a name at
 * runtime. Conform addresses an array row with brackets — `tasks[0].content` —
 * where Formik reads the lodash form `tasks.0.content`. One type covering both
 * would accept each library's paths in the other's adapter, which is exactly
 * the typo class this exists to stop.
 *
 * The bracket segment attaches to its parent BARE (`tasks[0]`), every other
 * segment with a dot — decided by looking at the child, and written INLINE in
 * the template literal rather than through a `Join<K, Rest>` helper. Not
 * style: a recursive reference inside a template literal is deferred, while
 * the same reference passed as a type argument is instantiated eagerly, and
 * the first version of this file hit TS2589 ("excessively deep") on every
 * caller for exactly that.
 */
export type ConformPath<T> = T extends Leaf
  ? never
  : T extends ReadonlyArray<infer Item>
    ? Item extends Leaf
      ? `[${number}]`
      : Item extends ReadonlyArray<unknown>
        ? `[${number}]` | `[${number}]${ConformPath<Item>}`
        : `[${number}]` | `[${number}].${ConformPath<Item>}`
    : {
        [K in keyof T & string]: T[K] extends Leaf
          ? K
          : T[K] extends ReadonlyArray<unknown>
            ? K | `${K}${ConformPath<T[K]>}`
            : K | `${K}.${ConformPath<T[K]>}`;
      }[keyof T & string];
