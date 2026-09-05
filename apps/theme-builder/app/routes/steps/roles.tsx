import {
  colorVar,
  generatePalette,
  generateTheme,
  validateTheme,
  type ColorRole,
} from '@fmmenchi/theme';
import { Alert } from '@fmmenchi/ui/alert';
import { Button } from '@fmmenchi/ui/button';
import { Heading } from '@fmmenchi/ui/heading';
import { Combobox } from '@fmmenchi/ui/combobox';
import { wcagContrast } from 'culori';
import { useMemo } from 'react';
import { Link } from 'react-router';

import { useBases } from '../../bases';
import { useEditingScheme } from '../../editing-scheme';
import { useDeclarations, type Scheme } from '../../declarations';
import { useRamp } from '../../ramp';
import { ROLE_GROUPS, UNGROUPED_PAIRS } from '../../role-groups';
import { useStepLink } from '../../steps';
import {
  homeFamilyOf,
  orderRungOptions,
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
  const [scheme] = useEditingScheme();
  return (
    <section style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <Heading level={2}>Semantic roles</Heading>

      <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
        A role exists to be one half of a pairing: a fill something sits on, or
        the something. Each pair below shows a real sample, the contrast it
        measures and the floor it has to clear — the same numbers CI checks.
        Move a role to another rung and watch its pairs move with it.
      </p>

      {/* ONE PANEL, NOT BOTH. `TabPanel` stays mounted and goes `hidden` — the
          APG's shape, and right for tabs — which meant this step rendered 168
          comboboxes to show 84. A radio group has no such obligation: the theme
          you are not editing is not on the page. */}
      <RolesPanel scheme={scheme} />
    </section>
  );
}

