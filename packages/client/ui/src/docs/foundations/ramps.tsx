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
    </div>
  );
}
