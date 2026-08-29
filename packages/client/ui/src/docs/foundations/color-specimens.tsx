import { colorVar } from '@fmmenchi/tokens';
import { contrast } from '../../test/contrast.js';
import {
  actionGroups,
  declaredPairs,
  remainingGroups,
  statusGroups,
} from './token-data.js';
import { useTokenValues } from './use-token-values.js';
import type { ColorPair, RoleGroup } from './token-data.types.js';

/**
 * The colour specimens. Each one READS the contract for its names and the DOM
 * for its values; none of them holds a colour of its own.
 *
 * Plain elements and inline styles rather than the design system's own
 * components: a page that documents the material should not be built out of
 * the things made from it, or a broken Card takes the page that would have
 * shown you the break. The inline styles are all `var(--fm-*)` — the page eats
 * its own tokens, so it re-themes with everything else.
 */

const AA_TEXT = 4.5;

const PAIRS = declaredPairs();

/** Stable module-scope lists: `useTokenValues` takes these as dependencies. */
const PAIR_PROPERTIES: readonly string[] = [
  ...new Set(
    PAIRS.flatMap((pair) => [
      colorVar(pair.background),
      colorVar(pair.foreground),
    ]),
  ),
];

const mono = {
  fontFamily: 'var(--fm-font-mono)',
  fontSize: 'var(--fm-text-xs)',
} as const;

const cell = {
  padding: 'var(--fm-space-internal-s)',
  borderBottom:
    'var(--fm-border-width-divider) solid var(--fm-color-neutral-border)',
} as const;

/**
 * One strip per group: the swatch, the role, and the property a consumer
 * would type. The property name is the useful half — a hex can be eyeballed
 * from the swatch, `--fm-color-primary-subtle-foreground` cannot be guessed.
 */
function Strip({ group }: { group: RoleGroup }) {
  return (
    <section style={{ marginBlockEnd: 'var(--fm-space-stack-l)' }}>
      <h3
        style={{
          fontSize: 'var(--fm-text-sm)',
          fontWeight: 'var(--fm-font-weight-semibold)',
          marginBlockEnd: 'var(--fm-space-stack-s)',
        }}
      >
        {group.name}
      </h3>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--fm-space-inline-s)',
        }}
      >
        {group.entries.map(({ role, property }) => (
          <div key={role} style={{ inlineSize: '11rem' }}>
            <div
              style={{
                blockSize: '3rem',
                background: `var(${property})`,
                borderRadius: 'var(--fm-radius-sm)',
                border:
                  'var(--fm-border-width-default) solid var(--fm-color-border)',
              }}
            />
            <div
              style={{
                ...mono,
                marginBlockStart: 'var(--fm-space-internal-xs)',
                overflowWrap: 'anywhere',
              }}
            >
              {property}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ActionFamilies() {
  return (
    <div>
      {actionGroups().map((group) => (
        <Strip key={group.name} group={group} />
      ))}
    </div>
  );
}

export function StatusFamilies() {
  return (
    <div>
      {statusGroups().map((group) => (
        <Strip key={group.name} group={group} />
      ))}
    </div>
  );
}

export function SurfacesAndInputs() {
  return (
    <div>
      {remainingGroups().map((group) => (
        <Strip key={group.name} group={group} />
      ))}
    </div>
  );
}

/**
 * The sample for an EXEMPT pair, as two tiles rather than a line of text.
 *
 * Because the exemption does not travel. WCAG 1.4.3 excuses the colours of a
 * disabled CONTROL; it does not excuse a docs page for painting real text at
 * 1.38 in a table, which is what the first version of this did — axe failed the
 * story and was right to. The pair still has to be shown and still has to carry
 * its number, so it is shown as colour instead of as text.
 */
function Tiles({ pair }: { pair: ColorPair }) {
  const tile = {
    inlineSize: '2.5rem',
    blockSize: '1.5rem',
    borderRadius: 'var(--fm-radius-sm)',
    border: 'var(--fm-border-width-default) solid var(--fm-color-border)',
  } as const;

  return (
    <span style={{ display: 'inline-flex', gap: 'var(--fm-space-inline-s)' }}>
      <span
        style={{ ...tile, background: `var(${colorVar(pair.background)})` }}
      />
      <span
        style={{ ...tile, background: `var(${colorVar(pair.foreground)})` }}
      />
    </span>
  );
}

/**
 * Every declared pair, with the ratio MEASURED in the theme on screen.
 *
 * Measured rather than asserted: `packages/client/tokens/src/tokens.test.ts`
 * already gates these pairs, so the page is not the safety net. What it adds is
 * the number — a pair that passes at 4.6 and one that passes at 12 are the same
 * green tick to a test and very different things to look at, and toggling the
 * theme re-measures them.
 */
export function DeclaredPairs() {
  const { ref, values } = useTokenValues(PAIR_PROPERTIES);

  const rows = PAIRS.map((pair) => {
    const background = values[colorVar(pair.background)] ?? '';
    const foreground = values[colorVar(pair.foreground)] ?? '';
    const ratio =
      background === '' || foreground === ''
        ? null
        : contrast(foreground, background);
    return { pair, background, foreground, ratio };
  });

  return (
    <div ref={ref} style={{ overflowX: 'auto' }}>
      <table
        style={{
          borderCollapse: 'collapse',
          fontSize: 'var(--fm-text-sm)',
          inlineSize: '100%',
        }}
      >
        <thead>
          <tr>
            <th style={{ ...cell, textAlign: 'start' }}>pair</th>
            <th style={{ ...cell, textAlign: 'start' }}>sample</th>
            <th style={{ ...cell, textAlign: 'end' }}>ratio</th>
            <th style={{ ...cell, textAlign: 'start' }}>against 4.5</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ pair, ratio }) => {
            const passes = ratio !== null && ratio >= AA_TEXT;
            return (
              <tr key={pair.background}>
                <td style={{ ...cell, ...mono, whiteSpace: 'nowrap' }}>
                  {pair.background}
                </td>
                <td style={cell}>
                  {pair.exempt ? (
                    <Tiles pair={pair} />
                  ) : (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: 'var(--fm-space-internal-s)',
                        borderRadius: 'var(--fm-radius-sm)',
                        background: `var(${colorVar(pair.background)})`,
                        color: `var(${colorVar(pair.foreground)})`,
                      }}
                    >
                      Sample text
                    </span>
                  )}
                </td>
                <td
                  style={{
                    ...cell,
                    textAlign: 'end',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {ratio === null ? '—' : ratio.toFixed(2)}
                </td>
                <td style={cell}>
                  {pair.exempt
                    ? 'exempt — disabled (WCAG 1.4.3)'
                    : passes
                      ? 'passes'
                      : 'BELOW'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