function RolesPanel({ scheme }: { readonly scheme: Scheme }) {
  const stepLink = useStepLink();
  const { bases, darkBases } = useBases();
  const theBases = scheme === 'dark' ? darkBases : bases;
  const declared = useThemedDeclarations(scheme);
  // THE DESIGN SYSTEM'S OWN declarations too, not just the re-pointed ones: a role's
  // menu is ordered by the family it STARTS in, and that must not move when a person
  // re-points it — a menu that reshuffled under the choice just made would be worse
  // than one with no order at all.
  const pristine = useDeclarations(scheme);
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

  /**
   * EVERY RUNG'S COLOUR, so the menu can show them and not just name them.
   *
   * Computed rather than read off a `var()`: this step is the wizard's CHROME, which
   * renders on the reference theme, so `var(--fm-palette-secondary-600)` here would
   * paint the design system's blue and not the secondary somebody is building. The
   * swatch beside each role already resolves this way; the menu now does too.
   *
   * The same `try` as the theme above, for the same reason — `generatePalette` throws
   * on a base that is not a colour, which is a hole the earlier steps report, and a
   * throw here would take down the page where a person would go to fix it.
   */
  const palette = useMemo(() => {
    try {
      return generatePalette(theBases, ramps[scheme]);
    } catch {
      return {} as ReturnType<typeof generatePalette>;
    }
  }, [theBases, ramps, scheme]);

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
            pristine={pristine}
            overrides={overrides}
            setOverride={setOverride}
            families={families}
            palette={palette}
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
        <Button as={Link} to={stepLink('palette')} variant="secondary">
          Back to the palette
        </Button>
        <Button as={Link} to={stepLink('review')}>
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

/**
 * A colour, one square centimetre of it. `aria-hidden` because it is never the only
 * statement of what it shows: beside a role the name is right there, and inside a
 * menu row the label says `secondary-600`. A swatch that announced itself would read
 * the same fact twice.
 *
 * Extracted when the menu grew swatches of its own — two copies of a bordered square
 * would be two places to change the border the day it changes.
 */
function Swatch({ colour }: { readonly colour: string | undefined }) {
  return (
    <span
      aria-hidden="true"
      style={{
        inlineSize: '1rem',
        blockSize: '1rem',
        flexShrink: 0,
        borderRadius: 'var(--fm-radius-sm)',
        border: 'var(--fm-border-width-default) solid var(--fm-color-border)',
        background: colour ?? 'transparent',
      }}
    />
  );
}

/**
 * One combobox per role: where it points, and everywhere it could.
 *
 * EVERYWHERE, IN THE ORDER THIS ROLE READS IT. The menu offers every family — a role
 * legitimately points outside its own, every `-foreground` being `neutral-0` — but it
 * used to list them alphabetically, so `primary`'s own rungs sat under `accent`,
 * `info`, `negative` and `neutral`. `orderRungOptions` puts the family the role starts
 * in first and `neutral` second; nothing is filtered. "Starts in" is read off
 * `pristine`, the design system's declaration, so re-pointing a role does not
 * reshuffle the menu under the choice just made.
 */
function Knobs({
  roles,
  theme,
  declared,
  pristine,
  overrides,
  setOverride,
  families,
  palette,
}: {
  roles: readonly ColorRole[];
  theme: Record<string, string>;
  declared: ReadonlyMap<string, string>;
  pristine: ReadonlyMap<string, string>;
  overrides: Readonly<Record<string, string>>;
  setOverride: (role: ColorRole, rung: string) => void;
  families: ReadonlyArray<readonly [string, readonly string[]]>;
  palette: Readonly<Record<string, Readonly<Record<number, string>>>>;
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
        // FLAT, because `Combobox` takes one list and draws no group headers. What
        // `rung-options.spec.ts` actually holds is the ORDER — the role's home family
        // first, `neutral` second, the rest alphabetical — and that survives
        // flattening intact; only the `<optgroup>` captions go, and every label
        // already names its family.
        const options = orderRungOptions(
          families,
          homeFamilyOf(pristine.get(colorVar(role))),
        ).flatMap(([family, steps]) =>
          steps.map((step) => {
            const token = `--fm-palette-${family}-${step}`;
            return {
              token,
              label: `${family}-${step}`,
              // TWO SOURCES, because the rungs have two origins. The seven brand
              // families are GENERATED from the bases somebody is editing, so they
              // must come from the palette. `neutral` is not generated — it is not
              // even a `PALETTE_FAMILIES` member — it is stated outright in
              // `vars.css`, the same greys in both schemes, so it comes from the
              // declarations. Reading only the palette left all 35 neutral rungs
              // `undefined`, which the swatch rendered as `transparent`: 35 empty
              // outlines in a menu whose whole point is showing the colour.
              colour: palette[family]?.[Number(step)] ?? pristine.get(token),
            };
          }),
        );

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
            <Swatch colour={colour} />
            <span style={{ display: 'grid', gap: '0.125rem' }}>
              <code style={{ fontSize: 'var(--fm-text-xs)' }}>{role}</code>
              {current === '' ? (
                // Stating a colour outright is legitimate — a hand-written preset
                // does it — and offering a select would silently turn a stated
                // colour into a pointer.
                <code style={{ fontSize: 'var(--fm-text-xs)' }}>{flat}</code>
              ) : (
                <Combobox
                  items={options}
                  getKey={(option) => option.token}
                  getLabel={(option) => option.label}
                  renderItem={(option) => (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--fm-space-inline-s)',
                      }}
                    >
                      <Swatch colour={option.colour} />
                      {option.label}
                    </span>
                  )}
                  value={current}
                  onValueChange={(next) => {
                    // `null` is the cleared state, and a role always points
                    // somewhere: nothing to write, and writing `var()` would be a
                    // declaration that resolves to nothing.
                    if (next === null) return;
                    setOverride(
                      role,
                      alpha === undefined
                        ? `var(${next})`
                        : `oklch(from var(${next}) l c h / ${alpha})`,
                    );
                  }}
                  style={
                    overridden
                      ? { borderColor: 'var(--fm-color-primary)' }
                      : undefined
                  }
                />
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
