import { generatePalette } from '@fmmenchi/theme';
import { Button } from '@fmmenchi/ui/button';
import { ColorPicker } from '@fmmenchi/ui/color-picker';
import { Fieldset } from '@fmmenchi/ui/fieldset';
import { FieldsetContent } from '@fmmenchi/ui/fieldset-content';
import { FieldsetLegend } from '@fmmenchi/ui/fieldset-legend';
import { Heading } from '@fmmenchi/ui/heading';
import { SegmentedControl } from '@fmmenchi/ui/segmented-control';
import { SegmentedControlItem } from '@fmmenchi/ui/segmented-control-item';
import { Link } from 'react-router';
import { useMemo, useState, type ReactNode } from 'react';

import { FAMILIES, useBases } from '../../bases';
import type { Scheme } from '../../declarations';
import { probeShape, type ShapeVerdict } from '../../ramp-probe';
import {
  DARK_END_CHOICES,
  DARK_REFERENCE_RAMP,
  PALE_END_CHOICES,
  REFERENCE_SHAPE,
  useRamp,
  type RampShape,
} from '../../ramp';
import { useThemedDeclarations } from '../../role-overrides';
import { stepPath } from '../../steps';

/**
 * What each pale-end option is called. Numbers would be honest and useless: "2" does
 * not say that the scale gains a 25 and a 50, and the steps are what a person reads
 * off the table underneath.
 */
const PALE_LABELS: Readonly<Record<number, string>> = {
  0: 'None',
  1: '+ 50',
  2: '+ 50 and 25',
};

/** Small print — a description, or a refusal. */
const note = {
  margin: 0,
  maxWidth: 'var(--fm-size-prose)',
  fontSize: 'var(--fm-text-sm)',
  lineHeight: 'var(--fm-leading-sm)',
  color: 'var(--fm-color-muted-foreground)',
} as const;

/**
 * ONE END OF THE RAMP, as a labelled group of probed options.
 *
 * EXTRACTED BECAUSE THE TWO ENDS WERE A NEAR-COPY — the same fieldset, the same
 * control, the same description-plus-refusals block, differing only in a legend, a
 * list and a formatter. Two copies of a control whose job is to show WHY an option is
 * unavailable is two places for that wiring to fall out of step, and the wiring is the
 * whole point of the control.
 *
 * ITS OWN `<fieldset>` WITH A VISIBLE LEGEND, and not `SegmentedControl`'s `label`
 * prop, which was the first version and was wrong. `label` is an `aria-label`: the
 * group had a name in the accessibility tree and NONE on screen, so a sighted person
 * saw two anonymous rows of buttons and a paragraph underneath each, and had to infer
 * which paragraph belonged to which row. A control named for a screen reader and
 * unnamed for everyone else is not accessible, it is half-built. The legend names it
 * once, for both — which is what that prop's own documentation says to do when
 * something around it can carry the name.
 */
