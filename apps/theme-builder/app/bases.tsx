import { PALETTE_FAMILIES, type PaletteFamily } from '@fmmenchi/theme';
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

interface BasesStore {
  readonly bases: Bases;
  /**
   * The whole set at once, which is what a validated form hands over. A per-field
   * write is deliberately NOT here: the seven are one answer, and half of what can
   * be wrong with them is a fact about the SET — two families a person could not
   * tell apart, or a theme these seven cannot make readable. A store that accepted
   * one colour at a time would invite writing an unchecked value into it.
   */
  readonly setBases: (bases: Bases) => void;
  readonly reset: () => void;
}

const BasesContext = createContext<BasesStore | undefined>(undefined);

export function BasesProvider({ children }: { children: ReactNode }) {
  const [bases, setBases] = useState<Bases>(REFERENCE_BASES);

  const replace = useCallback((next: Bases) => setBases(next), []);
  const reset = useCallback(() => setBases(REFERENCE_BASES), []);

  const value = useMemo(
    () => ({ bases, setBases: replace, reset }),
    [bases, replace, reset],
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
