import { generateTheme, type Theme } from '@fmmenchi/theme';
import { Alert } from '@fmmenchi/ui/alert';
import { Badge } from '@fmmenchi/ui/badge';
import { Button } from '@fmmenchi/ui/button';
import { Card } from '@fmmenchi/ui/card';
import { Checkbox } from '@fmmenchi/ui/checkbox';
import { CardTitle } from '@fmmenchi/ui/card-title';
import { ChoiceField } from '@fmmenchi/ui/choice-field';
import { Field } from '@fmmenchi/ui/field';
import { Heading } from '@fmmenchi/ui/heading';
import { Input } from '@fmmenchi/ui/input';
import { SegmentedControl } from '@fmmenchi/ui/segmented-control';
import { SegmentedControlItem } from '@fmmenchi/ui/segmented-control-item';
import { Separator } from '@fmmenchi/ui/separator';
import { Switch } from '@fmmenchi/ui/switch';
import { useMemo, useState, type ReactNode } from 'react';
import { useLoaderData } from 'react-router';

import { useBases } from '../bases';
import {
  DeclarationsProvider,
  type Scheme,
  type SerializedDeclarations,
} from '../declarations';
import { readDeclarations } from '../declarations.server';
import { useRamp } from '../ramp';
import { ROLE_GROUPS } from '../role-groups';
import { useThemedDeclarations } from '../role-overrides';
import { ThemeScope } from '../theme-scope';

/**
 * THE DEMO APP — the design system under the theme being built, in either scheme.
 *
 * ONE SECTION PER ROLE GROUP, in the same order and with the same titles as step
 * three, which is what makes this page evidence rather than a gallery. `ROLE_GROUPS`
 * is built from the contract's own partition, so the sections here cannot drift from
 * the roles they are showing: add a family to the contract and a section appears.
 *
 * WHAT EACH SECTION SHOWS IS CHOSEN FOR THE PAIRS IT EXERCISES. The four ACTION
 * families carry hover and active, so they get a real button — the thing you press.
 * The four STATUS families do not, so they get an Alert and a Badge — the thing you
 * read, on its wash, inside its border. Then the greys, the surfaces with the focus
 * ring that has to clear 3:1 on every one of them, and a field at rest, invalid and
 * disabled.
 *
 * IT RENDERS THE DRAFT NOW, WHICH IT DID NOT BEFORE. The page said "No draft yet" for
 * every possible set of bases, because the draft was a CSS string and nothing in the
 * app ever produced one — see `theme-scope.tsx` for the whole story. The theme is
 * derived here from the same three inputs the export uses, so what is on screen and
 * what is in the file cannot disagree.
 *
 * THE HEADING AND THE CONTROLS STAY OUTSIDE THE SCOPE. They are chrome: a theme whose
 * contrast fails must not take down the toggle that would switch away from it.
 */
/**
 * THE PREVIEW LOADS THE DECLARATIONS ITSELF, and it has to.
 *
 * `/preview` sits OUTSIDE the wizard layout on purpose — a theme whose contrast pair
 * is below its floor must not take down the controls that would fix it — and the
 * layout is where the declarations were loaded. So this route could not reach them:
 * `useDeclarations` threw, and that is the architectural reason the page was a stub
 * for as long as it was. Measured after wiring it up: a 500 saying
 * "useDeclarations must be used inside the wizard layout".
 *
 * Reading them twice costs nothing worth naming — it is one file read on the server,
 * and both routes need the same answer. Sharing a loader would mean sharing a layout,
 * which is the thing being deliberately avoided.
 */
export function loader() {
  return readDeclarations();
}

export default function Preview() {
  const declarations = useLoaderData<SerializedDeclarations>();

  return (
    <DeclarationsProvider declarations={declarations}>
      <PreviewPage />
    </DeclarationsProvider>
  );
}

/**
 * The page itself, one level in so it can read the declarations its own route just
 * provided — a component cannot consume a context its own element declares.
 */
function PreviewPage() {
  const { bases, darkBases } = useBases();
  const { ramps } = useRamp();
  // Step three's re-pointings, for light. Dark uses the design system's own alias map
  // — the two point their roles at different rungs, so a light override means a
  // different colour there and carrying it across would be a guess.
  const lightDeclared = useThemedDeclarations();
  // THE RE-POINTED ones for dark too, since step three has a dark tab now.
  const darkDeclared = useThemedDeclarations('dark');

  const [scheme, setScheme] = useState<Scheme>('light');

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
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-l)',
        padding: 'var(--fm-space-inset-l)',
      }}
    >
      <Heading level={1}>Preview</Heading>

      <SegmentedControl
        label="Scheme"
        name="preview-scheme"
        value={scheme}
        onValueChange={(next) => setScheme(next as Scheme)}
        style={{ justifySelf: 'start' }}
      >
        <SegmentedControlItem value="light">Light</SegmentedControlItem>
        <SegmentedControlItem value="dark">Dark</SegmentedControlItem>
      </SegmentedControl>

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

/** One group's worth of components, titled the way step three titles it. */
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
      <Heading level={2}>{title}</Heading>
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
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'var(--fm-space-inline-s)',
        }}
      >
        {children}
      </div>
      <Separator />
    </section>
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
    <Badge variant="neutral" emphasis="soft">
      no component exercises “{title}” yet
    </Badge>
  );
}

/** An action family: the thing you press, plus its quiet version. */
const action = (
  variant: 'primary' | 'secondary' | 'accent' | 'destructive',
  badge?: 'primary' | 'accent' | 'destructive',
) => (
  <>
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
  </>
);

/** A status family: the thing you read, on its wash, inside its border. */
const status = (
  variant: 'success' | 'warning' | 'info' | 'error',
  badge?: 'success' | 'warning' | 'info',
) => (
  <>
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
  </>
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
    <>
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
    </>
  ),
  'surfaces, text & focus': (
    <>
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
      <a href="#preview" style={{ color: 'var(--fm-color-link)' }}>
        A link on the page
      </a>
    </>
  ),
  'form controls': (
    <>
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
      {/* THE CONTROL GOES INSIDE. Without a child `ChoiceField` renders its label
          and nothing else — seen on the page as the words "A checkbox" with no box
          beside them, which is exactly the "stray box" its own docs warn about, in
          reverse. */}
      <ChoiceField label="A checkbox">
        <Checkbox defaultChecked />
      </ChoiceField>
      {/* `Switch` has no own props at all — its state IS `checked` and its name IS
          `name` (ADR-0024) — so the name comes from `aria-label` here rather than a
          `label` prop it deliberately does not have. */}
      <Switch aria-label="A switch" defaultChecked />
    </>
  ),
};
