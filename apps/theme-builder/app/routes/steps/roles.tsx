import {
  colorVar,
  generateTheme,
  validateTheme,
  type ColorRole,
} from '@fmmenchi/theme';
import { Alert } from '@fmmenchi/ui/alert';
import { Button } from '@fmmenchi/ui/button';
import { Heading } from '@fmmenchi/ui/heading';
import { Tab } from '@fmmenchi/ui/tab';
import { TabList } from '@fmmenchi/ui/tab-list';
import { TabPanel } from '@fmmenchi/ui/tab-panel';
import { Tabs } from '@fmmenchi/ui/tabs';
import { Select } from '@fmmenchi/ui/select';
import { wcagContrast } from 'culori';
import { useMemo } from 'react';
import { Link } from 'react-router';

import { useBases } from '../../bases';
import type { Scheme } from '../../declarations';
import { useRamp } from '../../ramp';
import { ROLE_GROUPS, UNGROUPED_PAIRS } from '../../role-groups';
import { stepPath } from '../../steps';
import {
  useRoleOverrides,
  useRungOptions,
  useThemedDeclarations,
} from '../../role-overrides';

/**
 * STEP THREE — what each pairing guarantees, and the knob under it.
 *
 * IT WAS A FLAT TABLE OF 84 ROWS and that was wrong twice. Read-only first, which
 * made the step pointless — being able to change the semantic colours is the whole
 * reason it exists. Then changeable but undifferentiated: 84 rows in one list, where
 * nothing said which roles belonged together and nothing said what a role was FOR.
 *
 * A ROLE'S PURPOSE IS THE PAIRING IT APPEARS IN. `primary` exists to be a fill that
 * `primary-foreground` sits on, and the only interesting question about re-pointing
 * it is whether that pair still clears its floor. So the pairs are the subject here
 * and the roles are the controls: each declared pair gets a row with a REAL sample —
 * the foreground's text on the background's fill — its measured ratio and the floor
 * it must clear.
 *
 * THE RATIO IS THE SAME FUNCTION THE GATE USES. `validateTheme` computes it with
 * culori's `wcagContrast`, and so does this — the same call, not a second
 * implementation. The floors come from `CONTRAST_PAIRS`, so a pair added to the
 * contract appears here with no edit. What is shown is therefore what CI will say,
 * and `roles.spec.ts` asserts the two agree.
 *
 * GROUPED BY THE CONTRACT'S OWN PARTITION — see `role-groups.ts`. Not by categories
 * invented here, which would need keeping in step with a contract that already has
 * them.
 */
/**
 * STEP THREE — every role, in a tab per theme.
 *
 * IT SHOWED LIGHT ONLY, which made it the odd step out once steps one and two became
 * a tab per theme — and the gap was not cosmetic. The two themes point their roles at
 * different rungs, so the pairs a person needs to SEE measured are different: dark's
 * `-subtle` is the 1400 against a light foreground, light's is the 50 against a dark
 * one. A page that showed one of them was hiding half the theme it was about to hand
 * over.
 *
 * EACH PANEL IS ENTIRELY ITS OWN — its overrides, its rung options, its measured
 * ratios. The rung options especially: light declares eleven steps per chromatic
 * family and dark seventeen, so offering one scale's menu for the other theme's role
 * would let somebody point at a rung that does not exist there.
 */
export default function Roles() {
  return (
    <section style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <Heading level={2}>Semantic roles</Heading>

      <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
        A role exists to be one half of a pairing: a fill something sits on, or
        the something. Each pair below shows a real sample, the contrast it
        measures and the floor it has to clear — the same numbers CI checks.
        Move a role to another rung and watch its pairs move with it.
      </p>

      <Tabs defaultValue="light">
        <TabList aria-label="Theme">
          <Tab value="light">Light</Tab>
          <Tab value="dark">Dark</Tab>
        </TabList>
        <TabPanel value="light">
          <RolesPanel scheme="light" />
        </TabPanel>
        <TabPanel value="dark">
          <RolesPanel scheme="dark" />
        </TabPanel>
      </Tabs>
    </section>
  );
}

