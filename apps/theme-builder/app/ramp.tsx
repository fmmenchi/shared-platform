import type { Ramp } from '@fmmenchi/theme';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * THE RAMP — how far each rung sits from white, and how much of the base's chroma it
 * keeps. Eleven rungs, and every number in `REFERENCE_RAMP` was chosen by measurement.
 *
 * IT IS THE SAME RAMP `vars.css` USES, and that is what makes this wizard an
 * invocation of the shipped code path rather than a lookalike. It began as the
 * shipped offsets resolved at one base's lightness — an anchor picked by hand, which
 * put five of the seven families somewhere else — so the wizard fed the reference
 * bases did NOT reproduce the shipped stylesheet, and the claim was a direction
 * rather than a fact. Both sides now state the same lightnesses and the same chroma
 * factors, and `ramp.spec.ts` asserts the result: every rung this produces from the
 * reference bases equals the rung `vars.css` resolves to.
 *
 * IT STAYS IN THE APP rather than moving to `@fmmenchi/theme`, which was tried and
 * reverted. Two reasons, both that package's own rules: these are numbers a designer
 * chose, and theme holds no values of any kind ("THE VALUES ARE NOT HERE"); and the
 * generator — the other caller that would justify the move — does not build palettes,
 * it takes a theme file with `--from` and injects declarations.
 *
 * ABSOLUTE LIGHTNESS, NOT AN OFFSET (ADR-0033). Measured across 648 bases, an
 * offset-anchored ramp's contrast distance MOVES with the base while an absolute one
 * does not, and a guarantee that shifts under you is not one. `vars.css` still writes
 * offsets because a rung there must stay derived from its base — overriding one
 * number is what makes a rebrand seven numbers rather than seventy-seven — but its
 * offsets and its chroma factors are both computed PER FAMILY so that every family
 * lands on the absolute lightnesses below.
 *
 * EVENLY SPACED BELOW THE 100. The previous curve ran 0.10 0.10 0.10 then 0.05 0.05
 * then 0.09 0.10 0.09, so rungs 400, 500 and 600 sat half a step apart and rendered
 * as the same colour three times — nine rungs where six were distinguishable.
 * Above the 100 the two pale rungs close in, because the gamut runs out toward white
 * and an even step would spend it on nothing.
 *
 * THE DARK END IS 0.26, AND IT IS AS LIGHT AS THE CONTRACT ALLOWS *UNIVERSALLY*.
 * Generated for 144 brands — 24 hues x 3 chroma levels x 2 lightnesses, every family
 * given the same base, which is harsher than any real brand — and put through the
 * real contract:
 *
 *     dark end 0.34   120 of 144 brands FAIL
 *     dark end 0.30    60 of 144 brands FAIL
 *     dark end 0.26     0 fail
 *
 * There is a cliff between 0.30 and 0.26, and the pair that gives way first is always
 * `input x input-invalid`, the tightest floor in the contract at 3:1. So the darkness
 * is not a preference: it is what buys ADR-0033's promise that a pair clearing its
 * floor for one brand clears it for every brand. Material's 900 is lightness 0.42 and
 * Tailwind's 0.38 because they hand-tune each palette and promise nothing about a
 * brand they have not seen.
 *
 * *UNIVERSALLY* is the word this file used to stop at, and it is why there is a
 * `RampShape` below. 0.26 is what 144 worst-case brands require; a WIZARD knows the
 * seven actual bases, so it can ask the real contract what THOSE allow. Measured, the
 * gap is not marginal:
 *
 *     dark end     the 144-brand grid     the shipped bases
 *      0.34        120 of 144 FAIL        passes
 *      0.30         60 of 144 FAIL        passes
 *      0.26          0 fail               passes
 *
 * So a real brand can have a dark end at Material's own lightness while the design
 * system, shipping to brands it has not seen, has to take 0.26. That gap IS the
 * control on step two — not a preference exposed as a slider, but information the
 * wizard has and the stylesheet cannot.
 *
 * THE CHROMA FACTORS ARE THE GAMUT CEILING, rounded down with a hundredth to spare.
 * Solved with `clampChroma` at each lightness over the tightest of the seven hues:
 * x0.285 at 0.90 (negative), x0.554 at 0.82, x0.869 at 0.74, unbounded through the
 * middle, x0.884 at 0.42 (warning), x0.716 at 0.34, x0.547 at 0.26.
 *
 * Here that is load-bearing rather than tidy, and it cost a wrong turn to learn: my
 * first attempt rounded 0.285 UP to 0.30, and `negative-100` came out
 * `oklch(90% 0.0547 27)` — outside sRGB. `generatePalette` clamps, so the wizard
 * would have survived it; `vars.css` uses CSS relative colour, where the clamp is the
 * BROWSER's and differs per engine, so the shipped colour would have depended on who
 * was rendering it while the validator measured something else.
 *
 * WHAT THIS IS NOT: the neutral ramp. The greys are stated rather than derived
 * (ADR-0032) — no single base spans 1.00 to 0.05 and still resolves the pale end — so
 * `PALETTE_FAMILIES` is the seven chromatic families and this ramp is for them.
 */
