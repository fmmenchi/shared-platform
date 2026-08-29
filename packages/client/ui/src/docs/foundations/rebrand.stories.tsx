import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { Button } from '../../components/button/button.component.js';
import { Badge } from '../../components/badge/badge.component.js';
import { Alert } from '../../components/alert/alert.component.js';
import { Card } from '../../components/card/card.component.js';
import { CardTitle } from '../../components/card-title/card-title.component.js';
import { Input } from '../../components/input/input.component.js';
import { Field } from '../../components/field/field.component.js';
import { FieldLabel } from '../../components/field-label/field-label.component.js';

/**
 * WHAT A REBRAND COSTS, shown rather than claimed.
 *
 * Seven declarations. That is the whole diff between the two stories here — the
 * bases, and nothing else. Every ramp step recomputes from them because the
 * palette is relative colour evaluated live, and every one of the 84 roles
 * follows because it points at a step. No component is touched, no role is
 * reassigned, no contrast pair is re-tuned by hand.
 *
 * The hues are taken from a published brand palette (Stripe's blurple, cyan,
 * red, green and amber) to make the change unmistakable, and used as HUES ONLY:
 * lightness comes from where our bases sit and chroma from what the sRGB gamut
 * allows there. A borrowed palette therefore arrives already inside this
 * system's gamut and contrast rules instead of having to be argued into them.
 *
 * Before this layer existed the same change was 84 edits per theme, applying a
 * ramp formula by hand, with a contrast gate to satisfy afterwards.
 */

/** The seven declarations. Derived from the brand hues; see the module comment. */
const REBRAND = `:root {
  --fm-palette-primary-base: oklch(55% 0.2346 278);
  --fm-palette-secondary-base: oklch(55% 0.0373 249);
  --fm-palette-accent-base: oklch(55% 0.0971 220);
  --fm-palette-negative-base: oklch(55% 0.214 19);
  --fm-palette-success-base: oklch(55% 0.1786 143);
  --fm-palette-warning-base: oklch(55% 0.1126 75);
  --fm-palette-info-base: oklch(55% 0.1822 256);
}`;

/**
 * ON `:root`, and not on a wrapper — which the first version of this story got
 * wrong and the screenshot caught.
 *
 * A custom property is resolved WHERE IT IS DECLARED. `--fm-color-primary:
 * var(--fm-palette-primary-700)` lives on `:root`, so its computed value is
 * settled there, and descendants inherit that settled value. Redefining a base
 * on a `<div>` therefore changes nothing below it: the roles were resolved
 * before the new base existed.
 *
 * The consequence is worth knowing: a rebrand belongs on the same element the
 * roles are declared on. A SUBTREE with different colours — one widget in
 * another brand — cannot be done by overriding bases alone; it has to redeclare
 * the roles it wants changed.
 */
function useRebrand() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = REBRAND;
    document.head.append(style);
    return () => style.remove();
  }, []);
}

function Showcase({ title }: { title: string }) {
  return (
    <section
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-m)',
        padding: 'var(--fm-space-inset-m)',
        background: 'var(--fm-color-background)',
        color: 'var(--fm-color-foreground)',
        border: 'var(--fm-border-width-default) solid var(--fm-color-border)',
        borderRadius: 'var(--fm-radius-lg)',
      }}
    >
      <strong style={{ fontSize: 'var(--fm-text-sm)' }}>{title}</strong>

      <div
        style={{
          display: 'flex',
          gap: 'var(--fm-space-inline-s)',
          flexWrap: 'wrap',
        }}
      >
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="accent">Accent</Button>
        <Button variant="destructive">Delete</Button>
        <Button disabled>Disabled</Button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 'var(--fm-space-inline-s)',
          flexWrap: 'wrap',
        }}
      >
        <Badge variant="primary">primary</Badge>
        <Badge variant="accent">accent</Badge>
        <Badge variant="success">success</Badge>
        <Badge variant="warning">warning</Badge>
        <Badge variant="info">info</Badge>
        <Badge variant="destructive">destructive</Badge>
      </div>

      <Alert variant="info" title="Heads up">
        An informative message, on the subtle wash with its own ink.
      </Alert>
      <Alert variant="error" title="That failed">
        The status red — the same hue as the destructive button, a different
        treatment.
      </Alert>

      <Card>
        <CardTitle level={3}>A card</CardTitle>
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input placeholder="you@example.com" />
        </Field>
      </Card>
    </section>
  );
}

const meta: Meta = {
  title: 'Foundations/Rebrand in seven numbers',
  parameters: { controls: { disable: true } },
};
export default meta;

type Story = StoryObj;

/** The system as it ships. Switch between this and `Rebranded` to compare. */
export const Shipped: Story = {
  render: () => <Showcase title="Shipped bases" />,
};

function Rebrand() {
  useRebrand();
  return <Showcase title="Seven bases replaced" />;
}

export const Rebranded: Story = { render: () => <Rebrand /> };