function RolesPanel({ scheme }: { readonly scheme: Scheme }) {
  const { bases, darkBases } = useBases();
  const theBases = scheme === 'dark' ? darkBases : bases;
  const declared = useThemedDeclarations(scheme);
  const { overrides, setOverride, reset, count } = useRoleOverrides(scheme);
  const { ramps } = useRamp();
  const families = useRungOptions(scheme);

  const { theme, violations } = useMemo(() => {
    try {
      const generated = generateTheme(declared, theBases, ramps[scheme]);
      return { theme: generated, violations: validateTheme(generated) };
    } catch {
      // A hole the earlier steps report in detail. The groups still render, because
      // this is where a person would fix it.
      return { theme: {} as Record<string, string>, violations: [] };
    }
  }, [declared, theBases, ramps, scheme]);

  const failing = useMemo(
    () =>
      new Set(
        violations.flatMap((violation) =>
          violation.pair ? [violation.pair.join(' × ')] : [],
        ),
      ),
    [violations],
  );

  return (
    <section style={{ display: 'grid', gap: 'var(--fm-space-stack-l)' }}>
      <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
        <div
          style={{
            display: 'flex',
            gap: 'var(--fm-space-inline-s)',
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'var(--fm-color-muted-foreground)' }}>
            {count === 0
              ? 'Every role is on the design system’s default rung.'
              : `${count} role${count === 1 ? '' : 's'} re-pointed.`}
          </span>
          {count > 0 && (
            <Button variant="secondary" onClick={reset}>
              Put them all back
            </Button>
          )}
        </div>

        {violations.length > 0 && (
          <Alert variant="error">
            {violations.length} pair
            {violations.length === 1 ? '' : 's'} below the floor. The export
            step refuses to hand over a theme that does not pass — the failing
            rows are marked below.
          </Alert>
        )}
      </div>

      {ROLE_GROUPS.map((group) => (
        <section
          key={group.title}
          style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}
        >
          <Heading level={3}>{group.title}</Heading>
          <p
            style={{
              maxWidth: 'var(--fm-size-prose)',
              color: 'var(--fm-color-muted-foreground)',
            }}
          >
            {group.note}
          </p>

          {group.pairs.length === 0 ? (
            <p style={{ color: 'var(--fm-color-muted-foreground)' }}>
              No pairing is declared on these as a background — they are used as
              foregrounds, borders or fills elsewhere.
            </p>
          ) : (
            <Pairs
              pairs={group.pairs}
              theme={theme}
              failing={failing}
              declared={declared}
            />
          )}

          <Knobs
            roles={group.roles}
            theme={theme}
            declared={declared}
            overrides={overrides}
            setOverride={setOverride}
            families={families}
          />
        </section>
      ))}

      {UNGROUPED_PAIRS.length > 0 && (
        <Alert variant="error">
          {UNGROUPED_PAIRS.length} declared pairs belong to no group — the
          grouping has fallen out of step with the contract.
        </Alert>
      )}

      <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
        <Button as={Link} to={stepPath('palette')} variant="secondary">
          Back to the palette
        </Button>
        <Button as={Link} to={stepPath('review')}>
          Review and export
        </Button>
      </div>
    </section>
  );
}

