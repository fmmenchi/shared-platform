import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@fmmenchi/ui/button';
import { Fieldset } from '@fmmenchi/ui/fieldset';
import { FieldsetContent } from '@fmmenchi/ui/fieldset-content';
import { FieldsetLegend } from '@fmmenchi/ui/fieldset-legend';
import { FormColorPicker } from '@fmmenchi/ui/form-color-picker';
import { FormErrorSummary } from '@fmmenchi/ui/form-error-summary';
import { Heading } from '@fmmenchi/ui/heading';
import { RhfForm } from '@fmmenchi/ui-form-ports/react-hook-form';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';

import { FAMILIES, REFERENCE_BASES, useBases } from '../../bases';
import { makeBasesSchema, type BasesValues } from '../../bases.schema';
import { useDeclarations } from '../../declarations';

/**
 * STEP ONE — the seven colours a brand hands over, as a form.
 *
 * A FORM AND NOT SEVEN CONTROLS, because the seven are one question and answering
 * it can fail as a set: two families a person could not tell apart, or a base whose
 * ramp cannot carry its own button label. Neither is a fact about one field, and
 * neither can be checked as you type — they need all seven and a generated theme.
 * So they are checked on submit, which is also when a person has finished deciding.
 *
 * ONE `<fieldset>` WITH ONE LEGEND, for the same reason: seven brand colours are
 * not seven questions. A screen reader announces the legend before each field, so
 * "primary" is heard as "Brand colours, primary" rather than as a word on its own.
 *
 * NOTHING HERE NAMES REACT-HOOK-FORM except `RhfForm` and the resolver — the fields
 * are the design system's bound components, and the binding was given once in
 * `root.tsx`. Swapping the library is those two lines.
 *
 * The store is written on SUBMIT rather than on change, and that is the honest
 * shape: the palette on the next step is derived from bases that passed, so a
 * half-typed colour never reaches it. `defaultValues` comes from the store, so
 * walking back to this step shows what was accepted.
 */
export default function Colours() {
  const { bases, setBases } = useBases();
  const navigate = useNavigate();

  // The schema needs the contract the layout route read, so it is built here
  // rather than at module scope. Memoised on the contract, which never changes
  // within a session — so the resolver identity is stable and the form does not
  // re-register its fields on every render.
  const declared = useDeclarations();
  const schema = useMemo(() => makeBasesSchema(declared), [declared]);

  return (
    <section style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <Heading level={2}>Brand colours</Heading>

      <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
        Seven colours, one per family. Each one becomes a whole ramp on the next
        step. The greys are not here: they are stated by the design system,
        because no single base can span white to near-black and still resolve
        the pale end.
      </p>

      <RhfForm<BasesValues>
        options={{ defaultValues: bases, resolver: zodResolver(schema) }}
        onSubmit={(values) => {
          setBases(values);
          void navigate('/palette');
        }}
        style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}
      >
        {/* FIRST, and it is where a person lands after a failed submit: a list of
            what went wrong, each item a link to the field. Rendered above the
            fieldset rather than inside it, because it is about the form. */}
        <FormErrorSummary labelFor={(name) => name} />

        <Fieldset>
          <FieldsetLegend>Brand colours</FieldsetLegend>
          <FieldsetContent orientation="horizontal">
            {FAMILIES.map((family) => (
              <FormColorPicker key={family} name={family} label={family} />
            ))}
          </FieldsetContent>
        </Fieldset>

        <div
          style={{
            display: 'flex',
            gap: 'var(--fm-space-inline-s)',
            alignItems: 'center',
          }}
        >
          <Button type="submit">Check and continue</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setBases(REFERENCE_BASES)}
          >
            Back to the reference colours
          </Button>
        </div>
      </RhfForm>
    </section>
  );
}
