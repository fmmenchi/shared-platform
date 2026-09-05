import { generateTheme, type Theme } from '@fmmenchi/theme';
import { Alert } from '@fmmenchi/ui/alert';
import { Badge } from '@fmmenchi/ui/badge';
import { Button } from '@fmmenchi/ui/button';
import { Card } from '@fmmenchi/ui/card';
import { CardTitle } from '@fmmenchi/ui/card-title';
import { Checkbox } from '@fmmenchi/ui/checkbox';
import { ChoiceField } from '@fmmenchi/ui/choice-field';
import { Field } from '@fmmenchi/ui/field';
import { Heading } from '@fmmenchi/ui/heading';
import { Input } from '@fmmenchi/ui/input';
import { Separator } from '@fmmenchi/ui/separator';
import { Switch } from '@fmmenchi/ui/switch';
import { useMemo, type ReactNode } from 'react';

import { useBases } from './bases';
import { useEditingScheme } from './editing-scheme';

import { useRamp } from './ramp';
import { ROLE_GROUPS } from './role-groups';
import { useThemedDeclarations } from './role-overrides';
import { ThemeScope } from './theme-scope';

/**
 * THE DESIGN SYSTEM UNDER THE THEME BEING BUILT — the whole of it, in the rail.
 *
 * It is a component rather than a page because the preview's job is FEEDBACK: the
 * question it answers is "what does this colour do", and whoever is asking is
 * mid-choice, looking at the control they just moved. A page took that control away
 * at the moment the answer arrived. So it is a `SidePanel` beside the step, and
 * ADR-0034 is the boundary that made that possible: a non-modal surface, so the
 * step's controls keep working behind it.
 *
 * IT WAS ALSO A `/preview` ROUTE at full width, for reading all eleven sections, and
 * that is gone: nothing linked to it once the rail existed, and the rail is wide
 * enough now to give an Alert its own line. With one host the `sectionLevel` prop it
 * took went too — the outline below is fixed at the level under the rail's `h2`, and
 * a card inside a section takes the next one down.
 *
 * IT RENDERS NO HEADING OF ITS OWN — the rail names itself, "Your theme", and that
 * heading is what labels the region — and it brings no padding, because `SidePanel`
 * insets itself.
 *
 * THE CONTROLS STAY OUTSIDE THE SCOPE. They are chrome: a theme whose contrast fails
 * must not take down the toggle that would switch away from it. That is what makes
 * the panel safe beside the step — see `theme-scope.tsx`, and
 * `tests/theme-scope.spec.tsx` for the assertion.
 */
export function ThemePreview() {
  const { bases, darkBases } = useBases();
  const { ramps } = useRamp();
  // Step three's re-pointings, for light. Dark uses the design system's own alias map
  // — the two point their roles at different rungs, so a light override means a
  // different colour there and carrying it across would be a guess.
  const lightDeclared = useThemedDeclarations();
  // THE RE-POINTED ones for dark too, since step three has a dark tab now.
  const darkDeclared = useThemedDeclarations('dark');

  const [scheme] = useEditingScheme();

  const { theme, error } = useMemo(() => {
    try {
      return {
        theme:
          scheme === 'dark'
            ? generateTheme(darkDeclared, darkBases, ramps.dark)
            : generateTheme(lightDeclared, bases, ramps.light),
        error: null,
      };
    } catch (cause) {
      // A hole the build steps report in detail. The preview says so and renders on
      // the reference theme rather than showing a page of black.
      return { theme: null as Theme | null, error: (cause as Error).message };
    }
  }, [scheme, lightDeclared, darkDeclared, bases, darkBases, ramps]);

  return (
    // NO PADDING HERE, because the host already has an opinion about it: a page
    // insets its content and `SidePanel` insets itself. Two of them was two of them.
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-l)' }}>
      {error !== null && (
        <Alert variant="error">
          These bases do not make a {scheme} theme, so this is the reference
          one. {error}
        </Alert>
      )}

      {/* THE SCOPE PAINTS ITS OWN BACKGROUND, because `--fm-color-background` is a
          role like any other and the page behind it is the wizard's. Without this the
          dark theme's components would sit on the light chrome and every surface pair
          would be judged against the wrong ground. */}
      <ThemeScope
        theme={theme}
        scheme={scheme}
        style={{
          display: 'grid',
          gap: 'var(--fm-space-stack-l)',
          padding: 'var(--fm-space-inset-l)',
          borderRadius: 'var(--fm-radius-lg)',
          background: 'var(--fm-color-background)',
          color: 'var(--fm-color-foreground)',
        }}
      >
        {ROLE_GROUPS.map((group) => (
          <Section key={group.title} title={group.title} note={group.note}>
            {DEMOS[group.title] ?? <Fallback title={group.title} />}
          </Section>
        ))}
      </ThemeScope>
    </div>
  );
}