/** The declared pairings of one group, each shown as the thing it describes. */
function Pairs({
  pairs,
  theme,
  failing,
  declared,
}: {
  pairs: ReadonlyArray<readonly [ColorRole, ColorRole, number]>;
  theme: Record<string, string>;
  failing: ReadonlySet<string>;
  declared: ReadonlyMap<string, string>;
}) {
  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th scope="col" style={CELL}>
            Pairing
          </th>
          <th scope="col" style={CELL}>
            As it reads
          </th>
          <th scope="col" style={{ ...CELL, textAlign: 'end' }}>
            Measured
          </th>
          <th scope="col" style={{ ...CELL, textAlign: 'end' }}>
            Floor
          </th>
        </tr>
      </thead>
      <tbody>
        {pairs.map(([bg, fg, minimum]) => {
          const background = theme[bg];
          const foreground = theme[fg];
          const ratio =
            background && foreground
              ? wcagContrast(background, foreground)
              : undefined;
          // The gate's verdict, not a second opinion: `-disabled` pairs are exempt
          // (WCAG 1.4.3) and never appear in `violations`, so a row can be under its
          // floor and still be allowed — which is why the badge follows the gate.
          const failed = failing.has(`${bg} × ${fg}`);

          return (
            <tr key={`${bg}-${fg}`}>
              <th scope="row" style={{ ...CELL, fontWeight: 'inherit' }}>
                <code>{bg}</code>
                <span aria-hidden="true"> × </span>
                <code>{fg}</code>
                <span style={VISUALLY_HIDDEN}> on </span>
              </th>
              <td style={CELL}>
                {/* THE REAL THING, at body size: the foreground's text on the
                    background's fill. A number says whether it passes; this says
                    what it looks like, which is the question a person actually has.
                    `aria-hidden` because the ratio beside it is the fact, and the
                    words are a specimen rather than content. */}
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--fm-radius-sm)',
                    background: background ?? 'transparent',
                    color: foreground ?? 'inherit',
                    border:
                      'var(--fm-border-width-default) solid var(--fm-color-border)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Salva Aa
                </span>
              </td>
              <td
                style={{
                  ...CELL,
                  textAlign: 'end',
                  fontVariantNumeric: 'tabular-nums',
                  color: failed ? 'var(--fm-color-error)' : undefined,
                  fontWeight: failed ? 'var(--fm-font-weight-bold)' : undefined,
                }}
              >
                {ratio === undefined ? '—' : `${ratio.toFixed(2)}:1`}
                {failed ? ' ✗' : ' ✓'}
              </td>
              <td
                style={{
                  ...CELL,
                  textAlign: 'end',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--fm-color-muted-foreground)',
                }}
              >
                {minimum.toFixed(1)}:1
                <span style={VISUALLY_HIDDEN}>
                  {' '}
                  {declared.has(colorVar(bg)) ? '' : 'undeclared'}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** One select per role: where it points, and everywhere it could. */
function Knobs({
  roles,
  theme,
  declared,
  overrides,
  setOverride,
  families,
}: {
  roles: readonly ColorRole[];
  theme: Record<string, string>;
  declared: ReadonlyMap<string, string>;
  overrides: Readonly<Record<string, string>>;
  setOverride: (role: ColorRole, rung: string) => void;
  families: ReadonlyArray<readonly [string, readonly string[]]>;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(19rem, 1fr))',
        gap: 'var(--fm-space-inline-s) var(--fm-space-inline-m)',
      }}
    >
      {roles.map((role) => {
        const declaration = declared.get(colorVar(role)) ?? '';
        const flat = declaration.replace(/\s+/g, ' ');
        const plain = /^var\((--fm-palette-[a-z]+-\d+)\)$/.exec(flat);
        const withAlpha =
          /^oklch\(\s*from\s+var\((--fm-palette-[a-z]+-\d+)\)\s+l\s+c\s+h\s*\/\s*([0-9.]+)\s*\)$/.exec(
            flat,
          );
        const current = plain?.[1] ?? withAlpha?.[1] ?? '';
        const alpha = withAlpha?.[2];
        const overridden = overrides[colorVar(role)] !== undefined;
        const colour = theme[role];

        return (
          <label
            key={role}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              alignItems: 'center',
              gap: 'var(--fm-space-inline-s)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                inlineSize: '1rem',
                blockSize: '1rem',
                borderRadius: 'var(--fm-radius-sm)',
                border:
                  'var(--fm-border-width-default) solid var(--fm-color-border)',
                background: colour ?? 'transparent',
              }}
            />
            <span style={{ display: 'grid', gap: '0.125rem' }}>
              <code style={{ fontSize: 'var(--fm-text-xs)' }}>{role}</code>
              {current === '' ? (
                // Stating a colour outright is legitimate — a hand-written preset
                // does it — and offering a select would silently turn a stated
                // colour into a pointer.
                <code style={{ fontSize: 'var(--fm-text-xs)' }}>{flat}</code>
              ) : (
                <Select
                  value={current}
                  onChange={(event) =>
                    setOverride(
                      role,
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
            </span>
          </label>
        );
      })}
    </div>
  );
}

const CELL = {
  textAlign: 'start',
  padding: 'var(--fm-space-inset-s)',
  borderBlockEnd: 'var(--fm-border-width-divider) solid var(--fm-color-border)',
  verticalAlign: 'middle',
} as const;

/** The label a sighted reader gets from layout and a screen reader does not. */
const VISUALLY_HIDDEN = {
  position: 'absolute',
  inlineSize: '1px',
  blockSize: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;
