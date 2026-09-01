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
export type SerializedEntries = ReadonlyArray<readonly [string, string]>;

/** Which stylesheet a step is reading. */
export type Scheme = 'light' | 'dark';

/**
 * BOTH SCHEMES CROSS THE WIRE, because a dark theme is not the light one inverted.
 * `presets/dark.css` restates its bases and every rung, and — the part that decides
 * this shape — it restates the ALIAS MAP too: in dark `-subtle` points at a dark rung
 * where in light it points at a pale one. So "which rung does this role use" has two
 * answers, and a single map could only ever have carried one of them.
 */
export type SerializedDeclarations = Readonly<
  Record<Scheme, SerializedEntries>
>;

type Hydrated = Readonly<Record<Scheme, ReadonlyMap<string, string>>>;

const DeclarationsContext = createContext<Hydrated | null>(null);

/** Entries back into a Map. One function, because the schema's suite needs it too. */
export function hydrateDeclarations(
  serialized: SerializedDeclarations,
): Hydrated {
  return {
    light: new Map(serialized.light),
    dark: new Map(serialized.dark),
  };
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

/**
 * The declarations of one scheme, `light` unless asked otherwise.
 *
 * DEFAULTED RATHER THAN REQUIRED, and that is deliberate: every step that existed
 * before dark did reads the light contract, and making the argument mandatory would
 * have been a rename disguised as a feature — the same call at every site, plus a
 * chance to pass the wrong one.
 */
export function useDeclarations(
  scheme: Scheme = 'light',
): ReadonlyMap<string, string> {
  const declarations = useContext(DeclarationsContext);

  // THROWS rather than returning an empty Map. An empty one generates an empty
  // theme, and the validator then reports all 84 roles missing — which says nothing
  // about the actual mistake.
  if (declarations === null) {
    throw new Error(
      'useDeclarations must be used inside the wizard layout, which is the route that reads them.',
    );
  }

  return declarations[scheme];
}