/**
 * One group's worth of components, titled the way step three titles it.
 *
 * `h3`, because the rail's own heading is the `h2` — see `root.tsx` — and this is the
 * only place the preview renders now. The level was a prop while a full-width page
 * hosted it too.
 */
function Section({
  title,
  note,
  children,
}: {
  readonly title: string;
  readonly note: string;
  readonly children: ReactNode;
}) {
  return (
    <section style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Heading level={3}>{title}</Heading>
      <p
        style={{
          margin: 0,
          maxWidth: 'var(--fm-size-prose)',
          fontSize: 'var(--fm-text-sm)',
          lineHeight: 'var(--fm-leading-sm)',
          color: 'var(--fm-color-muted-foreground)',
        }}
      >
        {note}
      </p>
      <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
        {children}
      </div>
      <Separator />
    </section>
  );
}

/**
 * SPELLED OUT rather than built from the prop, because `tests/tokens-exist.spec.ts`
 * reads this file for `var(--fm-…)` and a template literal is invisible to it —
 * `var(--fm-space-inline-${gap})` never matches its pattern, so the one guard that
 * exists because the scales disagree on their suffixes would have waved it through.
 */
const ROW_GAP = {
  s: 'var(--fm-space-inline-s)',
  m: 'var(--fm-space-inline-m)',
} as const;

/**
 * ONE ROW OF A SECTION, and its `align` is a statement about ANATOMY rather than a
 * taste knob — which is why it is a prop here and was a constant before.
 *
 * `center` is for single-line things: a badge beside a button belongs on the button's
 * centreline, and topped instead it floats above the text it sits next to.
 *
 * `start` is for BLOCKS with structure inside them — a card, a labelled field. Those
 * have a first line of their own, and a reader lines a row of them up by it: three
 * labels on one line means three inputs on the next. Centred, a field carrying an
 * error message is taller than its neighbours, so every label lands at a different
 * height and the row lines up on nothing anybody can see. That is what it did.
 *
 * `gap` IS THE OTHER HALF OF THE SAME QUESTION, and it is measured rather than
 * chosen: proximity only groups things when the space BETWEEN groups is larger than
 * the space INSIDE one. Two `ChoiceField`s in a row came out at 8px between them and
 * 8px from each control to its own label — identical, so proximity said nothing and
 * the switch read as the checkbox's toggle. `m` is 1rem against that 0.5rem: the
 * smallest gap on the scale that actually separates them.
 *
 * A row of one family's chips keeps `s`, because those ARE one group — a solid badge
 * and its soft twin want to look like a pair, and spacing them apart would be undoing
 * on screen what the section says in words.
 *
 * AND NEVER BOTH IN ONE ROW. There is no alignment that suits a card and a bare link
 * at once — level with the card's title the link reads deliberate, level with
 * anything else it is stranded mid-air. Mixed anatomy is two rows, not a compromise
 * between them.
 */
function Row({
  align = 'center',
  gap = 's',
  children,
}: {
  readonly align?: 'center' | 'start';
  readonly gap?: 's' | 'm';
  readonly children: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: align,
        gap: ROW_GAP[gap],
      }}
    >
      {children}
    </div>
  );
}

/**
 * A group the contract has and this page has no components for.
 *
 * SHOWN RATHER THAN SKIPPED. A section that quietly disappears is how a family gets
 * added to the contract and never previewed — the gap has to be visible on the page
 * that exists to make gaps visible.
 */
function Fallback({ title }: { readonly title: string }) {
  return (
    <Row>
      <Badge variant="neutral" emphasis="soft">
        no component exercises “{title}” yet
      </Badge>
    </Row>
  );
}

/** An action family: the thing you press, plus its quiet version. */
const action = (
  variant: 'primary' | 'secondary' | 'accent' | 'destructive',
  badge?: 'primary' | 'accent' | 'destructive',
) => (
  <Row>
    <Button variant={variant}>Confirm</Button>
    <Button variant={variant} disabled>
      Disabled
    </Button>
    {badge ? (
      <>
        <Badge variant={badge} emphasis="solid">
          solid
        </Badge>
        <Badge variant={badge} emphasis="soft">
          soft
        </Badge>
      </>
    ) : null}
  </Row>
);

