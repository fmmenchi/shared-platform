import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@fmmenchi/ui/button';
import { ColorPicker } from '@fmmenchi/ui/color-picker';
import { Field } from '@fmmenchi/ui/field';
import { Fieldset } from '@fmmenchi/ui/fieldset';
import { FieldsetContent } from '@fmmenchi/ui/fieldset-content';
import { FieldsetLegend } from '@fmmenchi/ui/fieldset-legend';
import { FormColorPicker } from '@fmmenchi/ui/form-color-picker';
import { FormErrorSummary } from '@fmmenchi/ui/form-error-summary';
import { Separator } from '@fmmenchi/ui/separator';
import { Heading } from '@fmmenchi/ui/heading';
import { RhfForm } from '@fmmenchi/ui-form-ports/react-hook-form';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';

import {
  FAMILIES,
  REFERENCE_BASES,
  REFERENCE_DARK_BASES,
  useBases,
} from '../../bases';
import { makeBasesSchema, type BasesValues } from '../../bases.schema';
import { useDeclarations } from '../../declarations';
import { stepPath } from '../../steps';

/**
 * STEP ONE — the FOURTEEN colours a brand hands over, as one form.
 *
 * FOURTEEN, AND THEY USED TO BE SEVEN HERE AND SEVEN ON STEP TWO. The dark set had
 * been put beside the palette it produces, and the reason was bad: it kept the
 * schema on this step from having to grow. A person then answered "what are your
 * brand colours" in two places, the second on a step named after something else.
 * They are one question, so they are one form — and step two shows what the ramps do
 * with them, which is a palette question.
 *
 * A FORM AND NOT FOURTEEN CONTROLS, because they fail as a SET: a base whose ramp
 * cannot carry its own button label is not a fact about one field, and it cannot be
 * checked as you type — it needs the whole set and a generated theme. So they are
 * checked on submit, which is also when a person has finished deciding. Both themes
 * are generated and both are validated, each against its own alias map and its own
 * ramp.
 *
 * TWO `<fieldset>`s WITH TWO LEGENDS, one per scheme. A screen reader announces the
 * legend before each field, so the dark `primary` is heard as "Dark, primary" rather
 * than as a second word "primary" with nothing to tell it from the first.
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
  const { bases, darkBases, setBases, setDarkBases, deriveFromLight } =
    useBases();
  const navigate = useNavigate();

  // The schema needs the contract the layout route read, so it is built here
  // rather than at module scope. Memoised on the contracts, which never change
  // within a session — so the resolver identity is stable and the form does not
  // re-register its fields on every render.
  const declared = useDeclarations();
  const darkDeclared = useDeclarations('dark');
  const schema = useMemo(
    () => makeBasesSchema(declared, darkDeclared, darkBases),
    [declared, darkDeclared, darkBases],
  );

  return (
    <section style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <Heading level={2}>Brand colours</Heading>

      <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
        Seven per theme, one per family. Each one becomes a whole ramp on the
        next step. The greys are not here: they are stated by the design system,
        because no single base can span white to near-black and still resolve
        the pale end.
      </p>

      <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
        The dark seven are <strong>suggested</strong> from the light ones — same
        hue, restated at lightness 0.75, keeping each one&rsquo;s share of the
        chroma sRGB allows there. Edit any of them: a brand with a real dark
        palette has colours of its own.
      </p>

      <RhfForm<BasesValues>
        options={{ defaultValues: bases, resolver: zodResolver(schema) }}
        onSubmit={(values) => {
          setBases(values);
          // `stepPath` AND NOT A LITERAL. This line said `/palette` and survived the
          // move of every step under `/steps/` — so submitting step one navigated to
          // a 404, and the walk-the-routes check did not see it because it visited
          // pages and never submitted a form.
          void navigate(stepPath('palette'));
        }}
        // THE BIGGER STEP BETWEEN REGIONS. At `stack-m` the two fieldsets and the
        // action row ran together as one undifferentiated pile — the legends are
        // small and carried the whole burden of separating fourteen pickers into
        // two groups. Seen only by looking at the page.
        style={{ display: 'grid', gap: 'var(--fm-space-stack-l)' }}
      >
        {/* FIRST, and it is where a person lands after a failed submit: a list of
            what went wrong, each item a link to the field. Rendered above the
            fieldsets rather than inside one, because it is about the form.

            THE DARK SEVEN ARE IN HERE TOO, and they are NOT form fields. They are
            store-backed, because the "re-derive" button beside them only means
            anything against live values and `FormColorPicker` omits `onChange` and
            `value` on purpose — winning them at a call site severs the binding
            rather than overriding it, which its own docs say to answer by composing
            the control and binding it yourself.

            INSIDE THE `<form>` ANYWAY, and an earlier version put them outside on
            the theory that a non-field has no business in a form. That was wrong
            twice: an unnamed control is not submitted by a browser at all, and RHF
            only knows what it registered — so nothing leaks. What it DID cost was
            the reading order, with "Check and continue" landing between the light
            group and the dark one. Seen only by looking at the page. */}
        <FormErrorSummary labelFor={(name) => name} />

        <Fieldset>
          <FieldsetLegend>Light</FieldsetLegend>
          <FieldsetContent orientation="horizontal">
            {FAMILIES.map((family) => (
              <FormColorPicker key={family} name={family} label={family} />
            ))}
          </FieldsetContent>
        </Fieldset>

        <Separator />

        <Fieldset>
          <FieldsetLegend>Dark</FieldsetLegend>
          <FieldsetContent orientation="horizontal">
            {FAMILIES.map((family) => (
              <Field key={family} label={family}>
                <ColorPicker
                  value={darkBases[family]}
                  onChange={(event) =>
                    setDarkBases({
                      ...darkBases,
                      [family]: event.currentTarget.value,
                    })
                  }
                />
              </Field>
            ))}
          </FieldsetContent>
        </Fieldset>

        <Separator />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--fm-space-inline-s)',
            alignItems: 'center',
          }}
        >
          <Button type="submit">Check and continue</Button>
          {/* NOT AUTOMATIC ON A LIGHT CHANGE, which was the first shape and is
              wrong: re-deriving on every edit would silently discard dark colours a
              person had typed. An explicit action is the only version that cannot
              lose work. */}
          <Button type="button" variant="secondary" onClick={deriveFromLight}>
            Re-derive the dark seven
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setBases(REFERENCE_BASES);
              setDarkBases(REFERENCE_DARK_BASES);
            }}
          >
            Back to the reference colours
          </Button>
        </div>
      </RhfForm>
    </section>
  );
}
