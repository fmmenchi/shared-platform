import { useMemo } from 'react';
import { COLOR_ROLES, colorVar, type ColorRole } from '@fmmenchi/theme';
import { MATRIX_FAMILIES, matrixSlots, slotLabel } from './token-data.js';
import { useTokenValues } from './use-token-values.js';

/**
 * Families down, slots across.
 *
 * The view the palette should have been. Grouping colours by hue put them in an
 * order nothing in the system uses — no one picks a colour by its angle here,
 * because there is no primitive layer to pick from — and ordering each strip by
 * lightness meant no two rows lined up, so nothing could be compared with
 * anything. A matrix fixes both: a column IS a slot, so reading down it
 * compares every family's `subtle` against every other's.
 *
 * The empty cells are the other half of the point. `border` is blank for the
 * action families and filled for the status ones; `hover` is the reverse. That
 * is the difference between "something you press" and "something you read",
 * drawn rather than described.
 */

const SLOTS = matrixSlots();

const CELL_PROPERTIES: readonly string[] = [
  ...new Set(
    MATRIX_FAMILIES.flatMap((family) =>
      SLOTS.map((slot) => `${family}${slot}`)
        .filter((role): role is ColorRole =>
          (COLOR_ROLES as readonly string[]).includes(role),
        )
        .map(colorVar),
    ),
  ),
];

const headCell = {
  fontSize: 'var(--fm-text-xs)',
  fontWeight: 'var(--fm-font-weight-regular)',
  color: 'var(--fm-color-muted-foreground)',
  padding: 'var(--fm-space-internal-xs)',
  textAlign: 'start',
  whiteSpace: 'nowrap',
} as const;

export function RoleMatrix() {
  const properties = useMemo(() => CELL_PROPERTIES, []);
  const { ref, values } = useTokenValues(properties);
  const declared = useMemo(() => new Set<string>(COLOR_ROLES), []);

  return (
    <div ref={ref} style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {/* A `td`, not an empty `th`: the corner of a doubly-headed table
                heads neither axis, and axe fails an empty header outright
                (`empty-table-header`) — which it did here. Naming the axes is
                free once the cell has to carry something. */}
            <td style={headCell}>family ╲ slot</td>
            {SLOTS.map((slot) => (
              <th key={slot} scope="col" style={headCell}>
                {slotLabel(slot)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATRIX_FAMILIES.map((family) => (
            <tr key={family}>
              <th
                scope="row"
                style={{
                  ...headCell,
                  color: 'var(--fm-color-foreground)',
                  fontWeight: 'var(--fm-font-weight-semibold)',
                  fontSize: 'var(--fm-text-sm)',
                  paddingInlineEnd: 'var(--fm-space-inline-m)',
                }}
              >
                {family}
              </th>

              {SLOTS.map((slot) => {
                const role = `${family}${slot}`;
                if (!declared.has(role)) {
                  return (
                    <td key={slot} style={{ padding: 2 }}>
                      {/* Not a gap in the table — a slot this family does not
                          have. Left visibly empty rather than filled with a
                          fallback, which would read as a colour. */}
                      <div
                        style={{
                          inlineSize: '4.5rem',
                          blockSize: '2.5rem',
                          border:
                            'var(--fm-border-width-default) dashed var(--fm-color-border)',
                          borderRadius: 'var(--fm-radius-sm)',
                          opacity: 0.4,
                        }}
                      />
                    </td>
                  );
                }

                const property = colorVar(role as ColorRole);
                return (
                  <td key={slot} style={{ padding: 2 }}>
                    <div
                      title={`${role}\n${property}\n${values[property] ?? ''}`}
                      style={{
                        inlineSize: '4.5rem',
                        blockSize: '2.5rem',
                        background: `var(${property})`,
                        border:
                          'var(--fm-border-width-default) solid var(--fm-color-border)',
                        borderRadius: 'var(--fm-radius-sm)',
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
