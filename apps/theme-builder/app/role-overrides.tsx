import { colorVar, type ColorRole, type Declarations } from '@fmmenchi/theme';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useDeclarations } from './declarations';

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
 * NO SUBMIT. A change applies immediately, because the answer to "what does rung 600
 * look like here" is the swatch next to it, and a form that made you submit to find
 * out would be asking you to guess first. The contract check that matters is not
 * per-keystroke either: the export step generates the whole theme and runs
 * `validateTheme` before it hands over a file.
 */
type Overrides = Readonly<Record<string, string>>;

interface RoleOverrides {
  readonly overrides: Overrides;
  /** Point a role at a rung. Passing `undefined` puts it back to the design system's. */
  readonly setOverride: (role: ColorRole, rung: string | undefined) => void;
  readonly reset: () => void;
  readonly count: number;
}

const RoleOverridesContext = createContext<RoleOverrides | undefined>(
  undefined,
);

export function RoleOverridesProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Overrides>({});

  const setOverride = useCallback(
    (role: ColorRole, rung: string | undefined) => {
      setOverrides((current) => {
        const next = { ...current };
        // REMOVED rather than set to the declared value, so "back to default" leaves
        // no trace: the count a person sees, and the file they export, then say the
        // same thing as the form.
        if (rung === undefined) delete next[colorVar(role)];
        else next[colorVar(role)] = rung;
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => setOverrides({}), []);

  const value = useMemo(
    () => ({
      overrides,
      setOverride,
      reset,
      count: Object.keys(overrides).length,
    }),
    [overrides, setOverride, reset],
  );

  return (
    <RoleOverridesContext.Provider value={value}>
      {children}
    </RoleOverridesContext.Provider>
  );
}

export function useRoleOverrides(): RoleOverrides {
  const value = useContext(RoleOverridesContext);
  if (!value) {
    throw new Error(
      'useRoleOverrides must be used inside a RoleOverridesProvider.',
    );
  }
  return value;
}

/**
 * The design system's declarations with this brand's re-pointings applied — which is
 * what every step downstream should read instead of the raw ones.
 *
 * A new Map rather than a mutation, because the loader's declarations are shared by
 * every step and a step that quietly rewrote them would change what the others see.
 */
export function useThemedDeclarations(): Declarations {
  const declared = useDeclarations();
  const { overrides } = useRoleOverrides();

  return useMemo(() => {
    if (Object.keys(overrides).length === 0) return declared;
    return new Map([...declared, ...Object.entries(overrides)]);
  }, [declared, overrides]);
}

/**
 * Every rung the stylesheet declares, by family, in step order — the options a role
 * can be pointed at.
 *
 * READ from the declarations rather than composed from the families and a list of
 * steps, because the two do not line up: `neutral` declares 36 rungs where a
 * chromatic family declares 9, and a hardcoded list of steps would offer rungs that
 * do not exist for some families and miss the ones that do.
 */
export function useRungOptions(): ReadonlyArray<
  readonly [family: string, steps: readonly string[]]
> {
  const declared = useDeclarations();

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