/** A status family: the thing you read, on its wash, inside its border. */
const status = (
  variant: 'success' | 'warning' | 'info' | 'error',
  badge?: 'success' | 'warning' | 'info',
) => (
  <Row>
    <Alert variant={variant} style={{ flexBasis: '100%' }}>
      {variant === 'error' ? 'An' : 'A'} {variant} message, on its own wash and
      inside its own border.
    </Alert>
    {badge ? (
      <>
        <Badge variant={badge} emphasis="solid">
          solid
        </Badge>
        <Badge variant={badge} emphasis="soft">
          soft
        </Badge>
      </>
    ) : null}
  </Row>
);

/**
 * KEYED BY THE GROUP'S TITLE, so a group with no entry renders the fallback rather
 * than vanishing. `Badge` has no `secondary` and no `error` variant, so those two
 * families show what they have — which is the honest thing for a page whose job is
 * showing what the theme does to real components.
 */
const DEMOS: Readonly<Record<string, ReactNode>> = {
  primary: action('primary', 'primary'),
  secondary: action('secondary'),
  accent: action('accent', 'accent'),
  destructive: action('destructive', 'destructive'),
  success: status('success', 'success'),
  warning: status('warning', 'warning'),
  info: status('info', 'info'),
  error: status('error'),
  neutral: (
    <Row>
      <Button variant="ghost">Ghost</Button>
      <Button variant="ghost" disabled>
        Disabled
      </Button>
      <Badge variant="neutral" emphasis="solid">
        solid
      </Badge>
      <Badge variant="neutral" emphasis="soft">
        soft
      </Badge>
    </Row>
  ),
  'surfaces, text & focus': (
    <>
      {/* A CARD AND A FIELD ARE BOTH BLOCKS, so they line up on their first line: the
          card's title and the field's label. */}
      <Row align="start" gap="m">
        <Card style={{ flexBasis: '18rem' }}>
          <CardTitle level={3}>A raised surface</CardTitle>
          <p style={{ margin: 0 }}>
            Body text on the card, and{' '}
            <span style={{ color: 'var(--fm-color-muted-foreground)' }}>
              muted text beside it
            </span>
            .
          </p>
        </Card>
        {/* The focus ring is the pair that has to clear 3:1 on EVERY surface, so it is
            shown on the card and on the page, not just once. */}
        <Field label="Tab here for the ring" style={{ flexBasis: '14rem' }}>
          <Input defaultValue="focus me" />
        </Field>
      </Row>

      {/* ITS OWN ROW: a link is one line of running text, and beside two blocks there
          was no height for it to sit at that did not read as an accident. */}
      <Row>
        <a href="#preview" style={{ color: 'var(--fm-color-link)' }}>
          A link on the page
        </a>
      </Row>
    </>
  ),
  'form controls': (
    <>
      {/* THE THREE FIELDS TOGETHER AND TOPPED, because the invalid one is taller than
          its neighbours: it carries a message underneath. */}
      <Row align="start" gap="m">
        {/* `label` and `error` are PROPS here rather than child components, which is
            the composition `Field` documents — and `disabled` belongs to the INPUT,
            because that is the thing the platform disables. `Field` has no such prop
            and should not: a label does not become unusable. */}
        <Field label="At rest" style={{ flexBasis: '14rem' }}>
          <Input defaultValue="Ada Lovelace" />
        </Field>
        <Field
          label="Invalid"
          invalid
          error="That is not an email address."
          style={{ flexBasis: '14rem' }}
        >
          <Input defaultValue="not an email" />
        </Field>
        <Field label="Disabled" style={{ flexBasis: '14rem' }}>
          <Input defaultValue="locked" disabled />
        </Field>
      </Row>

      {/* THE CHOICES GET THEIR OWN ROW because their anatomy is the other way round —
          control beside label, not label above control. In one row with the fields
          there is no alignment that suits both: level with the labels they float above
          their neighbours' inputs, level with the inputs they sit under the labels. */}
      <Row gap="m">
        {/* THE CONTROL GOES INSIDE. Without a child `ChoiceField` renders its label
            and nothing else — seen on the page as the words "A checkbox" with no box
            beside them, which is exactly the "stray box" its own docs warn about, in
            reverse. */}
        <ChoiceField label="A checkbox">
          <Checkbox defaultChecked />
        </ChoiceField>
        {/* `Switch` has no own props at all — its state IS `checked` and its name IS
            `name` (ADR-0024) — so `ChoiceField` supplies the words, which is what the
            switch's own docs send you to when a bare `<label>` will not do. Without a
            label of its own it sat next to the checkbox's, reading as its toggle. */}
        <ChoiceField label="A switch">
          <Switch defaultChecked />
        </ChoiceField>
      </Row>
    </>
  ),
};