export const REFERENCE_RAMP: Ramp = [
  // THE PALE END TAKES WHATEVER ITS HUE ALLOWS — `chromaFactor: 1` here does not
  // mean "full chroma", it means "the maximum", because `generatePalette` clamps
  // into sRGB while holding lightness and at these lightnesses the clamp is what
  // decides. A SHARED factor cannot work up here: the ceiling at 0.975 runs from
  // x0.07 (negative) to x0.50 (accent), so one number for all seven would have to be
  // 0.07 and every family would come out grey — which is exactly why `vars.css` had
  // refused a step 50 ("a step that can only be grey is not a step"). Per family it
  // is a real tint: #f1f7ff, #dcfffe, #fff4f2, #e5ffe9, #fff5e7.
  { step: 25, lightness: 0.975, chromaFactor: 1 },
  { step: 50, lightness: 0.95, chromaFactor: 1 },
  { step: 100, lightness: 0.9, chromaFactor: 0.27 },
  { step: 200, lightness: 0.82, chromaFactor: 0.54 },
  { step: 300, lightness: 0.74, chromaFactor: 0.85 },
  { step: 400, lightness: 0.66, chromaFactor: 1 },
  { step: 500, lightness: 0.58, chromaFactor: 1 },
  { step: 600, lightness: 0.5, chromaFactor: 1 },
  { step: 700, lightness: 0.42, chromaFactor: 0.87 },
  { step: 800, lightness: 0.34, chromaFactor: 0.7 },
  { step: 900, lightness: 0.26, chromaFactor: 0.53 },
];

/**
 * The two ends a person may move, and deliberately not the eleven rungs.
 *
 * WHAT IS EXPOSED AND WHAT IS NOT is the whole design of this control, and the line
 * is not taste — it is which numbers carry the guarantee:
 *
 *   the DARK END      exposed, bounded. It decides how much contrast the ramp can
 *                     reach, so it is the one number a person would actually want to
 *                     change (0.26 is nearly black) and the one that can break the
 *                     contract. Both facts point the same way: offer it, and probe
 *                     every option against the real validator before offering it.
 *   the PALE END      exposed, free. Nothing points at the 25 or the 50 yet — the
 *                     `-subtle` roles all name the 100 — so moving it cannot move a
 *                     contrast pair. It is the shape of the scale, which is a product
 *                     decision: Radix ships twelve steps, Material ten, we ship
 *                     eleven, and a house with an existing design has to remap.
 *   the CHROMA        NOT exposed. Every factor is the sRGB ceiling at its lightness,
 *                     and in `vars.css` the clamp is the BROWSER's, differing per
 *                     engine — so a factor above the ceiling means the colour a
 *                     consumer SEES depends on who renders it while the validator
 *                     measured something else. A slider whose upper half produces
 *                     browser-dependent colour is not a slider.
 *   the RUNG COUNT    NOT exposed, at least not here. The alias map in `vars.css`
 *                     names steps by number, so dropping the 300 does not restyle the
 *                     scale, it leaves `--fm-color-*` pointing at a rung that no
 *                     longer exists — `generateTheme` throws, correctly. Renumbering
 *                     is a change to the design system, not to a brand's theme.
 */
export interface RampShape {
  /**
   * Where the darkest rung lands. The rungs from the 100 down keep their count and
   * re-space themselves evenly to reach it, so this is one number rather than nine.
   */
  readonly darkEnd: number;
  /** How many rungs sit above the 100 — the 50, then the 25. */
  readonly paleRungs: 0 | 1 | 2;
}

/** What the design system itself ships, and what the wizard opens on. */
export const REFERENCE_SHAPE: RampShape = { darkEnd: 0.26, paleRungs: 2 };

