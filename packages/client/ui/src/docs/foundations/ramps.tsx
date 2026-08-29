import { useMemo } from 'react';
import varsCss from '@fmmenchi/tokens/styles/vars.css?raw';
import { useTokenValues } from './use-token-values.js';

/**
 * THE PALETTE ITSELF — level 2, as declared.
 *
 * The step names are read out of `vars.css` at build time rather than listed
 * here. They are not in the TypeScript contract on purpose (the palette is
 * internal, and a component may not read it), and the neutral ramp is written
 * by hand, so there is nothing to derive them from — a list in this file would
 * be a second source of truth that goes stale the first time a rung is added.
 * Parsing the stylesheet keeps the page honest for free.
 *
 * The VALUES still come from the DOM, because the declaration is a formula:
 * `oklch(from …)` says how a step is built, not what colour it is.
 */

type Ramp = { family: string; steps: { step: number; property: string }[] };

/**
 * LEVEL 1 — the bases, read from the stylesheet the same way the ramps are.
 *
 * Shown because a page that explains three levels and draws two is describing
 * something other than the system. Eight numbers, and the only place a hue is
 * decided.
 */
const BASES: { family: string; property: string }[] = [
  ...new Set(
    [...varsCss.matchAll(/--fm-palette-([a-z]+)-base\s*:/g)].map((m) => m[1]),
  ),
].map((family) => ({
  family: family as string,
  property: `--fm-palette-${family}-base`,
}));

export function PaletteBases() {
  const properties = useMemo(() => BASES.map((b) => b.property), []);
  const { ref, values } = useTokenValues(properties);

  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--fm-space-inline-m)',
      }}
    >
      {BASES.map(({ family, property }) => (
        <div key={family} style={{ inlineSize: '9rem' }}>
          <div
            style={{
              blockSize: '4rem',
              background: `var(${property})`,
              borderRadius: 'var(--fm-radius-sm)',
              border:
                'var(--fm-border-width-default) solid var(--fm-color-border)',
            }}
          />
          <div
            style={{
              fontSize: 'var(--fm-text-sm)',
              fontWeight: 'var(--fm-font-weight-semibold)',
              paddingBlockStart: 'var(--fm-space-internal-xs)',
            }}
          >
            {family}
          </div>
          <div
            style={{
              fontFamily: 'var(--fm-font-mono)',
              fontSize: 'var(--fm-text-xs)',
              color: 'var(--fm-color-muted-foreground)',
              overflowWrap: 'anywhere',
            }}
          >
            {values[property] ?? ''}
          </div>
        </div>
      ))}

      {/* The neutrals belong to level 1 by rights and have no base, so the
          absence is drawn rather than left as a gap. Same reasoning as the
          matrix's dashed cells: a missing thing that is missing ON PURPOSE has
          to say so, or it reads as an oversight. */}
      <div style={{ inlineSize: '9rem' }}>
        <div
          style={{
            blockSize: '4rem',
            borderRadius: 'var(--fm-radius-sm)',
            border:
              'var(--fm-border-width-default) dashed var(--fm-color-border)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 'var(--fm-text-xs)',
            color: 'var(--fm-color-muted-foreground)',
          }}
        >
          no base
        </div>
        <div
          style={{
            fontSize: 'var(--fm-text-sm)',
            fontWeight: 'var(--fm-font-weight-semibold)',
            paddingBlockStart: 'var(--fm-space-internal-xs)',
          }}
        >
          neutral
        </div>
        <div
          style={{
            fontSize: 'var(--fm-text-xs)',
            color: 'var(--fm-color-muted-foreground)',
          }}
        >
          ramp written out, not derived
        </div>
      </div>
    </div>
  );
}

const RAMPS: Ramp[] = (() => {
  const byFamily = new Map<string, { step: number; property: string }[]>();

  for (const [, family = '', step = ''] of varsCss.matchAll(
    /--fm-palette-([a-z]+)-(\d+)\s*:/g,
  )) {
    const list = byFamily.get(family) ?? [];
    list.push({
      step: Number(step),
      property: `--fm-palette-${family}-${step}`,
    });
    byFamily.set(family, list);
  }

  return (
    [...byFamily]
      .map(([family, steps]) => ({
        family,
        steps: steps.sort((a, b) => a.step - b.step),
      }))
      // Neutrals last: the longest ramp, and the least interesting to land on.
      .sort(
        (a, b) =>
          Number(a.family === 'neutral') - Number(b.family === 'neutral') ||
          a.family.localeCompare(b.family),
      )
  );
})();

const PROPERTIES: readonly string[] = RAMPS.flatMap((r) =>
  r.steps.map((s) => s.property),
);

const nameCell = {
  inlineSize: '8rem',
  flexShrink: 0,
  fontSize: 'var(--fm-text-sm)',
  fontWeight: 'var(--fm-font-weight-semibold)',
  paddingBlockStart: 'var(--fm-space-internal-xs)',
} as const;

export function PaletteRamps() {
  const properties = useMemo(() => PROPERTIES, []);
  const { ref, values } = useTokenValues(properties);

  return (
    <div ref={ref}>
      {RAMPS.map((ramp) => (
        <div
          key={ramp.family}
          style={{
            display: 'flex',
            gap: 'var(--fm-space-inline-m)',
            alignItems: 'flex-start',
            paddingBlock: 'var(--fm-space-stack-s)',
            borderBlockEnd:
              'var(--fm-border-width-divider) solid var(--fm-color-neutral-border)',
          }}
        >
          <div style={nameCell}>
            {ramp.family}
            <div
              style={{
                fontWeight: 'var(--fm-font-weight-regular)',
                color: 'var(--fm-color-muted-foreground)',
                fontSize: 'var(--fm-text-xs)',
              }}
            >
              {ramp.steps.length} steps
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1, minInlineSize: 0 }}>
            {ramp.steps.map(({ step, property }) => (
              <div
                key={step}
                title={`${property}\n${values[property] ?? ''}`}
                style={{ flex: 1, minInlineSize: 0 }}
              >
                <div
                  style={{
                    blockSize: '3rem',
                    background: `var(${property})`,
                    border:
                      'var(--fm-border-width-default) solid var(--fm-color-border)',
                  }}
                />
                <div
                  style={{
                    fontSize: 'var(--fm-text-xs)',
                    color: 'var(--fm-color-muted-foreground)',
                    paddingInline: 'var(--fm-space-internal-xs)',
                    paddingBlockStart: 'var(--fm-space-internal-xs)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {step}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* The neutrals belong to level 1 by rights and have no base, so the
          absence is drawn rather than left as a gap. Same reasoning as the
          matrix's dashed cells: a missing thing that is missing ON PURPOSE has
          to say so, or it reads as an oversight. */}
      <div style={{ inlineSize: '9rem' }}>
        <div
          style={{
            blockSize: '4rem',
            borderRadius: 'var(--fm-radius-sm)',
            border:
              'var(--fm-border-width-default) dashed var(--fm-color-border)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 'var(--fm-text-xs)',
            color: 'var(--fm-color-muted-foreground)',
          }}
        >
          no base
        </div>
        <div
          style={{
            fontSize: 'var(--fm-text-sm)',
            fontWeight: 'var(--fm-font-weight-semibold)',
            paddingBlockStart: 'var(--fm-space-internal-xs)',
          }}
        >
          neutral
        </div>
        <div
          style={{
            fontSize: 'var(--fm-text-xs)',
            color: 'var(--fm-color-muted-foreground)',
          }}
        >
          ramp written out, not derived
        </div>
      </div>
    </div>
  );
}
