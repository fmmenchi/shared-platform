import { generatePalette, type Ramp } from '@fmmenchi/theme';
import { Button } from '@fmmenchi/ui/button';
import { Fieldset } from '@fmmenchi/ui/fieldset';
import { FieldsetContent } from '@fmmenchi/ui/fieldset-content';
import { FieldsetLegend } from '@fmmenchi/ui/fieldset-legend';
import { Heading } from '@fmmenchi/ui/heading';
import { SegmentedControl } from '@fmmenchi/ui/segmented-control';
import { SegmentedControlItem } from '@fmmenchi/ui/segmented-control-item';
import { Link } from 'react-router';
import { useMemo, type ReactNode } from 'react';

import { FAMILIES, useBases } from '../../bases';
import { useEditingScheme } from '../../editing-scheme';
import { useDeclarations, type Scheme } from '../../declarations';
import { probeShape } from '../../ramp-probe';
import {
  DARK_END_CHOICES,
  DARK_REFERENCE_SHAPE,
  DARK_SCHEME_END_CHOICES,
  REFERENCE_SHAPE,
  buildDarkRamp,
  buildRamp,
  useRamp,
} from '../../ramp';
import { useThemedDeclarations } from '../../role-overrides';
import { useStepLink } from '../../steps';

/** Small print — a description, or a refusal. */
const note = {
  margin: 0,
  maxWidth: 'var(--fm-size-prose)',
  fontSize: 'var(--fm-text-sm)',
  lineHeight: 'var(--fm-leading-sm)',
  color: 'var(--fm-color-muted-foreground)',
} as const;

/**
 * STEP TWO — the ramps those colours produce, ONE TAB PER THEME.
 *
 * TABS RATHER THAN A TOGGLE BESIDE THE CONTROLS, and getting here took three shapes.
 * The first put a "which theme" segmented control above a ramp panel that applied to
 * light only, so picking dark made the panel vanish — a VIEW control switching a
 * VALUE control off. The second moved the toggle down to the table and left the panel
 * always visible, named "The light ramp": nothing disappeared any more, and a person
 * was still looking at a dark palette above a control for the other theme.
 *
 * A TAB SETTLES IT BY CONSTRUCTION. Everything inside a panel is about that theme —
 * its ramp, its palette, its refusals — so "which control applies to what" stops
 * being a question. Both earlier shapes were trying to answer with layout something
 * that is really about scope.
 *
 * AND DARK GETS A RAMP CONTROL, which it did not have. The argument for leaving it
 * out was that dark's two ends "have no role pointing at them, so a control over them
 * would move nothing" — true of the 25 and the 1500 themselves, and beside the point:
 * moving the end RE-SPACES every rung between it and the 100, and `-subtle` in dark
 * points at the 1400. It moves plenty.
 *
 * THE TWO SCALES ARE NOT THE SAME SHAPE, which is why each panel carries its own
 * builder and its own options: dark's 100 sits at 0.95 where light's is at 0.90, it
 * takes fifteen rungs below that where light takes nine, and its base is ON the scale
 * at the 500.
 */
export default function Palette() {
  const [scheme] = useEditingScheme();
  const stepLink = useStepLink();
  const { bases, darkBases } = useBases();
  const { shapes, ramps, setShape } = useRamp();
  // THE RE-POINTED ones for light: an override is a changed declaration, so a person
  // who walked back from step three must be probed against what they actually have.
  // Dark uses the design system's own alias map — the two point their roles at
  // different rungs, so a light override means a different colour there.
  const lightDeclared = useThemedDeclarations();
  const darkDeclared = useDeclarations('dark');

  return (
    <section style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <Heading level={2}>Palette</Heading>

      <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
        Every rung takes its lightness from the ramp and its hue and chroma from
        your base — and clamps into sRGB holding that lightness, so a vivid
        brand loses saturation rather than drifting lighter or darker than the
        rung it belongs to. Both themes are exported; the fourteen colours
        behind them are on step one.
      </p>

      {scheme === 'light' ? (
        <SchemePanel
          scheme="light"
          bases={bases}
          declared={lightDeclared}
          ramp={ramps.light}
          darkEnd={shapes.light.darkEnd}
          choices={DARK_END_CHOICES}
          shipped={REFERENCE_SHAPE.darkEnd}
          build={buildRamp}
          onDarkEnd={(darkEnd) => setShape('light', { darkEnd })}
        >
          Eleven rungs, evenly 0.08 apart below the 100 and compressing above
          it. The design system ships {REFERENCE_SHAPE.darkEnd.toFixed(2)} at
          the bottom, which is what the harshest of 144 test brands needs — your
          own colours may allow more.
        </SchemePanel>
      ) : (
        <SchemePanel
          scheme="dark"
          bases={darkBases}
          declared={darkDeclared}
          ramp={ramps.dark}
          darkEnd={shapes.dark.darkEnd}
          choices={DARK_SCHEME_END_CHOICES}
          shipped={DARK_REFERENCE_SHAPE.darkEnd}
          build={buildDarkRamp}
          onDarkEnd={(darkEnd) => setShape('dark', { darkEnd })}
        >
          Seventeen rungs, evenly 0.05 apart below the 100 — half light&rsquo;s
          step, because these bases sit at lightness 0.75 and the scale has to
          cover ground in both directions from there. Its pale end is a TEXT
          colour rather than a wash.
        </SchemePanel>
      )}

      <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
        <Button as={Link} to={stepLink('brand-colours')}>
          Back to the colours
        </Button>
        <Button as={Link} to={stepLink('roles')}>
          Point the roles
        </Button>
      </div>
    </section>
  );
}

