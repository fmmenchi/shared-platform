import {
  PALETTE_FAMILIES,
  deriveDarkBases,
  type PaletteFamily,
} from '@fmmenchi/theme';
import { formatHex, parse } from 'culori';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * THE EIGHT COLOURS A BRAND HANDS OVER, and the first thing the wizard collects.
 *
 * Kept as sRGB HEX, because that is what `<input type="color">` gives and takes.
 * The conversion to oklch happens where the palette is generated, not here — a
 * store that quietly held a different colour space from its editor would be the
 * kind of mismatch nothing reports.
 *
 * The defaults are `@fmmenchi/tokens`' own bases, converted once. That is the
 * honest starting point: a person overriding one colour gets a theme, and the
 * seven they did not touch are the house's rather than something invented for the
 * form.
 */
export type Bases = Readonly<Record<PaletteFamily, string>>;

/**
 * The reference bases as hex. `vars.css` states them in oklch — these are the same
 * colours, converted at authoring time rather than at run time, because the app
 * would otherwise need a colour library to render its own initial state.
 *
 * Held to the shipped values by `bases.spec.ts`, which reads `vars.css`, resolves
 * each base and converts it: a retune that left these behind would otherwise be
 * invisible, and the form would open on last month's brand. It caught the first
 * version of this list, which was seven colours I had guessed.
 *
 * SEVEN, not eight — `PALETTE_FAMILIES` is the chromatic families, and the greys
 * are stated rather than derived (ADR-0032). A brand hands over seven colours; the
 * neutral ramp is the design system's.
 */
export const REFERENCE_BASES: Bases = {
  primary: '#3072c1',
  secondary: '#637996',
  accent: '#347c7b',
  negative: '#cd3c36',
  success: '#36844b',
  warning: '#a17834',
  info: '#347ab0',
};

/**
 * THE DARK SEVEN, DERIVED FROM THE LIGHT ONES.
 *
 * A dark theme restates its bases — at lightness 0.75 a colour needs different chroma
 * to read as the same colour it was at 0.55 — so a wizard that asks for seven has to
 * produce fourteen. `deriveDarkBases` is the rule, and it is a rule rather than a
 * table: it carries each base's SHARE of the chroma sRGB allows at its lightness,
 * because that is what "how saturated is this brand" means and an absolute chroma is
 * not (0.14 is 78% of the ceiling at L 0.55 and about 54% at 0.75).
 *
 * THE SHIPPED DARK PRESET IS WHAT THIS PRODUCES from `REFERENCE_BASES`, asserted by
 * `@fmmenchi/tokens`' `palette-dark.test.ts` — the preset's seven were hand-picked
 * until they were realigned to this rule, which is what made a dark theme buildable at
 * all. So there is no second list of dark hexes to keep in step with anything: the
 * default is computed, and `bases.spec.ts` checks it against the stylesheet.
 *
 * Converted to hex because that is what `<input type="color">` gives and takes, the
 * same reason the light ones are hex.
 */
const toHex = (css: string) => formatHex(parse(css)) ?? css;

export const REFERENCE_DARK_BASES: Bases = Object.fromEntries(
  Object.entries(deriveDarkBases(REFERENCE_BASES)).map(([family, value]) => [
    family,
    toHex(value),
  ]),
) as Bases;

/** The lightness the dark bases are restated at — `presets/dark.css`'s own. */
export const DARK_BASE_LIGHTNESS = 0.75;

