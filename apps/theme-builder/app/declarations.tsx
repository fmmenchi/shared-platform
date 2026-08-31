import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * THE DECLARATIONS AS THEY CROSS THE WIRE, and as the steps read them.
 *
 * `parseTheme` returns a Map, and a Map is not JSON — so the loader sends entries
 * and this side puts them back. Explicitly, rather than leaning on turbo-stream's
 * Map support: the serialisation is then a thing in the code that can be read and
 * tested, instead of a framework behaviour that would break quietly if the data
 * layer changed.
 *
 * IT IS ONE VALUE, and it used to be two. An earlier version sent an alias map and
 * a table of stated rungs, with a type of its own for each — the app deriving two
 * structures from the stylesheet and handing them to `generateTheme` separately.
 * That put the assembly in the consumer, which is where it went wrong: the greys
 * were omitted, and every set of bases failed. `generateTheme` takes the raw
 * declarations now, so the app carries no derived shape at all.
 */
export type SerializedDeclarations = ReadonlyArray<readonly [string, string]>;

const DeclarationsContext = createContext<ReadonlyMap<string, string> | null>(
  null,
);

/** Entries back into a Map. One function, because the schema's suite needs it too. */
export function hydrateDeclarations(
  serialized: SerializedDeclarations,
): ReadonlyMap<string, string> {
  return new Map(serialized);
}

/**
 * Provided once by the wizard layout, which is the route that loads them, so a step
 * never has to know which ancestor did the reading.
 */
export function DeclarationsProvider({
  declarations,
  children,
}: {
  declarations: SerializedDeclarations;
  children: ReactNode;
}) {
  const value = useMemo(
    () => hydrateDeclarations(declarations),
    [declarations],
  );

  return (
    <DeclarationsContext.Provider value={value}>
      {children}
    </DeclarationsContext.Provider>
  );
}

export function useDeclarations(): ReadonlyMap<string, string> {
  const declarations = useContext(DeclarationsContext);

  // THROWS rather than returning an empty Map. An empty one generates an empty
  // theme, and the validator then reports all 84 roles missing — which says nothing
  // about the actual mistake.
  if (declarations === null) {
    throw new Error(
      'useDeclarations must be used inside the wizard layout, which is the route that reads them.',
    );
  }

  return declarations;
}
