import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { THEMES, type ThemeName } from './themes.js';
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

/**
 * Applied ON `:root`, and not on a wrapper — which the first version of this
 * story got wrong and a screenshot caught.
 *
 * A custom property is resolved WHERE IT IS DECLARED. `--fm-color-primary:
 * var(--fm-palette-primary-700)` lives on `:root`, so its computed value is
 * settled there and descendants inherit that settled value. Redefining a base
 * on a `<div>` changes nothing below it: the roles were resolved before the new
 * base existed.
 *
 * The consequence is worth knowing. A rebrand belongs on the element the roles
 * are declared on, and a SUBTREE in another brand — one widget, a preview pane —
 * cannot be done by overriding bases alone; it has to redeclare the roles it
 * wants changed.
 */
function useTheme(theme: ThemeName | null) {
  useEffect(() => {
    if (theme === null) return;
    const style = document.createElement('style');
    style.textContent = `:root { ${THEMES[theme].bases} }`;
    document.head.append(style);
    return () => style.remove();
  }, [theme]);
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

function Switcher() {
  const [theme, setTheme] = useState<ThemeName | null>(null);
  useTheme(theme);

  return (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <div
        style={{
          display: 'flex',
          gap: 'var(--fm-space-inline-s)',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Button
          variant={theme === null ? 'primary' : 'secondary'}
          onClick={() => setTheme(null)}
        >
          Shipped
        </Button>
        {(Object.keys(THEMES) as ThemeName[]).map((name) => (
          <Button
            key={name}
            variant={theme === name ? 'primary' : 'secondary'}
            onClick={() => setTheme(name)}
          >
            {name}
          </Button>
        ))}
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 'var(--fm-text-sm)',
          color: 'var(--fm-color-muted-foreground)',
        }}
      >
        {theme === null
          ? 'The bases as the package ships them.'
          : THEMES[theme].label}
      </p>

      <Showcase
        title={theme === null ? 'Shipped bases' : `Seven bases: ${theme}`}
      />
    </div>
  );
}

/** Click through the brands: seven declarations change between each. */
export const Switch: Story = { render: () => <Switcher /> };

/** The system as it ships, for a side-by-side in two windows. */
export const Shipped: Story = {
  render: () => <Showcase title="Shipped bases" />,
};