interface BasesStore {
  readonly bases: Bases;
  /**
   * The dark seven. EDITABLE, not computed on demand: the derivation is a defensible
   * starting point rather than a result, and a brand with a real dark palette has
   * colours of its own. `deriveFromLight` is how a person gets back to the suggestion.
   */
  readonly darkBases: Bases;
  /**
   * The whole set at once, which is what a validated form hands over. A per-field
   * write is deliberately NOT here: the seven are one answer, and half of what can
   * be wrong with them is a fact about the SET — two families a person could not
   * tell apart, or a theme these seven cannot make readable. A store that accepted
   * one colour at a time would invite writing an unchecked value into it.
   */
  readonly setBases: (bases: Bases) => void;
  /** The dark set at once, for the same reason the light one is written at once. */
  readonly setDarkBases: (bases: Bases) => void;
  /**
   * Re-derive the dark seven from the light seven as they stand now, and go back to
   * FOLLOWING them.
   *
   * The reason this exists is unchanged — a person who typed dark colours must not
   * lose them because they nudged a light one — but "never automatic" was too strong
   * a reading of it, and the export is where that showed. Measured: change the light
   * primary to `#1f5fa8` and hand the pair of files over, and the dark one still
   * carried `oklch(0.75 0.1015 254.87)`, the derivation of the REFERENCE blue, not
   * `oklch(0.75 0.1107 254.58)`, the derivation of the brand. Half the handoff was
   * the design system's own colours, silently.
   *
   * So the dark seven FOLLOW the light seven until somebody edits one of them, and
   * stop the moment they do — which is the whole of what the old rule was protecting.
   * Untouched, there is no work to lose; touched, nothing overwrites it. This action
   * is now how a person goes back to following, and `darkFollowsLight` is how the
   * page says which of the two states it is in, because a value that moves on its own
   * has to be visibly explained.
   */
  readonly deriveFromLight: () => void;
  /**
   * Whether the dark seven are still the derivation of the light seven, moving with
   * them — false once anybody has typed one.
   */
  readonly darkFollowsLight: boolean;
  readonly reset: () => void;
}

const BasesContext = createContext<BasesStore | undefined>(undefined);

/** The dark seven these light seven suggest, as hex the colour inputs can hold. */
function derived(light: Bases): Bases {
  return Object.fromEntries(
    Object.entries(deriveDarkBases(light, DARK_BASE_LIGHTNESS)).map(
      ([family, value]) => [family, toHex(value)],
    ),
  ) as Bases;
}

export function BasesProvider({ children }: { children: ReactNode }) {
  const [bases, setBases] = useState<Bases>(REFERENCE_BASES);
  const [darkBases, setDarkBases] = useState<Bases>(REFERENCE_DARK_BASES);
  // FALSE ONLY ONCE SOMEBODY HAS TYPED A DARK COLOUR. Until then the dark seven are
  // the derivation and nothing else, so following the light seven cannot lose work —
  // and not following them shipped the reference brand's dark theme (see
  // `deriveFromLight`).
  const [darkFollowsLight, setDarkFollowsLight] = useState(true);

  const replace = useCallback(
    (next: Bases) => {
      setBases(next);
      if (darkFollowsLight) setDarkBases(derived(next));
    },
    [darkFollowsLight],
  );

  // A HAND EDIT, which is the one thing that stops the following. `deriveFromLight`
  // writes the same state through the setter directly, so re-deriving is not mistaken
  // for typing.
  const replaceDark = useCallback((next: Bases) => {
    setDarkBases(next);
    setDarkFollowsLight(false);
  }, []);

  const deriveFromLight = useCallback(() => {
    setDarkBases(derived(bases));
    setDarkFollowsLight(true);
  }, [bases]);

  const reset = useCallback(() => {
    setBases(REFERENCE_BASES);
    setDarkBases(REFERENCE_DARK_BASES);
    setDarkFollowsLight(true);
  }, []);

  const value = useMemo(
    () => ({
      bases,
      darkBases,
      setBases: replace,
      setDarkBases: replaceDark,
      deriveFromLight,
      darkFollowsLight,
      reset,
    }),
    [
      bases,
      darkBases,
      replace,
      replaceDark,
      deriveFromLight,
      darkFollowsLight,
      reset,
    ],
  );

  return (
    <BasesContext.Provider value={value}>{children}</BasesContext.Provider>
  );
}

/** THROWS outside the provider: "no bases" and "not wired" must not look alike. */
export function useBases(): BasesStore {
  const value = useContext(BasesContext);
  if (!value) {
    throw new Error('useBases must be used inside a BasesProvider.');
  }
  return value;
}

/** The families, in the order the form shows them — the contract's own order. */
export const FAMILIES: readonly PaletteFamily[] = PALETTE_FAMILIES;
