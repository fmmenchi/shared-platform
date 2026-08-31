import { generatePalette } from '@fmmenchi/theme';
import { Button } from '@fmmenchi/ui/button';
import { Heading } from '@fmmenchi/ui/heading';
import { Link } from 'react-router';
import { useMemo } from 'react';

import { FAMILIES, useBases } from '../../bases';
import { RAMP_STEPS, WIZARD_RAMP } from '../../ramp';

/**
 * STEP TWO — the ramps those seven colours produce.
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
 * The swatches are painted with inline `background`, which is the one place in this
 * app that is right: these are GENERATED colours, not roles, and a token cannot name
 * a value that did not exist when the stylesheet was written.
 */
export default function Palette() {
  const { bases } = useBases();

  // Recomputed only when a base moves. `generatePalette` clamps each rung into sRGB
  // with a bisection, so it is not free — and it runs 63 times per call.
  const palette = useMemo(() => generatePalette(bases, WIZARD_RAMP), [bases]);

  return (
    <section style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <Heading level={2}>Palette</Heading>

      <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
        Nine rungs per family, derived from your colours. Each rung takes its
        lightness from the ramp and its hue and chroma from your base — and
        clamps into sRGB holding that lightness, so a vivid brand loses
        saturation rather than drifting lighter or darker than the rung it
        belongs to.
      </p>

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
          The generated palette — seven families, nine rungs each.
        </caption>
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'start' }}>
              Family
            </th>
            {RAMP_STEPS.map((step) => (
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
              {RAMP_STEPS.map((step) => (
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
        <Button as={Link} to="/">
          Back to the colours
        </Button>
        <Button as={Link} to="/roles">
          Point the roles
        </Button>
      </div>
    </section>
  );
}