function RampEnd({
  legend,
  name,
  value,
  onChange,
  options,
  labelOf,
  idOf,
  verdicts,
  children,
}: {
  readonly legend: string;
  readonly name: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly (string | number)[];
  readonly labelOf: (option: string | number) => string;
  readonly idOf: (option: string | number) => string;
  readonly verdicts: readonly ShapeVerdict[];
  /** The description — prose, so the caller writes it rather than passing strings. */
  readonly children: ReactNode;
}) {
  return (
    <Fieldset>
      <FieldsetLegend>{legend}</FieldsetLegend>
      <FieldsetContent>
        {/* `justify-items: start` because the track is `inline-flex` and a grid item
            STRETCHES by default — without it the three segments spread across the
            whole column and read as a toolbar rather than as a choice. */}
        <div
          style={{
            display: 'grid',
            justifyItems: 'start',
            gap: 'var(--fm-space-stack-s)',
          }}
        >
          <SegmentedControl name={name} value={value} onValueChange={onChange}>
            {options.map((option, i) => (
              <SegmentedControlItem
                key={option}
                value={String(option)}
                disabled={!verdicts[i]?.allowed}
                // THE REASON IS ASSOCIATED WITH THE INPUT rather than merely
                // printed near it: a disabled segment says nothing on its own, and
                // "why is this greyed out" is the question the control has to answer.
                aria-describedby={
                  verdicts[i]?.allowed ? undefined : idOf(option)
                }
              >
                {labelOf(option)}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>

          <p style={note}>{children}</p>

          {options
            .map((option, i) => [option, verdicts[i]] as const)
            .filter(([, verdict]) => verdict && !verdict.allowed)
            .map(([option, verdict]) => (
              <p key={option} id={idOf(option)} style={note}>
                <strong>{labelOf(option)}</strong> is not available for your
                colours: {verdict?.reason}
              </p>
            ))}
        </div>
      </FieldsetContent>
    </Fieldset>
  );
}

/**
 * STEP TWO — the ramps those seven colours produce, and the two ends a person may
 * move.
 *
 * `generatePalette` from `@fmmenchi/theme`, and this page is its first caller. The
 * function was written a day before anything used it, and reverted alongside a
 * placement table that had no caller at all — the difference between the two is
 * exactly this file.
 *
 * A base contributes its HUE and its CHROMA and not its lightness: every rung states
 * its own, absolutely (ADR-0033). So a lighter brand colour does not slide the whole
 * ramp upward — it changes the tint of rungs that stay where they are, which is what
 * makes a contrast guarantee hold across brands rather than moving with each one.
 *
 * THE ENDS ARE OFFERED, THE MIDDLE IS NOT, and the line is drawn in `ramp.tsx` where
 * the reasoning for each number lives. What matters here is how they are offered:
 * every option is PROBED against the real validator for these bases, and an option
 * that would produce a theme the contract refuses is disabled with the reason. So the
 * control cannot hand a person a theme that fails on step four, and it does not have
 * to guess — it asks the same function CI runs.
 *
 * WHY THERE IS ANYTHING TO OFFER AT ALL. The design system's dark end is 0.26 because
 * it ships to brands it has not seen, and 0.26 is what the harshest of 144 synthetic
 * brands requires. This wizard knows the seven actual bases, so it can find out what
 * THOSE allow — and measured, all three offered ends pass for the shipped bases while
 * 0.34 fails 120 of the 144. Same contract, better information; the gap between those
 * two answers is the whole reason a person wants a control here rather than a number
 * in a file.
 *
 * The swatches are painted with inline `background`, which is the one place in this
 * app that is right: these are GENERATED colours, not roles, and a token cannot name
 * a value that did not exist when the stylesheet was written.
 */
export default function Palette() {
  const { bases, darkBases, setDarkBases, deriveFromLight } = useBases();
  const { shape, ramp, setShape } = useRamp();

  /**
   * WHICH THEME THIS STEP IS SHOWING, and it lives here rather than in a provider
   * because nothing else needs it: steps three and four each read the scheme they
   * are about. A provider would be a shared piece of state with one reader.
   */
  const [scheme, setScheme] = useState<Scheme>('light');
  const dark = scheme === 'dark';
  // THE RE-POINTED ones: an override is a changed declaration, so a person who
  // walked back from step three must be probed against what they actually have.
  const declared = useThemedDeclarations();

  // Recomputed only when a base or the shape moves. `generatePalette` clamps each
  // rung into sRGB with a bisection, so it is not free — and it runs seventy-seven
  // times per call.
  const shown = dark ? DARK_REFERENCE_RAMP : ramp;
  const shownBases = dark ? darkBases : bases;
  const palette = useMemo(
    () => generatePalette(shownBases, shown),
    [shownBases, shown],
  );
  const steps = useMemo(() => shown.map((rung) => rung.step), [shown]);

  // ONE PROBE PER OPTION, and each option is probed against the shape it would
  // produce FROM THE CURRENT OTHER END — which is why this depends on `shape` and has
  // to. "Is 0.34 allowed" is not a question with a single answer: it depends on the
  // pale end sitting beside it, and the honest question a control answers is "if I
  // pick this, from here, does it hold?".
  //
  // That makes moving either control re-probe both, which is a real cost — six
  // themes, eighty-four roles each, every palette bisected into sRGB. Acceptable
  // because it happens on a click and not on a keystroke; the colour pickers on step
  // one are the ones that fire continuously, and they do not reach this.
  const verdicts = useMemo(
    () => ({
      dark: DARK_END_CHOICES.map((darkEnd) =>
        probeShape(declared, bases, { ...shape, darkEnd }),
      ),
      pale: PALE_END_CHOICES.map((paleRungs) =>
        probeShape(declared, bases, { ...shape, paleRungs }),
      ),
    }),
    [declared, bases, shape],
  );

  return (
    <section style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <Heading level={2}>Palette</Heading>

      <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
        {steps.length} rungs per family, derived from your colours. Each rung
        takes its lightness from the ramp and its hue and chroma from your base
        — and clamps into sRGB holding that lightness, so a vivid brand loses
        saturation rather than drifting lighter or darker than the rung it
        belongs to.
      </p>

      <Fieldset>
        <FieldsetLegend>Which theme</FieldsetLegend>
        <FieldsetContent>
          <div
            style={{
              display: 'grid',
              justifyItems: 'start',
              gap: 'var(--fm-space-stack-s)',
            }}
          >
            <SegmentedControl
              name="scheme"
              value={scheme}
              onValueChange={(next) => setScheme(next as Scheme)}
            >
              <SegmentedControlItem value="light">Light</SegmentedControlItem>
              <SegmentedControlItem value="dark">Dark</SegmentedControlItem>
            </SegmentedControl>
            <p style={note}>
              Both are exported. A dark theme is not the light one inverted: it
              restates its bases at lightness 0.75, takes seventeen rungs of
              0.05 where light takes eleven, and points <code>-subtle</code> at
              a dark rung where light points at a pale one.
            </p>
          </div>
        </FieldsetContent>
      </Fieldset>

      {dark && (
        <Fieldset>
          <FieldsetLegend>The dark seven</FieldsetLegend>
          <FieldsetContent orientation="horizontal">
            {FAMILIES.map((family) => (
              <label
                key={family}
                style={{
                  display: 'grid',
                  gap: 'var(--fm-space-stack-s)',
                  fontSize: 'var(--fm-text-sm)',
                }}
              >
                {family}
                <ColorPicker
                  value={darkBases[family]}
                  onChange={(event) =>
                    setDarkBases({
                      ...darkBases,
                      [family]: event.currentTarget.value,
                    })
                  }
                />
              </label>
            ))}
          </FieldsetContent>
          <div
            style={{
              display: 'grid',
              gap: 'var(--fm-space-stack-s)',
              marginBlockStart: 'var(--fm-space-stack-s)',
              justifyItems: 'start',
            }}
          >
            <p style={note}>
              Suggested from your light colours — same hue, restated at
              lightness 0.75, keeping each one&rsquo;s share of the chroma sRGB
              allows there. That share is what &ldquo;how saturated is this
              brand&rdquo; means; an absolute chroma is not, since the same
              number is 78% of the ceiling at 0.55 and about 54% of it at 0.75.
              Edit any of them: a brand with a real dark palette has colours of
              its own.
            </p>
            <Button type="button" variant="secondary" onClick={deriveFromLight}>
              Re-derive from the light colours
            </Button>
          </div>
        </Fieldset>
      )}

      {/* THE RAMP CONTROL IS LIGHT-ONLY, and saying so beats hiding it silently. The
          dark ramp's two ends have no role pointing at them — the 25 and the 1500 are
          both headroom there — so a control over them would probe two matrices to
          move nothing. */}
      {!dark && (
        <Fieldset>
          <FieldsetLegend>The ramp</FieldsetLegend>
          <FieldsetContent orientation="horizontal">
            <RampEnd
              legend="Darkest rung"
              name="dark-end"
              value={String(shape.darkEnd)}
              onChange={(next) => setShape({ ...shape, darkEnd: Number(next) })}
              options={DARK_END_CHOICES}
              labelOf={(option) => Number(option).toFixed(2)}
              idOf={(option) => `dark-${option}`}
              verdicts={verdicts.dark}
            >
              How dark the bottom of every ramp goes, as OKLCH lightness. The
              design system ships {REFERENCE_SHAPE.darkEnd.toFixed(2)}, which is
              what the harshest of 144 test brands needs — your seven colours
              may allow more.
            </RampEnd>

            <RampEnd
              legend="Pale end"
              name="pale-end"
              value={String(shape.paleRungs)}
              onChange={(next) =>
                setShape({
                  ...shape,
                  paleRungs: Number(next) as RampShape['paleRungs'],
                })
              }
              options={PALE_END_CHOICES}
              labelOf={(option) => PALE_LABELS[Number(option)] as string}
              idOf={(option) => `pale-${option}`}
              verdicts={verdicts.pale}
            >
              How far above the 100 the scale reaches — washes for page and
              component backgrounds. Radix ships twelve steps, Material ten; the
              design system ships eleven.
            </RampEnd>
          </FieldsetContent>
        </Fieldset>
      )}

      <table
        style={{
          borderCollapse: 'separate',
          borderSpacing: 'var(--fm-space-internal-xs)',
        }}
      >
        <caption
          style={{
            captionSide: 'bottom',
            color: 'var(--fm-color-muted-foreground)',
            textAlign: 'start',
            paddingTop: 'var(--fm-space-stack-s)',
          }}
        >
          The generated {scheme} palette — seven families, {steps.length} rungs
          each, lightness {shown[0]?.lightness.toFixed(3)} down to{' '}
          {(shown.at(-1)?.lightness ?? 0).toFixed(2)}.
        </caption>
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'start' }}>
              Family
            </th>
            {steps.map((step) => (
              <th key={step} scope="col" style={{ textAlign: 'start' }}>
                {step}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FAMILIES.map((family) => (
            <tr key={family}>
              <th
                scope="row"
                style={{ textAlign: 'start', fontWeight: 'inherit' }}
              >
                {family}
              </th>
              {steps.map((step) => (
                <td key={step}>
                  {/* The value is in the title AND in the cell's own accessible
                      name: a swatch is a colour, and a colour is the one thing a
                      screen reader cannot be shown. */}
                  <span
                    title={`${family}-${step}: ${palette[family][step]}`}
                    aria-label={`${family} ${step}, ${palette[family][step]}`}
                    style={{
                      display: 'block',
                      inlineSize: 'var(--fm-space-inline-l)',
                      blockSize: 'var(--fm-space-inline-l)',
                      borderRadius: 'var(--fm-radius-sm)',
                      // A HAIRLINE, and it is load-bearing rather than decoration.
                      // The palest rungs sit at the same lightness as the page —
                      // dark's 25 is 0.985 and so is `--fm-color-background` — so
                      // without a border a whole column rendered as empty cells.
                      // Seen only by looking at the page.
                      border: '1px solid var(--fm-color-border)',
                      background: palette[family][step],
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
        <Button as={Link} to={stepPath('brand-colours')}>
          Back to the colours
        </Button>
        <Button as={Link} to={stepPath('roles')}>
          Point the roles
        </Button>
      </div>
    </section>
  );
}
