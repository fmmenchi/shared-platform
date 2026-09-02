import { zodResolver } from '@hookform/resolvers/zod';
import { generateTheme, validateTheme } from '@fmmenchi/theme';
import { Alert } from '@fmmenchi/ui/alert';
import { Button } from '@fmmenchi/ui/button';
import { Fieldset } from '@fmmenchi/ui/fieldset';
import { FieldsetContent } from '@fmmenchi/ui/fieldset-content';
import { FieldsetLegend } from '@fmmenchi/ui/fieldset-legend';
import { FormErrorSummary } from '@fmmenchi/ui/form-error-summary';
import { FormInput } from '@fmmenchi/ui/form-input';
import { Heading } from '@fmmenchi/ui/heading';
import { RhfForm } from '@fmmenchi/ui-form-ports/react-hook-form';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { useBases } from '../../bases';
import { useThemedDeclarations } from '../../role-overrides';
import { buildThemeFile } from '../../export-theme';
import { exportSchema, type ExportValues } from '../../export.schema';
import { useRamp } from '../../ramp';
import { useStepLink } from '../../steps';

/**
 * STEP FOUR — read what the theme measures, then hand it over.
 *
 * THE WIZARD'S JOB ENDS AT THE FILE. Generating a theme is the GENERATOR's job, and
 * it is invoked with the file:
 *
 *     npx nx g @fmmenchi/nx-theme-generator:theme <name> --from=./<name>.theme.json
 *
 * So there is no CSS written here. That is not a gap: a second renderer for the same
 * bytes would be two renderings of one decision, and the stylesheet a person
 * downloaded could then differ from the one installed in their repo — with nothing
 * failing. The generator validates before it writes, too, with the same function CI
 * runs, so the file is checked twice by one implementation rather than once by each
 * of two.
 *
 * WHAT IS SHOWN BEFORE IT IS OFFERED is the validator's verdict on the real theme.
 * Not a summary of the form — the whole theme, generated from these bases and run
 * through `validateTheme`. A wizard that hands over a file it never measured is
 * asking a person to find out from CI.
 */
