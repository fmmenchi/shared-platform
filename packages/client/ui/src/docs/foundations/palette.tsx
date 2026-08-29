import { useMemo } from 'react';
import { contrast } from '../../test/contrast.js';
import { ALL_COLOR_PROPERTIES, hueFamilies } from './token-data.js';
import { useTokenValues } from './use-token-values.js';
import type { RoleEntry, RoleGroup } from './token-data.types.js';

/**
 * The palette: one strip per family, ordered light to dark, with the value on
 * hover instead of under the swatch.
 *
 * Storybook's own `ColorItem` was the first attempt and is the reason for this
 * one. It divides its width by the number of swatches and prints the value
 * under each — so a family of eight roles got an eighth of a row each, and
 * `oklch(0.87 0.118 256)` has never fitted in an eighth of a row. On screen the
 * labels collided into an unreadable block, which is a documentation page
 * failing at its only job. It also needs Storybook's chrome theme, which the
 * docs page supplies and the canvas does not, so the blocks crashed the moment
 * these specimens were run as tests.
 *
 * Owning the markup fixes both: the swatch shows the short name, the `title`
 * carries the full role, property and value, and nothing here needs a theme
 * beyond our own tokens.
 */

const isInk = (entry: RoleEntry): boolean => entry.role.endsWith('-foreground');

/**
 * The label drops the family prefix the strip's title already carries, so what
 * is left is the part that differs: `subtle`, `hover`, `disabled`.
 *
 * `-?foreground$`, not `-foreground$`: strip `card` from `card-foreground` and
 * what remains is `foreground` with no hyphen to match, which came out as "on
 * foreground" where it means "on base". Seen only by looking at the page.
 *
 * An ink is named for the fill it sits on — `on subtle` — because otherwise the
 * inks appear to repeat the fills' names with different colours, which is
 * exactly what they are not doing.
 */
function labelFor(entry: RoleEntry, family: string): string {
  const short = entry.role
    .replace(new RegExp(`^${family}-?`), '')
    .replace(/-?foreground$/, '');
  const name = short === '' ? 'base' : short;
  return isInk(entry) ? `on ${name}` : name;
}

/**
 * Light-to-dark, MEASURED — contrast against black, which is monotonic in
 * luminance and reuses the measurement the contrast table already relies on
 * rather than adding a second colour maths to the package.
 *
 * Measured rather than written down, because a written order is a claim about
 * the reference theme that is wrong in the other: `primary-subtle` is the
 * lightest role in light and among the darkest in dark. A derived order is
 * right in both without knowing either.
 */
function lightnessOf(value: string): number {
  if (value === '') return -1;
  try {
    return contrast(value, '#000');
  } catch {
    // A value the canvas cannot paint sorts last rather than taking the page
    // down: a docs page is the wrong place to learn a token is broken, but a
    // blank one says nothing at all.
    return -1;
  }
}

function sorted(
  entries: RoleEntry[],
  values: Record<string, string>,
): RoleEntry[] {
  return [...entries].sort(
    (a, b) =>
      lightnessOf(values[b.property] ?? '') -
      lightnessOf(values[a.property] ?? ''),
  );
}

const nameCell = {
  inlineSize: '11rem',
  flexShrink: 0,
  fontSize: 'var(--fm-text-sm)',
  fontWeight: 'var(--fm-font-weight-semibold)',
  paddingBlockStart: 'var(--fm-space-internal-xs)',
} as const;

function Strip({
  group,
  values,
}: {
  group: RoleGroup;
  values: Record<string, string>;
}) {
  const entries = sorted(group.entries, values);

  return (
    <div
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
        {group.name}
        <div
          style={{
            fontWeight: 'var(--fm-font-weight-regular)',
            color: 'var(--fm-color-muted-foreground)',
            fontSize: 'var(--fm-text-xs)',
          }}
        >
          {entries.length === 1 ? 'one role' : `${entries.length} roles`}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minInlineSize: 0 }}>
        {entries.map((entry) => (
          <div
            key={entry.role}
            // The tooltip is where the long strings live. A swatch is a colour
            // you recognise; the role, the property to type and the exact value
            // are what you go looking for, and printing all three under every
            // swatch is what made the first version unreadable.
            title={`${entry.role}\n${entry.property}\n${values[entry.property] ?? ''}`}
            style={{ flex: 1, minInlineSize: 0 }}
          >
            <div
              style={{
                blockSize: '3rem',
                background: `var(${entry.property})`,
                // Bordered on every side, for two defects one rule fixes.
                // Neighbours are sometimes the SAME value and merged into one
                // wide band — `primary-subtle` and `primary-disabled-foreground`
                // are both `oklch(0.9 0.049 255)`, so the strip read as seven
                // roles instead of eight. And a swatch the colour of the page
                // vanished entirely: `background` had nothing to separate it
                // from the paper it was printed on.
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
              {labelFor(entry, group.name)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The palette itself: every distinct VALUE, grouped by hue, ordered by
 * lightness.
 *
 * The design system has no primitives file to put here — `vars.css` states that
 * the ramp was resolved at authoring time and only the semantic values were
 * kept — so this is reconstructed from what is shipped. Which makes it the more
 * useful of the two artefacts: it shows the palette in use rather than the one
 * intended, and it cannot drift from the tokens because it IS the tokens.
 */
export function SourcePalette() {
  const { ref, values } = useTokenValues(ALL_COLOR_PROPERTIES);
  const families = hueFamilies(values);

  return (
    <div ref={ref}>
      {families.map((family) => (
        <div
          key={`${family.neutral ? 'neutral' : family.hue}`}
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
            {family.name}
            <div
              style={{
                fontWeight: 'var(--fm-font-weight-regular)',
                color: 'var(--fm-color-muted-foreground)',
                fontSize: 'var(--fm-text-xs)',
              }}
            >
              {family.shades.length} shades ·{' '}
              {family.neutral ? 'grey' : `${Math.round(family.hue)}°`}
              {family.alsoUsedBy.length > 0 && (
                // "shared with", not a longer name. Sitting at the same hue is
                // not being the same role: `secondary` is a different colour a
                // degree away, while `link` is `primary` to the last decimal —
                // and a title reading `primary · secondary · link` claimed all
                // three were one thing.
                <>
                  <br />
                  shared with {family.alsoUsedBy.join(', ')}
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1, minInlineSize: 0 }}>
            {family.shades.map((shade) => (
              <div
                key={shade.value}
                // Every role that resolves to this value, because several do
                // and the palette is the only place that fact is visible.
                title={`${shade.value}\n\n${shade.roles.join('\n')}`}
                style={{ flex: 1, minInlineSize: 0 }}
              >
                <div
                  style={{
                    blockSize: '3rem',
                    background: shade.value,
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
                  {Math.round(shade.lightness * 100)}
                  {shade.roles.length > 1 ? ` ·${shade.roles.length}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Palette({ groups }: { groups: RoleGroup[] }) {
  // Stable as long as `groups` is, which is why callers pass the module-level
  // constants from `token-data` rather than calling the derivations inline.
  const properties = useMemo(
    () => groups.flatMap((group) => group.entries.map((e) => e.property)),
    [groups],
  );
  const { ref, values } = useTokenValues(properties);

  return (
    <div ref={ref}>
      {groups.map((group) => (
        <Strip key={group.name} group={group} values={values} />
      ))}
    </div>
  );
}