/**
 * The dark ends worth offering, lightest first.
 *
 * ONLY VALUES AT OR ABOVE 0.26, and that bound is a fact rather than a choice:
 * 0.26 already passes for every brand, so nothing darker buys contrast that anything
 * needs, and the ramp would only lose distinguishable rungs at the bottom. Going
 * LIGHTER is the interesting direction and the one a person asks for, which is also
 * the direction that can fail — hence the probe.
 *
 * The three numbers are the ones the 144-brand grid was measured at, so the failure
 * counts in this file's header describe exactly these options.
 */
export const DARK_END_CHOICES: readonly number[] = [0.34, 0.3, 0.26];

/** The pale ends, in the order the control shows them. */
export const PALE_END_CHOICES: readonly RampShape['paleRungs'][] = [0, 1, 2];

/** The lightnesses the pale rungs take, in the order they are added. */
const PALE_RUNGS: readonly { step: number; lightness: number }[] = [
  { step: 50, lightness: 0.95 },
  { step: 25, lightness: 0.975 },
];

/** The rungs from the 100 down, which never change in number. */
const MAIN_STEPS: readonly number[] = [
  100, 200, 300, 400, 500, 600, 700, 800, 900,
];

/** The 100's lightness — the fixed top of the evenly-spaced part. */
const MAIN_TOP = 0.9;

/**
 * The ramp a shape describes.
 *
 * THE CHROMA FACTORS COME FROM `REFERENCE_RAMP` BY STEP, not recomputed from the new
 * lightness, and that is safe in exactly one direction — which is the only direction
 * `DARK_END_CHOICES` offers. Each factor is the gamut ceiling at the reference
 * lightness; moving the dark end UP raises the ceiling at every rung below the 100,
 * so a factor that fitted at 0.26 fits at 0.30 with room to spare. Moving it down
 * would tighten the ceiling underneath a factor chosen against a looser one, and
 * `generatePalette`'s clamp would silently absorb the difference — a rung quietly
 * less saturated than the number says. The bound on the choices is what keeps this
 * honest, and `ramp.spec.ts` asserts every offered shape stays in gamut.
 *
 * ROUNDED TO FOUR PLACES, because these lightnesses are divided rather than written:
 * (0.90 - 0.30) / 8 is 0.075 exactly, but (0.90 - 0.34) / 8 is 0.07 and the seventh
 * rung of an unrounded run lands on 0.41999999999999993. The export writes the file a
 * person downloads, and it should not carry float noise.
 */
export function buildRamp(shape: RampShape): Ramp {
  const gap = (MAIN_TOP - shape.darkEnd) / (MAIN_STEPS.length - 1);
  const factorOf = (step: number) =>
    REFERENCE_RAMP.find((rung) => rung.step === step)?.chromaFactor ?? 1;

  return [
    // Reversed so the pale rungs read 25 then 50 — the ramp is ordered lightest
    // first, and `paleRungs: 1` has to mean the 50 rather than the 25, because a
    // scale that stops at 0.975 has a gap where its own next step should be.
    ...PALE_RUNGS.slice(0, shape.paleRungs)
      .map(({ step, lightness }) => ({ step, lightness, chromaFactor: 1 }))
      .reverse(),
    ...MAIN_STEPS.map((step, i) => ({
      step,
      lightness: Number((MAIN_TOP - gap * i).toFixed(4)),
      chromaFactor: factorOf(step),
    })),
  ];
}

interface RampStore {
  readonly shape: RampShape;
  /** The ramp that shape describes — memoised, since it is rebuilt on every render. */
  readonly ramp: Ramp;
  readonly setShape: (shape: RampShape) => void;
  readonly reset: () => void;
}

const RampContext = createContext<RampStore | undefined>(undefined);

export function RampProvider({ children }: { children: ReactNode }) {
  const [shape, setShape] = useState<RampShape>(REFERENCE_SHAPE);

  const replace = useCallback((next: RampShape) => setShape(next), []);
  const reset = useCallback(() => setShape(REFERENCE_SHAPE), []);
  const ramp = useMemo(() => buildRamp(shape), [shape]);

  const value = useMemo(
    () => ({ shape, ramp, setShape: replace, reset }),
    [shape, ramp, replace, reset],
  );

  return <RampContext.Provider value={value}>{children}</RampContext.Provider>;
}

/** THROWS outside the provider: "default ramp" and "not wired" must not look alike. */
export function useRamp(): RampStore {
  const value = useContext(RampContext);
  if (!value) {
    throw new Error('useRamp must be used inside a RampProvider.');
  }
  return value;
}
