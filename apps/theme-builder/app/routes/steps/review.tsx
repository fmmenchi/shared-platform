import { zodResolver } from '@hookform/resolvers/zod';
import { generateTheme, validateTheme } from '@fmmenchi/theme';
import { Alert } from '@fmmenchi/ui/alert';
import { Button } from '@fmmenchi/ui/button';
import { Fieldset } from '@fmmenchi/ui/fieldset';
import { FieldsetContent } from '@fmmenchi/ui/fieldset-content';
import { FieldsetLegend } from '@fmmenchi/ui/fieldset-legend';
import { FormErrorSummary } from '@fmmenchi/ui/form-error-summary';
import { FormInput } from '@fmmenchi/ui/form-input';
import { FormSegmentedControl } from '@fmmenchi/ui/form-segmented-control';
import { Heading } from '@fmmenchi/ui/heading';
import { SegmentedControlItem } from '@fmmenchi/ui/segmented-control-item';
import { RhfForm } from '@fmmenchi/ui-form-ports/react-hook-form';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { useBases } from '../../bases';
import { useDeclarations } from '../../declarations';
import { buildThemeFile } from '../../export-theme';
import { exportSchema, type ExportValues } from '../../export.schema';
import { WIZARD_RAMP } from '../../ramp';

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
  const { bases } = useBases();
  const declared = useDeclarations();
  const [downloaded, setDownloaded] = useState<string | null>(null);

  /**
   * The theme these bases produce, and what is wrong with it — computed here rather
   * than on submit, because it does not depend on the form: the name and the scheme
   * change the FILE, never the colours. A person should see the verdict before being
   * asked to name anything.
   */
  const verdict = useMemo(() => {
    try {
      const theme = generateTheme(declared, bases, WIZARD_RAMP);
      return { theme, violations: validateTheme(theme), error: null };
    } catch (error) {
      return { theme: null, violations: [], error: (error as Error).message };
    }
  }, [declared, bases]);

  const schema = useMemo(() => exportSchema, []);

  const passes = verdict.error === null && verdict.violations.length === 0;

  const download = (values: ExportValues) => {
    const file = buildThemeFile(declared, bases, WIZARD_RAMP);
    const name = `${values.name}.theme.json`;

    // The scheme rides along for the person to pass to the generator; the file's own
    // contract is `declarations`, which the generator reads and nothing else.
    const blob = new Blob([`${JSON.stringify(file, null, 2)}\n`], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);

    setDownloaded(`${values.name}|${values.scheme}`);
  };

  const [savedName, savedScheme] = (downloaded ?? '').split('|');

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
          <ul>
            {verdict.violations.slice(0, 8).map((violation, i) => (
              <li key={i}>{violation.message}</li>
            ))}
          </ul>
        </Alert>
      )}

      {passes && (
        <Alert variant="success">
          Every colour role is assigned and every declared contrast pair clears
          its floor — measured with <code>validateTheme</code>, the same
          function CI runs and the generator runs before it writes.
        </Alert>
      )}

      <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
        The file carries <strong>declarations at every layer</strong> — your
        seven bases, every rung the ramp places under them, and every role still
        pointing at a rung — rather than the 84 finished colours. A file of
        finished colours is a photograph of a theme: the same pixels, with
        nothing left to recompute when somebody changes one base or re-points
        one role.
      </p>

      <RhfForm<ExportValues>
        options={{
          defaultValues: { name: 'acme', scheme: 'light' },
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

            <FormSegmentedControl
              name="scheme"
              label="Colour scheme"
              hint="What the browser paints its own controls from — a select's popup, a native checkbox. It reads nothing from the roles, so a dark theme claiming light ships white native lists."
            >
              <SegmentedControlItem value="light">Light</SegmentedControlItem>
              <SegmentedControlItem value="dark">Dark</SegmentedControlItem>
            </FormSegmentedControl>
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
            Download the theme file
          </Button>
          <Button as={Link} to="/roles" variant="secondary">
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
  --scheme=${savedScheme} \\
  --from=./${savedName}.theme.json`}
            </code>
          </pre>
        </div>
      )}
    </section>
  );
}
