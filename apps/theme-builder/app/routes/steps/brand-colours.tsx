import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@fmmenchi/ui/button';
import { ColorPicker } from '@fmmenchi/ui/color-picker';
import { Field } from '@fmmenchi/ui/field';
import { FieldsetContent } from '@fmmenchi/ui/fieldset-content';
import { FormColorPicker } from '@fmmenchi/ui/form-color-picker';
import { FormErrorSummary } from '@fmmenchi/ui/form-error-summary';
import { Heading } from '@fmmenchi/ui/heading';
import { Separator } from '@fmmenchi/ui/separator';
import { RhfForm, useRhfErrors } from '@fmmenchi/ui-form-ports/react-hook-form';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';

import { FAMILIES, useBases } from '../../bases';
import { useEditingScheme } from '../../editing-scheme';
import { makeBasesSchema, type BasesValues } from '../../bases.schema';
import { useDeclarations } from '../../declarations';
import { BackToReference, LiveBases } from '../../live-bases';
import { useStepLink } from '../../steps';

/**
 * STEP ONE — the fourteen colours a brand hands over, ONE TAB PER THEME.
 *
 * FOURTEEN, AND THEY USED TO BE SEVEN HERE AND SEVEN ON STEP TWO. The dark set had
 * been put beside the palette it produces, and the reason was bad: it kept this
 * step's schema from having to grow. A person then answered "what are your brand
 * colours" in two places, the second on a step named after something else.
 *
 * TABS FOR THE SAME REASON STEP TWO HAS THEM: the two schemes are the same question
 * asked twice, and a tab is what says "everything in here is about this one". As two
 * stacked fieldsets they were a pile that two small legends had to hold apart.
 *
 * THE PANELS CARRY NO `<fieldset>`, and that is not an omission. A tab panel IS the
 * group — the APG has it labelled by its own tab — so a fieldset inside would add a
 * legend saying "Light" under a tab already called "Light", announced twice for one
 * grouping.
 *
 * THEY FAIL AS A SET, which is why this is a form and not fourteen controls: a base
 * whose ramp cannot carry its own button label is not a fact about one field, and it
 * cannot be checked as you type. So it is checked on submit, and BOTH themes are
 * generated and validated then, each against its own alias map and its own ramp.
 *
 * BUT THE STORE SEES EVERY EDIT. The light seven used to reach it on submit only, and
 * that left the step half committed and half live: the dark seven — store-backed —
 * could not follow a light edit until you continued, and the preview rail could not
 * show one at all. `LiveBases` writes the form's values to the store as they change;
 * the set check above still decides whether you may LEAVE. See `live-bases.tsx` for
 * why the objection to a live store was about the check that stayed.
 *
 * THE DARK SEVEN ARE NOT FORM FIELDS. `FormColorPicker` omits `onChange` and `value`
 * on purpose — winning them at a call site severs the binding rather than overriding
 * it — and its own docs say what to do when you need them: compose the control and
 * bind it yourself. The "re-derive" button only means anything against LIVE values,
 * so that set is store-backed and the schema checks it as a closed-over value.
 */
