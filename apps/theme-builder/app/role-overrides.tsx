import { colorVar, type ColorRole, type Declarations } from '@fmmenchi/theme';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useDeclarations, type Scheme } from './declarations';

/**
 * RE-POINTING A ROLE — and the whole trick is that an override is not a new concept.
 *
 * A role's value in the stylesheet IS where it points:
 * `--fm-color-primary: var(--fm-palette-primary-700)`. So re-pointing it is
 * replacing that one declaration, and everything downstream keeps working
 * untouched — `generateTheme` reads the aliases out of the declarations it is
 * handed, `validateTheme` judges what comes out, `buildThemeFile` copies the role
 * layer verbatim. Not one of them learns that overrides exist.
 *
 * That is why this is a Map transform and not a parameter threaded through four
 * functions. The alternative was passing an override map into `generateTheme`, which
 * would have put the wizard's model inside the shared package — the mistake
 * `@fmmenchi/theme`'s own AGENTS.md records being made four times in one day.
 *
 * STORED BY ROLE, NOT BY FAMILY. A role may legitimately point outside its own
 * family — `primary-foreground` is `neutral-0`, and every foreground is — so the
 * choice a person makes is per role, and offering only one family's rungs would
 * make the common case impossible.
 *
 * AND ONE MAP PER SCHEME, which was one map. Step three showed light only, and that
 * made it the odd step out once steps one and two became a tab per theme. A single
 * map could not have been shared even if it wanted to be: the two themes point their
 * roles at DIFFERENT rungs — `-subtle` is the 1400 in dark and the 50 in light — so
 * "primary-subtle goes to the 200" means a different colour in each, and carrying a
 * choice across would be a guess dressed as a convenience.
 *
 * NO SUBMIT. A change applies immediately, because the answer to "what does rung 600
 * look like here" is the swatch next to it, and a form that made you submit to find
 * out would be asking you to guess first. The contract check that matters is not
 * per-keystroke either: the export step generates both themes and runs
 * `validateTheme` before it hands over a file.
 */
type Overrides = Readonly<Record<string, string>>;

interface RoleOverrides {
  /** This scheme's re-pointings. */
  readonly overrides: Overrides;
  /** Point a role at a rung. Passing `undefined` puts it back to the design system's. */
  readonly setOverride: (role: ColorRole, rung: string | undefined) => void;
  /** Clear this scheme's. */
  readonly reset: () => void;
  /** How many this scheme has. */
  readonly count: number;
}

interface RoleOverridesStore {
  readonly perScheme: Readonly<Record<Scheme, Overrides>>;
  readonly setOverride: (
    scheme: Scheme,
    role: ColorRole,
    rung: string | undefined,
  ) => void;
  readonly reset: (scheme: Scheme) => void;
}

const RoleOverridesContext = createContext<RoleOverridesStore | undefined>(
  undefined,
);

export function RoleOverridesProvider({ children }: { children: ReactNode }) {
  const [perScheme, setPerScheme] = useState<Record<Scheme, Overrides>>({
    light: {},
    dark: {},
  });

  const setOverride = useCallback(
    (scheme: Scheme, role: ColorRole, rung: string | undefined) => {
      setPerScheme((current) => {
        const next = { ...current[scheme] };
        // REMOVED rather than set to the declared value, so "back to default" leaves
        // no trace: the count a person sees, and the file they export, then say the
        // same thing as the form.
        if (rung === undefined) delete next[colorVar(role)];
        else next[colorVar(role)] = rung;
        return { ...current, [scheme]: next };
      });
    },
    [],
  );

  const reset = useCallback(
    (scheme: Scheme) =>
      setPerScheme((current) => ({ ...current, [scheme]: {} })),
    [],
  );

  const value = useMemo(
    () => ({ perScheme, setOverride, reset }),
    [perScheme, setOverride, reset],
  );

  return (
    <RoleOverridesContext.Provider value={value}>
      {children}
    </RoleOverridesContext.Provider>
  );
}

/**
 * One scheme's overrides, `light` unless asked otherwise.
 *
 * DEFAULTED RATHER THAN REQUIRED, the same way `useDeclarations` is: every caller
 * that existed before dark did means light, and making the argument mandatory would
 * be a rename disguised as a feature — the same edit at every site plus a chance to
 * pass the wrong one.
 */
export function useRoleOverrides(scheme: Scheme = 'light'): RoleOverrides {
  const store = useContext(RoleOverridesContext);
  if (!store) {
    throw new Error(
      'useRoleOverrides must be used inside a RoleOverridesProvider.',
    );
  }

  const overrides = store.perScheme[scheme];
  const { setOverride, reset } = store;

  return useMemo(
    () => ({
      overrides,
      setOverride: (role: ColorRole, rung: string | undefined) =>
        setOverride(scheme, role, rung),
      reset: () => reset(scheme),
      count: Object.keys(overrides).length,
    }),
    [overrides, scheme, setOverride, reset],
  );
}

/**
 * One scheme's declarations with this brand's re-pointings applied — which is what
 * every step downstream should read instead of the raw ones.
 *
 * A new Map rather than a mutation, because the loader's declarations are shared by
 * every step and a step that quietly rewrote them would change what the others see.
 */
export function useThemedDeclarations(scheme: Scheme = 'light'): Declarations {
  const declared = useDeclarations(scheme);
  const { overrides } = useRoleOverrides(scheme);

  return useMemo(() => {
    if (Object.keys(overrides).length === 0) return declared;
    return new Map([...declared, ...Object.entries(overrides)]);
  }, [declared, overrides]);
}

/**
 * Every rung one scheme's stylesheet declares, by family, in step order — the options
 * a role can be pointed at.
 *
 * READ from the declarations rather than composed from the families and a list of
 * steps, because the two do not line up: `neutral` declares 35 rungs where a
 * chromatic family declares 11 in light and 17 in dark, and a hardcoded list would
 * offer rungs that do not exist for some families and miss the ones that do.
 *
 * PER SCHEME for exactly that reason. Offering light's steps for a dark role would
 * let somebody point `-subtle` at a 1400 light does not have, or hide the 1400 that
 * dark's own `-subtle` already uses — a menu of rungs from the wrong scale.
 */
export function useRungOptions(
  scheme: Scheme = 'light',
): ReadonlyArray<readonly [family: string, steps: readonly string[]]> {
  const declared = useDeclarations(scheme);

  return useMemo(() => {
    const byFamily = new Map<string, string[]>();
    for (const name of declared.keys()) {
      const rung = /^--fm-palette-([a-z]+)-(\d+)$/.exec(name);
      if (!rung) continue; // `-base` is not a rung a role points at
      const [, family, step] = rung as unknown as [string, string, string];
      const steps = byFamily.get(family) ?? [];
      steps.push(step);
      byFamily.set(family, steps);
    }

    return [...byFamily.entries()]
      .map(
        ([family, steps]) =>
          [family, steps.sort((a, b) => Number(a) - Number(b))] as readonly [
            string,
            readonly string[],
          ],
      )
      .sort(([a], [b]) => a.localeCompare(b));
  }, [declared]);
}
