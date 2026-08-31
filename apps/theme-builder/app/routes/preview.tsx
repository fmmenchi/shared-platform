import { Alert } from '@fmmenchi/ui/alert';
import { Badge } from '@fmmenchi/ui/badge';
import { Button } from '@fmmenchi/ui/button';
import { Card } from '@fmmenchi/ui/card';
import { CardTitle } from '@fmmenchi/ui/card-title';
import { Field } from '@fmmenchi/ui/field';
import { FieldLabel } from '@fmmenchi/ui/field-label';
import { Heading } from '@fmmenchi/ui/heading';
import { Input } from '@fmmenchi/ui/input';
import { Switch } from '@fmmenchi/ui/switch';

import { DraftThemeScope, useDraftTheme } from '../draft-theme';

/**
 * THE DEMO APP — the design system under the theme being built.
 *
 * Everything below `DraftThemeScope` renders on the draft; the page's own heading
 * and the empty-state notice do not, because they are chrome. That is the same
 * split as `root.tsx`, one level down.
 *
 * The components here are chosen for what they EXERCISE rather than for looks: a
 * filled action and its hover, a subtle wash with text on it, a status family, a
 * field with its label and border, a control the browser paints part of. Between
 * them they touch most of the pairs `CONTRAST_PAIRS` declares, which is what makes
 * a preview evidence rather than decoration.
 */
export default function Preview() {
  const { css } = useDraftTheme();

  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-l)',
        padding: 'var(--fm-space-inset-l)',
      }}
    >
      <Heading level={1}>Preview</Heading>

      {css ? null : (
        <Alert>
          No draft yet — this is the reference theme. Choose bases on the build
          page and this page renders what you chose.
        </Alert>
      )}

      <DraftThemeScope>
        <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--fm-space-inline-s)',
            }}
          >
            <Button>Primary action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Delete</Button>
            <Button disabled>Disabled</Button>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--fm-space-inline-s)',
            }}
          >
            <Badge>Neutral</Badge>
            <Badge variant="success">Paid</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="destructive">Failed</Badge>
          </div>

          <Card>
            <CardTitle level={2}>A card, on the card surface</CardTitle>
            <Field>
              <FieldLabel>Workspace name</FieldLabel>
              <Input defaultValue="Acme" />
            </Field>
            <Switch>Ship on merge</Switch>
          </Card>

          <Alert variant="error">
            An alert in the status treatment: a subtle wash, a border, and text
            that has to clear its floor on both.
          </Alert>
        </div>
      </DraftThemeScope>
    </div>
  );
}