export default function Review() {
  const stepLink = useStepLink();
  const { bases, darkBases } = useBases();
  // THE SHAPE CHOSEN ON STEP TWO, not the reference: the file a person downloads has
  // to be the theme they were shown.
  const { ramps } = useRamp();
  // THE RE-POINTED ones, or the export would quietly ignore step three.
  const declared = useThemedDeclarations();
  // THE DARK ALIAS MAP, unmodified. Step three's re-pointings are light-only — the
  // dark preset points its roles at different rungs (`-subtle` at the 1400 where
  // light's is at the 50), so a light override cannot be carried across without
  // meaning something else. Stated as a limitation below rather than half-applied.
  // THE RE-POINTED ones for dark too, since step three has a dark tab now: an
  // override settable and then ignored is worse than one that cannot be set.
  const darkDeclared = useThemedDeclarations('dark');
  const [downloaded, setDownloaded] = useState<string | null>(null);

  /**
   * The theme these bases produce, and what is wrong with it — computed here rather
   * than on submit, because it does not depend on the form: the name and the scheme
   * change the FILE, never the colours. A person should see the verdict before being
   * asked to name anything.
   */
  const verdict = useMemo(() => {
    try {
      const light = generateTheme(declared, bases, ramps.light);
      const dark = generateTheme(darkDeclared, darkBases, ramps.dark);
      return {
        violations: [
          ...validateTheme(light).map((v) => ({ ...v, scheme: 'light' })),
          ...validateTheme(dark).map((v) => ({ ...v, scheme: 'dark' })),
        ],
        error: null,
      };
    } catch (error) {
      return { violations: [], error: (error as Error).message };
    }
  }, [declared, darkDeclared, bases, darkBases, ramps]);

  const schema = useMemo(() => exportSchema, []);

  const passes = verdict.error === null && verdict.violations.length === 0;

  /**
   * TWO FILES, because a theme is two themes.
   *
   * The generator writes one `[data-theme]` block per invocation, which is the right
   * shape — light and dark ARE two blocks — so the handoff is two files and two
   * commands rather than one file the generator would have to learn a new key for.
   * Nothing in the plugin changes.
   *
   * Both from one gesture, which a browser may ask about once ("download multiple
   * files?"). The alternative was two buttons and a piece of state to remember which
   * had been pressed, for a pair a person always wants together.
   */
  const download = (values: ExportValues) => {
    const files = [
      [
        `${values.name}.theme.json`,
        buildThemeFile(declared, bases, ramps.light),
      ],
      [
        `${values.name}-dark.theme.json`,
        buildThemeFile(darkDeclared, darkBases, ramps.dark),
      ],
    ] as const;

    for (const [name, file] of files) {
      const blob = new Blob([`${JSON.stringify(file, null, 2)}\n`], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      URL.revokeObjectURL(url);
    }

    setDownloaded(values.name);
  };

  const savedName = downloaded;

  return (
    <section style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <Heading level={2}>Review and export</Heading>

      {verdict.error !== null && (
        <Alert variant="error">
          These bases do not make a theme. {verdict.error}
        </Alert>
      )}

      {verdict.error === null && verdict.violations.length > 0 && (
        <Alert variant="error">
          <p>
            {verdict.violations.length} problem
            {verdict.violations.length === 1 ? '' : 's'} in the generated theme.
            The generator refuses to write a theme that does not pass, so these
            have to be fixed on the earlier steps first.
          </p>
          {/* THE SCHEME IS SHOWN, and it has to be: the two themes are validated
              together, so a bare message leaves a person guessing which of the two
              files to fix — and `-subtle` failing in dark means a different rung
              from `-subtle` failing in light. The scheme was attached to each
              violation for this and then not printed, which is the same defect as
              not attaching it. */}
          <ul>
            {verdict.violations.slice(0, 8).map((violation, i) => (
              <li key={i}>
                <strong>{violation.scheme}</strong> — {violation.message}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {passes && (
        <Alert variant="success">
          <strong>Both themes pass.</strong> Every colour role is assigned in
          each, and every declared contrast pair clears its floor — measured
          with <code>validateTheme</code>, the same function CI runs and the
          generator runs before it writes.
        </Alert>
      )}

      <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
        <strong>Two files, one per theme.</strong> The generator writes one{' '}
        <code>[data-theme]</code> block per run and light and dark ARE two
        blocks, so the handoff is two files and two commands — and the dark one
        carries its own seven bases, its own seventeen rungs and its own role
        map, because a dark theme is not the light one inverted.
      </p>

      <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
        Each file carries <strong>declarations at every layer</strong> — the
        bases, every rung the ramp places under them, and every role still
        pointing at a rung — rather than the 84 finished colours. A file of
        finished colours is a photograph of a theme: the same pixels, with
        nothing left to recompute when somebody changes one base or re-points
        one role.
      </p>

      <RhfForm<ExportValues>
        options={{
          defaultValues: { name: 'acme' },
          resolver: zodResolver(schema),
        }}
        onSubmit={download}
        style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}
      >
        <FormErrorSummary labelFor={(name) => name} />

        <Fieldset>
          <FieldsetLegend>The theme to hand over</FieldsetLegend>
          <FieldsetContent>
            <FormInput
              name="name"
              label="Theme name"
              hint="Becomes the data-theme value and the file name. Lowercase, digits and dashes."
            />
          </FieldsetContent>
        </Fieldset>

        <div
          style={{
            display: 'flex',
            gap: 'var(--fm-space-inline-s)',
            alignItems: 'center',
          }}
        >
          <Button type="submit" disabled={!passes}>
            Download both theme files
          </Button>
          <Button as={Link} to={stepLink('roles')} variant="secondary">
            Back to the roles
          </Button>
        </div>
      </RhfForm>

      {downloaded !== null && (
        <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
          <Heading level={3}>Now install it</Heading>
          <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
            Run this where <code>@fmmenchi/tokens</code> is installed. The
            generator validates the declarations before writing anything, and
            wires a <code>validate-themes</code> target so the same check runs
            in your CI.
          </p>
          {/* WRAPPED ACROSS LINES, with the continuations a shell understands, because
              on one line it did not fit: `overflow-x: auto` let it scroll, so the page
              stayed honest — and the part a person most needs, `--from`, was the part
              off the right edge. A command they cannot read is a command they cannot
              run. Seen only by looking at the rendered page. */}
          <pre
            style={{
              overflowX: 'auto',
              padding: 'var(--fm-space-inset-m)',
              background: 'var(--fm-color-muted)',
              borderRadius: 'var(--fm-radius-md)',
            }}
          >
            <code>
              {`npx nx g @fmmenchi/nx-theme-generator:theme ${savedName} \\
  --project=<your-app> \\
  --scheme=light \\
  --from=./${savedName}.theme.json

npx nx g @fmmenchi/nx-theme-generator:theme ${savedName}-dark \\
  --project=<your-app> \\
  --scheme=dark \\
  --from=./${savedName}-dark.theme.json`}
            </code>
          </pre>
        </div>
      )}
    </section>
  );
}
