import type { Ramp } from '@fmmenchi/theme';

import type { Scheme } from './declarations';
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
 * THE PALE RUNGS HAVE A CONSUMER, which is what they are shaped for. The eight
 * chromatic `-subtle` roles point at the 50 — `neutral-subtle` had pointed at
 * `neutral-50` all along, so the chromatic families were the odd ones out, sitting a
 * whole 0.05 darker for no reason but a missing rung. That is also why the 50's chroma
 * is a shared factor and not a per-hue ceiling; see the comment on it below.
 *
 * AND 0.95 IS WHERE A SUBTLE FILL BELONGS, which is the argument that settles the
 * LIGHTNESS and does not rest on our own greys having got there first. Read off Radix's published
 * light blue: steps 3–5 are its component backgrounds at lightness 0.96, 0.94 and
 * 0.91, and step 6 — the first BORDER — is 0.86. Our old 100 sat at 0.90, between
 * their last fill and their first border; the 50 at 0.95 sits squarely inside the
 * range they reserve for filling a component.
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
  // THE PALE END STATES AN ABSOLUTE CHROMA, and it is the only part of the ramp that
  // does. It took three attempts to get here and each was driven by a measurement, so
  // the reasoning is worth keeping whole:
  //
  //   1. PER-FAMILY CEILINGS (`chromaFactor: 1`). Maximum tint, and it destroys
  //      comparability: sRGB does not hand out pale chroma evenly, so at L 0.95
  //      green's ceiling is 0.083 and blue's is 0.024. Across the four families an
  //      Alert paints side by side the spread went from 1.85x at the 100 to 3.35x at
  //      the 50 — rendered, green and orange shouted while blue and red whispered.
  //   2. A SHARED FRACTION (x0.135). Spread back to 1.84x, matching the 100's — but a
  //      fraction of a nearly-grey base is a grey, and `secondary-50` landed on
  //      EXACTLY `neutral-50`'s chroma while `accent-50` reached only 1.4x it. Two
  //      roles rendering alike is the cost, and it is not one worth paying for a rung
  //      the `-subtle` roles point at.
  //   3. AN ABSOLUTE TARGET. Every family takes the same chroma, capped by the gamut
  //      AND by its own base. Spread 1.00x, and 3.0x the stated grey at worst.
  //
  // The numbers are the tightest hue's ceiling with a tenth to spare, floored: 0.0241
  // at L 0.95 (secondary) gives 0.021, and 0.0119 at L 0.975 gives 0.010.
  //
  // WHY A PROPORTION IS RIGHT EVERYWHERE ELSE AND WRONG HERE. Below the 100 there is
  // room for a vivid brand to have a vivid ramp, and carrying the brand's intensity is
  // the point. Near white there is no room: the ceiling is a tenth of what it is in the
  // middle, so a proportion of it does not carry intensity, it carries whether the base
  // happened to be muted.
  { step: 25, lightness: 0.975, chroma: 0.01 },
  { step: 50, lightness: 0.95, chroma: 0.021 },
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
 * THE DARK RAMP — seventeen rungs, and not the light one mirrored.
 *
 * `presets/dark.css`'s own structure, stated here so the wizard can produce the dark
 * theme with the same `generatePalette` call it uses for light. Three things differ
 * from `REFERENCE_RAMP` and each is a fact about where the bases sit, not a taste:
 *
 *   THE STEP IS 0.05, not 0.08. Dark's bases are at lightness 0.75 and the scale has
 *   to cover ground in both directions from there, so it takes thirteen strides below
 *   the 100 where light takes nine, and each is smaller.
 *
 *   THE BASE IS THE 500, not a rung near the middle by accident. Above it the factors
 *   climb toward the gamut ceiling as the lightness rises; below it they fall on a
 *   straight line, 1.000 then -1/15 a rung, which is what made the 1400 and the 1500
 *   arithmetic rather than a decision.
 *
 *   THE PALE END IS A TEXT COLOUR HERE. In a dark theme the rungs at the top are what
 *   sits ON a fill, so the 25 and the 50 are not washes — which is also why their
 *   absolute chroma targets are lower than light's: at L 0.97 and 0.985 the gamut
 *   allows about half what it does at 0.95 and 0.975.
 *
 * IT IS NOT OFFERED AS A SHAPE. `RampShape` moves the two ends of the LIGHT ramp,
 * probed against the contract; the dark ramp is stated whole. Offering both would be
 * four controls and two probe matrices for a scale whose ends have no role pointing at
 * them in dark — the 25 and the 1500 are both headroom there.
 */
