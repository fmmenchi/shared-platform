import { Button } from '@fmmenchi/ui/button';
import { ColorPicker } from '@fmmenchi/ui/color-picker';
import { Field } from '@fmmenchi/ui/field';
import { FieldLabel } from '@fmmenchi/ui/field-label';
import { Heading } from '@fmmenchi/ui/heading';
import { Link } from 'react-router';

import { FAMILIES, REFERENCE_BASES, useBases } from '../../bases';

/**
 * STEP ONE — the seven colours a brand hands over.
 *
 * One `ColorPicker` per palette family, from `PALETTE_FAMILIES` rather than a typed
 * list, so this page cannot fall behind the contract. Seven and not eight: the greys
 * are stated rather than derived (ADR-0032), so the neutral ramp is the design
 * system's and not a brand's to choose.
 *
 * The pickers are UNCONTROLLED in the React sense — `defaultValue` plus `onChange`,
 * never `value`. The browser paints this control, so the DOM owns its state; mirroring
 * it into React would break `form.reset()`, which is measured in the design system's
 * own suite. What the app keeps is a copy for the palette to read, not the truth.
 */
export default function Colours() {
  const { bases, setBase, reset } = useBases();
  const changed = FAMILIES.some(
    (family) => bases[family] !== REFERENCE_BASES[family],
  );

  return (
    <section style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <Heading level={2}>Brand colours</Heading>

      <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
        Seven colours, one per family. Each one becomes a whole ramp on the next
        step. The greys are not here: they are stated by the design system,
        because no single base can span white to near-black and still resolve
        the pale end.
      </p>

      <div
        style={{
          display: 'grid',
          gap: 'var(--fm-space-inline-m)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))',
        }}
      >
        {FAMILIES.map((family) => (
          <Field key={family}>
            <FieldLabel>{family}</FieldLabel>
            <ColorPicker
              name={family}
              defaultValue={bases[family]}
              onChange={(event) => setBase(family, event.currentTarget.value)}
            />
          </Field>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 'var(--fm-space-inline-s)',
          alignItems: 'center',
        }}
      >
        <Button as={Link} to="/palette">
          See the palette
        </Button>
        {changed ? (
          <Button variant="secondary" onClick={reset}>
            Back to the reference colours
          </Button>
        ) : null}
      </div>
    </section>
  );
}
