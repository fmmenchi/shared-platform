import { Alert } from '@fmmenchi/ui/alert';
import { Button } from '@fmmenchi/ui/button';
import { Heading } from '@fmmenchi/ui/heading';
import { Link } from 'react-router';

/**
 * STEP THREE — pointing the 84 semantic roles at rungs.
 *
 * NOT BUILT, and the page says so rather than pretending. What it needs is the step
 * `generatePalette` has and this does not: a function taking a palette and returning
 * a complete `Theme`. One was written and reverted — for having no caller, and for
 * putting the role-to-rung mapping in a second place beside the eighty-four `var()`
 * lines already in `vars.css`. This page is the caller it was missing; the
 * duplication is the part still to solve.
 */
export default function Roles() {
  return (
    <section style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <Heading level={2}>Semantic roles</Heading>

      <Alert>
        Not built yet. This step points each of the 84 roles at a rung of your
        palette — the fill of a button, the wash behind an alert, the ring on a
        focused field — and checks every declared pair against its contrast
        floor as it goes.
      </Alert>

      <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
        The palette on the previous step is real: those colours are generated
        from your bases. What is missing is the mapping, and it is missing on
        purpose. The first attempt kept a copy of the role-to-rung table in
        TypeScript beside the one that already lives in the design
        system&rsquo;s stylesheet, and two copies of one decision is worse than
        a step that is honestly absent.
      </p>

      <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
        <Button as={Link} to="/palette">
          Back to the palette
        </Button>
        <Button as={Link} to="/review">
          Skip to review
        </Button>
      </div>
    </section>
  );
}
