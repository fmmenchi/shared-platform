import {
  COLOR_ROLES,
  colorVar,
  generateTheme,
  validateTheme,
} from '@fmmenchi/theme';
import { Alert } from '@fmmenchi/ui/alert';
import { Button } from '@fmmenchi/ui/button';
import { Heading } from '@fmmenchi/ui/heading';
import { Select } from '@fmmenchi/ui/select';
import { useMemo } from 'react';
import { Link } from 'react-router';

import { useBases } from '../../bases';
import { WIZARD_RAMP } from '../../ramp';
import {
  useRoleOverrides,
  useRungOptions,
  useThemedDeclarations,
} from '../../role-overrides';

/**
 * STEP THREE — point each of the 84 roles at a rung.
 *
 * ONE SELECT PER ROLE, which is the plainest thing that works, and it was arrived at
 * by first building the wrong thing. A read-only table shipped for about an hour: it
 * showed where every role pointed and let you change none of them, which is a step
 * with nothing to do on it. Being able to change the semantic colours is the whole
 * reason this step exists.
 *
 * The shapes that are worse:
 *
 *   - one rung per FAMILY, with hover/active/subtle following by offset. Eleven
 *     questions instead of 84, and it puts a derivation in this app that the design
 *     system already owns — two spellings of one rule, which is the mistake this
 *     project keeps paying for.
 *   - a suffix × rung grid. The same information in a shape that has to be learned.
 *
 * EVERY RUNG IS OFFERED TO EVERY ROLE, grouped by family, and that is not laziness:
 * a role legitimately points outside its own family — every `-foreground` does, at
 * the greys — so restricting the list would make the common case impossible.
 *
 * NO SUBMIT, because the answer to "what does rung 600 look like here" is the swatch
 * beside it, and a form you had to submit to find out would be asking you to guess
 * first. The check that gates anything runs where the file is produced: step four
 * generates the whole theme and runs `validateTheme` before handing it over. This
 * page shows the same verdict as you go, so a re-pointing that breaks a contrast
 * pair says so here rather than two steps later.
 */