export default function BrandColours() {
  const stepLink = useStepLink();
  const { bases, darkBases, setDarkBases, deriveFromLight, darkFollowsLight } =
    useBases();
  const navigate = useNavigate();

  const [tab, setTab] = useEditingScheme();

  // The schema needs the contracts the layout route read, so it is built here rather
  // than at module scope. Memoised on them and on the dark bases, so the resolver
  // identity is stable and the form does not re-register its fields on every render.
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

      <RhfForm<BasesValues>
        options={{ defaultValues: bases, resolver: zodResolver(schema) }}
        // NO WRITE HERE: the values are already in the store, because `LiveBases`
        // put them there as they changed. Getting this far means the resolver passed
        // the set, so all that is left of "check and continue" is the continue.
        //
        // `stepPath` AND NOT A LITERAL. This line said `/palette` and survived the
        // move of every step under `/steps/`, so submitting went to a 404 — and the
        // walk-the-routes check did not see it, because it visited pages and never
        // submitted a form.
        onSubmit={() => void navigate(stepLink('palette'))}
        style={{ display: 'grid', gap: 'var(--fm-space-stack-l)' }}
      >
        {/* FIRST, and it is where a person lands after a failed submit: a list of
            what went wrong, each item a link to the field. Outside the tabs because
            it is about the whole form — and paired with the switch below, because a
            link into a hidden panel focuses nothing. */}
        <FormErrorSummary labelFor={(name) => name} />
        <ShowTheFailingTab onFieldError={() => setTab('light')} />
        <LiveBases />

        {tab === 'light' ? (
          <FieldsetContent
            orientation="horizontal"
            className="theme-builder-bases"
          >
            {FAMILIES.map((family) => (
              <FormColorPicker key={family} name={family} label={family} />
            ))}
          </FieldsetContent>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
            <FieldsetContent
              orientation="horizontal"
              className="theme-builder-bases"
            >
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

            <p
              style={{
                margin: 0,
                maxWidth: 'var(--fm-size-prose)',
                fontSize: 'var(--fm-text-sm)',
                lineHeight: 'var(--fm-leading-sm)',
                color: 'var(--fm-color-muted-foreground)',
              }}
            >
              {darkFollowsLight ? (
                <>
                  These <strong>follow the light seven</strong> — same hue,
                  restated at lightness 0.75, keeping each one&rsquo;s share of
                  the chroma sRGB allows there. Change a light colour and they
                  move with it. Edit one here and they stop following, because a
                  brand with a real dark palette has colours of its own.
                </>
              ) : (
                <>
                  These are <strong>yours</strong> and no longer follow the
                  light seven, so changing a light colour will not move them.
                  Re-deriving puts them back to the suggestion and starts them
                  following again.
                </>
              )}
            </p>

            {/* IN THIS PANEL because it is about these colours, and DISABLED WHILE
                  THEY FOLLOW: re-deriving what is already the derivation changes
                  nothing, and the sentence above says so.

                  It was enabled unconditionally for one commit, and why is worth
                  keeping. The light seven were committed on submit while the dark
                  seven were live, so a light edit left the store untouched, the dark
                  seven correctly unchanged and this button correctly disabled — while
                  the screen plainly showed new light colours and stale dark ones.
                  Reported as "bloccato anche quando modifico i light". Enabling it
                  papered over the asymmetry; `LiveBases` removed the asymmetry, so
                  the store IS what the person is looking at, and a disabled state is
                  honest again. */}
            <Button
              type="button"
              variant="secondary"
              onClick={deriveFromLight}
              disabled={darkFollowsLight}
              style={{ justifySelf: 'start' }}
            >
              Re-derive from the light seven
            </Button>
          </div>
        )}

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
          {/* Resets the FORM as well as the store — see `live-bases.tsx` for the
              state the old two-write version left the wizard in. */}
          <BackToReference>
            {(onClick) => (
              <Button type="button" variant="ghost" onClick={onClick}>
                Back to the reference colours
              </Button>
            )}
          </BackToReference>
        </div>
      </RhfForm>
    </section>
  );
}

/**
 * SELECT THE PANEL THAT FAILED, and it exists because a tab can hide a problem.
 *
 * `TabPanel` stays mounted and goes `hidden` (the APG's own example), which is what
 * makes tabs safe around a form at all: the light fields stay registered, so
 * submitting from the dark tab still submits them. What it does NOT fix is the error
 * summary, whose whole job is to link to the field that failed — and an element
 * inside a `hidden` panel cannot take focus, so from the dark tab that link goes
 * nowhere.
 *
 * ONLY THE LIGHT SEVEN CAN PRODUCE A FIELD ERROR, because only they are fields; a
 * dark violation lands on the form with the family in its message. So "the panel that
 * failed" is always the light one, and this needs no map from field to tab.
 *
 * A COMPONENT RATHER THAN A HOOK IN THE PAGE, because `useRhfErrors` reads the form
 * context and the page renders the form — a component cannot consume a context its
 * own element declares.
 */
function ShowTheFailingTab({
  onFieldError,
}: {
  readonly onFieldError: () => void;
}) {
  const errors = useRhfErrors();
  const failed = Object.keys(errors).length > 0;

  useEffect(() => {
    if (failed) onFieldError();
  }, [failed, onFieldError]);

  return null;
}