export const DARK_REFERENCE_RAMP: Ramp = [
  { step: 25, lightness: 0.985, chroma: 0.006 },
  { step: 50, lightness: 0.97, chroma: 0.012 },
  { step: 100, lightness: 0.95, chromaFactor: 0.165 },
  { step: 200, lightness: 0.9, chromaFactor: 0.345 },
  { step: 300, lightness: 0.85, chromaFactor: 0.543 },
  { step: 400, lightness: 0.8, chromaFactor: 0.76 },
  { step: 500, lightness: 0.75, chromaFactor: 1 },
  { step: 600, lightness: 0.7, chromaFactor: 0.933 },
  { step: 700, lightness: 0.65, chromaFactor: 0.866 },
  { step: 800, lightness: 0.6, chromaFactor: 0.8 },
  { step: 900, lightness: 0.55, chromaFactor: 0.733 },
  { step: 1000, lightness: 0.5, chromaFactor: 0.667 },
  { step: 1100, lightness: 0.45, chromaFactor: 0.6 },
  { step: 1200, lightness: 0.4, chromaFactor: 0.533 },
  { step: 1300, lightness: 0.35, chromaFactor: 0.467 },
  { step: 1400, lightness: 0.3, chromaFactor: 0.4 },
  { step: 1500, lightness: 0.25, chromaFactor: 0.333 },
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
 *   the PALE END      NOT exposed, and it was for a day. Nine roles point at the 50,
 *                     so "no pale end" is impossible for every brand rather than for
 *                     some — and once that option goes, the only freedom left is
 *                     whether to add the 25, which no role reads. See the note where
 *                     `PALE_END_CHOICES` used to be.
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
}

/** What the design system itself ships, and what the wizard opens on. */
export const REFERENCE_SHAPE: RampShape = { darkEnd: 0.26 };

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

/**
 * The dark theme's, and it needed its own list because its scale is its own: it
 * bottoms out at 0.25 rather than 0.26 and has fifteen rungs below the 100 rather
 * than nine.
 *
 * THE DARK RAMP GETS A CONTROL AT ALL because an earlier version of this file was
 * wrong about it. It said dark's ends "have no role pointing at them, so a control
 * over them would move nothing" — true of the 25 and the 1500 themselves, and beside
 * the point: moving the end RE-SPACES every rung between it and the 100, and
 * `-subtle` in dark points at the 1400. So it moves plenty.
 */
export const DARK_SCHEME_END_CHOICES: readonly number[] = [0.35, 0.3, 0.25];

/*
 * THE PALE END WAS A CONTROL AND IS NOT ANY MORE, and it was removed for a reason
 * that only became true when the 50 got a consumer.
 *
 * It offered three options — none, the 50, the 50 and the 25 — and NINE roles now
 * point at the 50 (`-subtle`, in every family plus the grey). So "none" cannot be
 * chosen by anybody: it is not a brand-dependent refusal, it is impossible by
 * construction. The probe said so correctly and the page then explained it with an
 * eight-role error dump under an option a person could see and never use. An option
 * that is structurally unavailable is not a choice with a caveat, it is a trap with a
 * footnote.
 *
 * That left "with or without the 25" as the whole freedom, and the 25 has no role
 * pointing at it — a control whose only meaningful setting adds a rung nothing reads.
 * Both pale rungs are unconditional now.
 */

/**
 * The pale rungs, in the order they are ADDED — the 50 first, because a scale that
 * stopped at 0.975 would have a gap where its own next step belongs.
 *
 * Read out of `REFERENCE_RAMP` rather than restated, so the pale end cannot end up
 * with one chroma factor here and another there. It carried a hardcoded
 * `chromaFactor: 1` until the pale end stopped being ceiling-based, at which point
 * this was the second place holding that policy.
 */