/**
 * ONE THEME'S RAMP AND ITS PALETTE — everything a tab panel holds.
 *
 * EXTRACTED BECAUSE THE TWO PANELS ARE THE SAME PAGE ON DIFFERENT DATA, and two
 * copies of a control whose job is to show WHY an option is unavailable would be two
 * places for that wiring to fall out of step. What differs is passed in — the bases,
 * the alias map, the ramp, the options and the BUILDER, because the two scales have
 * different steps and neither builder can serve the other.
 */
function SchemePanel({
  scheme,
  bases,
  declared,
  ramp,
  darkEnd,
  choices,
  shipped,
  build,
  onDarkEnd,
  children,
}: {
  readonly scheme: Scheme;
  readonly bases: Parameters<typeof generatePalette>[0];
  readonly declared: ReadonlyMap<string, string>;
  readonly ramp: Ramp;
  readonly darkEnd: number;
  readonly choices: readonly number[];
  readonly shipped: number;
  readonly build: (shape: { darkEnd: number }) => Ramp;
  readonly onDarkEnd: (darkEnd: number) => void;
  /** What this scale is, in prose. */
  readonly children: ReactNode;
}) {
  const palette = useMemo(() => generatePalette(bases, ramp), [bases, ramp]);
  const steps = useMemo(() => ramp.map((rung) => rung.step), [ramp]);

  // ONE PROBE PER OPTION, memoised on the bases. Each option is built and then put
  // through the real validator for THIS theme's alias map, so an option that would
  // produce a theme the contract refuses is disabled with the reason — the control
  // cannot hand a person a theme that fails on step four, and it does not guess.
  //
  // Not cheap: three themes per panel, eighty-four roles each, every palette
  // bisected into sRGB. Paid once per change of bases rather than once per click.
  const verdicts = useMemo(
    () =>
      choices.map((option) =>
        probeShape(declared, bases, build({ darkEnd: option })),
      ),
    [choices, declared, bases, build],
  );

  return (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <Fieldset>
        <FieldsetLegend>The darkest rung</FieldsetLegend>
        <FieldsetContent>
          {/* `justify-items: start` because the track is `inline-flex` and a grid
              item STRETCHES by default — without it the segments spread across the
              whole column and read as a toolbar rather than as a choice. */}
          <div
            style={{
              display: 'grid',
              justifyItems: 'start',
              gap: 'var(--fm-space-stack-s)',
            }}
          >
            <SegmentedControl
              name={`${scheme}-dark-end`}
              value={String(darkEnd)}
              onValueChange={(next) => onDarkEnd(Number(next))}
            >
              {choices.map((option, i) => (
                <SegmentedControlItem
                  key={option}
                  value={String(option)}
                  disabled={!verdicts[i]?.allowed}
                  // THE REASON IS ASSOCIATED WITH THE INPUT rather than merely
                  // printed near it: a disabled segment says nothing on its own, and
                  // "why is this greyed out" is the question the control has to
                  // answer.
                  aria-describedby={
                    verdicts[i]?.allowed ? undefined : `${scheme}-end-${option}`
                  }
                >
                  {option.toFixed(2)}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>

            <p style={note}>{children}</p>

            {choices
              .map((option, i) => [option, verdicts[i]] as const)
              .filter(([, verdict]) => verdict && !verdict.allowed)
              .map(([option, verdict]) => (
                <p key={option} id={`${scheme}-end-${option}`} style={note}>
                  <strong>{option.toFixed(2)}</strong> is not available for your{' '}
                  {scheme} colours: {verdict?.reason}
                </p>
              ))}
          </div>
        </FieldsetContent>
      </Fieldset>

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
          Seven families, {steps.length} rungs each, lightness{' '}
          {ramp[0]?.lightness.toFixed(3)} down to {darkEnd.toFixed(2)}. The
          design system ships {shipped.toFixed(2)}.
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
    </div>
  );
}
