import { Alert } from '@fmmenchi/ui/alert';
import { Button } from '@fmmenchi/ui/button';
import { Heading } from '@fmmenchi/ui/heading';
import { Link } from 'react-router';

/**
 * STEP FOUR — read the theme, then export it.
 *
 * NOT BUILT. What it will write is the handoff file the Nx generator already reads:
 * `{ "declarations": { "--fm-*": "<value>", … } }` — DECLARATIONS at every layer
 * rather than the 84 finished colours, so a consumer's theme keeps the derivation
 * ours has instead of being a photograph of it. `--from` landed before this page did,
 * which is the right order: the reader of a format is easier to get right than its
 * writer, and it pinned the shape.
 */
export default function Review() {
  return (
    <section style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <Heading level={2}>Review and export</Heading>

      <Alert>
        Not built yet. This step shows every declared contrast pair with its
        measured ratio, then writes the file the generator installs.
      </Alert>

      <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
        The export side of the pipeline exists already:{' '}
        <code>
          nx g @fmmenchi/nx-theme-generator:theme acme --from=./brand.json
        </code>{' '}
        reads a theme&rsquo;s declarations, validates them with the same
        function CI runs, and writes the preset — refusing to write anything if
        the theme would not pass. What is missing here is the file, and the step
        above that produces the theme to put in it.
      </p>

      <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
        <Button as={Link} to="/roles">
          Back to the roles
        </Button>
        <Button as={Link} to="/preview">
          See the preview
        </Button>
      </div>
    </section>
  );
}