const PALE_RUNGS: readonly {
  step: number;
  lightness: number;
  chromaFactor: number;
}[] = [50, 25].map(
  (step) =>
    REFERENCE_RAMP.find((rung) => rung.step === step) as {
      step: number;
      lightness: number;
      chromaFactor: number;
    },
);

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
    ...PALE_RUNGS.slice().reverse(),
    ...MAIN_STEPS.map((step, i) => ({
      step,
      lightness: Number((MAIN_TOP - gap * i).toFixed(4)),
      chromaFactor: factorOf(step),
    })),
  ];
}

/** Dark's rungs from the 100 down — fifteen of them, where light has nine. */
const DARK_MAIN_STEPS: readonly number[] = [
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400,
  1500,
];

/** Dark's 100, the fixed top of its evenly-spaced part. */
const DARK_MAIN_TOP = 0.95;

/**
 * The dark ramp a shape describes — the same idea as `buildRamp` and NOT the same
 * function, because almost nothing about the two scales coincides.
 *
 * Dark's 100 sits at 0.95 where light's is at 0.90, it takes fifteen rungs below that
 * where light takes nine, its base is ON the scale at the 500, and its two pale rungs
 * are text colours at 0.985 and 0.97 rather than washes at 0.975 and 0.95. A single
 * parameterised builder would take a scheme and branch on it in six places, which is
 * two functions wearing one name.
 *
 * The chroma factors are carried by STEP from `DARK_REFERENCE_RAMP`, safe for the
 * same one-directional reason light's are: every offered end is at or above the
 * shipped one, and moving up raises the gamut ceiling underneath every factor.
 */
export function buildDarkRamp(shape: RampShape): Ramp {
  const gap = (DARK_MAIN_TOP - shape.darkEnd) / (DARK_MAIN_STEPS.length - 1);
  const rungOf = (step: number) =>
    DARK_REFERENCE_RAMP.find((rung) => rung.step === step);

  return [
    ...DARK_REFERENCE_RAMP.filter((rung) => rung.step < 100),
    ...DARK_MAIN_STEPS.map((step, i) => {
      const reference = rungOf(step);
      const lightness = Number((DARK_MAIN_TOP - gap * i).toFixed(4));
      return reference && reference.chroma !== undefined
        ? { step, lightness, chroma: reference.chroma }
        : { step, lightness, chromaFactor: reference?.chromaFactor ?? 1 };
    }),
  ];
}

interface RampStore {
  /** One shape per scheme: the two scales are edited independently. */
  readonly shapes: Readonly<Record<Scheme, RampShape>>;
  /** The ramps those shapes describe — memoised, since they rebuild on every render. */
  readonly ramps: Readonly<Record<Scheme, Ramp>>;
  readonly setShape: (scheme: Scheme, shape: RampShape) => void;
  readonly reset: () => void;
}

const RampContext = createContext<RampStore | undefined>(undefined);

/** What the dark preset ships, and what its control opens on. */
export const DARK_REFERENCE_SHAPE: RampShape = { darkEnd: 0.25 };

export function RampProvider({ children }: { children: ReactNode }) {
  const [shapes, setShapes] = useState<Record<Scheme, RampShape>>({
    light: REFERENCE_SHAPE,
    dark: DARK_REFERENCE_SHAPE,
  });

  const replace = useCallback(
    (scheme: Scheme, next: RampShape) =>
      setShapes((current) => ({ ...current, [scheme]: next })),
    [],
  );
  const reset = useCallback(
    () => setShapes({ light: REFERENCE_SHAPE, dark: DARK_REFERENCE_SHAPE }),
    [],
  );

  const ramps = useMemo(
    () => ({
      light: buildRamp(shapes.light),
      dark: buildDarkRamp(shapes.dark),
    }),
    [shapes],
  );

  const value = useMemo(
    () => ({ shapes, ramps, setShape: replace, reset }),
    [shapes, ramps, replace, reset],
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