export default function Roles() {
  const { bases } = useBases();
  const declared = useThemedDeclarations();
  const { overrides, setOverride, reset, count } = useRoleOverrides();
  const families = useRungOptions();

  const { theme, violations } = useMemo(() => {
    try {
      const generated = generateTheme(declared, bases, WIZARD_RAMP);
      return { theme: generated, violations: validateTheme(generated) };
    } catch {
      // A hole the earlier steps already report in detail. The table still renders,
      // because a person needs to see the roles in order to fix it here.
      return { theme: {} as Record<string, string>, violations: [] };
    }
  }, [declared, bases]);

  return (
    <section style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <Heading level={2}>Semantic roles</Heading>

      <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
        Each role points at a rung, and your colours changed what the rungs ARE.
        Re-point one and the swatch moves with it. The defaults are the design
        system&rsquo;s own, which is what keeps a contrast pair clearing its
        floor for any brand: every rung states its own lightness, so a pair that
        passes for one set of colours passes for all of them.
      </p>

      {violations.length > 0 && (
        <Alert variant="error">
          <p>
            {violations.length} problem
            {violations.length === 1 ? '' : 's'} with the theme as pointed. The
            export step refuses to hand over a theme that does not pass.
          </p>
          <ul>
            {violations.slice(0, 6).map((violation, i) => (
              <li key={i}>{violation.message}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div
        style={{
          display: 'flex',
          gap: 'var(--fm-space-inline-s)',
          alignItems: 'center',
        }}
      >
        <span style={{ color: 'var(--fm-color-muted-foreground)' }}>
          {count === 0
            ? 'No roles re-pointed — every one is the design system’s default.'
            : `${count} role${count === 1 ? '' : 's'} re-pointed.`}
        </span>
        {count > 0 && (
          <Button variant="secondary" onClick={reset}>
            Put them all back
          </Button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            borderCollapse: 'collapse',
            fontSize: 'var(--fm-text-sm)',
            lineHeight: 'var(--fm-leading-sm)',
          }}
        >
          <caption
            style={{
              textAlign: 'start',
              paddingBlockEnd: 'var(--fm-space-stack-s)',
              color: 'var(--fm-color-muted-foreground)',
            }}
          >
            {COLOR_ROLES.length} roles, in the order the contract declares them.
          </caption>
          <thead>
            <tr>
              <th scope="col" style={CELL}>
                Role
              </th>
              <th scope="col" style={CELL}>
                Colour
              </th>
              <th scope="col" style={CELL}>
                Points at
              </th>
            </tr>
          </thead>
          <tbody>
            {COLOR_ROLES.map((role) => {
              const declaration = declared.get(colorVar(role)) ?? '';
              // BOTH SPELLINGS OF AN ALIAS. 83 roles are a plain `var(rung)`; `scrim`
              // is a rung seen THROUGH something, `oklch(from var(rung) l c h /
              // 0.92)`. Reading only the first left one row of 84 without a control —
              // an exception a person would rightly ask about, and `scrim` is exactly
              // the role somebody re-points when a modal reads too dark.
              const plain = /^var\((--fm-palette-[a-z]+-\d+)\)$/.exec(
                declaration,
              );
              const withAlpha =
                /^oklch\(\s*from\s+var\((--fm-palette-[a-z]+-\d+)\)\s+l\s+c\s+h\s*\/\s*([0-9.]+)\s*\)$/.exec(
                  declaration.replace(/\s+/g, ' '),
                );
              const current = plain?.[1] ?? withAlpha?.[1] ?? '';
              const alpha = withAlpha?.[2];
              const overridden = overrides[colorVar(role)] !== undefined;
              const colour = theme[role];

              return (
                <tr key={role}>
                  <th scope="row" style={{ ...CELL, fontWeight: 'inherit' }}>
                    <code>{role}</code>
                  </th>
                  <td style={CELL}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--fm-space-inline-s)',
                      }}
                    >
                      {/* `aria-hidden`: the swatch says nothing a screen reader can
                          use, and the value beside it is the fact. */}
                      <span
                        aria-hidden="true"
                        style={{
                          inlineSize: '1rem',
                          blockSize: '1rem',
                          flexShrink: 0,
                          borderRadius: 'var(--fm-radius-sm)',
                          border:
                            'var(--fm-border-width-default) solid var(--fm-color-border)',
                          background: colour ?? 'transparent',
                        }}
                      />
                      <code>{colour ?? 'unresolved'}</code>
                    </span>
                  </td>
                  <td style={CELL}>
                    {current === '' ? (
                      // A role stating a colour outright rather than an alias. There
                      // is nothing to choose, and offering a select would silently
                      // turn a stated colour into a pointer.
                      <code>{declaration}</code>
                    ) : (
                      <Select
                        /* NAMED EXPLICITLY. A row header names a data cell, but it
                           does not name a CONTROL inside one — a select in a table
                           is unlabelled unless it says so itself. */
                        aria-label={`Rung for ${role}`}
                        value={current}
                        onChange={(event) =>
                          setOverride(
                            role,
                            // Written back in the SAME spelling it was read in, so
                            // re-pointing `scrim` keeps its alpha instead of turning
                            // a wash into an opaque block.
                            alpha === undefined
                              ? `var(${event.target.value})`
                              : `oklch(from var(${event.target.value}) l c h / ${alpha})`,
                          )
                        }
                        style={
                          overridden
                            ? { borderColor: 'var(--fm-color-primary)' }
                            : undefined
                        }
                      >
                        {families.map(([family, steps]) => (
                          <optgroup key={family} label={family}>
                            {steps.map((step) => (
                              <option
                                key={step}
                                value={`--fm-palette-${family}-${step}`}
                              >
                                {family}-{step}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </Select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
        <Button as={Link} to="/palette" variant="secondary">
          Back to the palette
        </Button>
        <Button as={Link} to="/review">
          Review and export
        </Button>
      </div>
    </section>
  );
}

const CELL = {
  textAlign: 'start',
  padding: 'var(--fm-space-inset-s)',
  borderBlockEnd: 'var(--fm-border-width-divider) solid var(--fm-color-border)',
  verticalAlign: 'top',
} as const;
