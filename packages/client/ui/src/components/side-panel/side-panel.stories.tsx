import type { Meta, StoryObj } from '@storybook/react-vite';
import { SidePanel } from './side-panel.component.js';
import { Button } from '../button/button.component.js';
import { Card } from '../card/card.component.js';
import { CardTitle } from '../card-title/card-title.component.js';
import { Field } from '../field/field.component.js';
import { Heading } from '../heading/heading.component.js';
import { Input } from '../input/input.component.js';

const meta: Meta<typeof SidePanel> = {
  title: 'Components/Layout/SidePanel',
  component: SidePanel,
  args: { label: 'Details', children: 'What the panel holds.' },
  // Curated: react-docgen cannot derive the props off the intersection type,
  // and the component-docs rule is that EVERY own prop appears.
  argTypes: {
    label: {
      control: 'text',
      description:
        'What this panel is, in a word or two. Required, because `<aside>` is a landmark and two unnamed ones are announced as two things called "complementary". An `aria-labelledby` pointing at a heading you already show outranks it — prefer that when the panel has a visible title.',
      table: { type: { summary: 'string' } },
    },
    children: {
      control: false,
      description:
        'Whatever the panel holds — your own markup. There are no parts: a title is a `Heading`, and what closes the panel is the app’s, because whether a panel is open is the app’s state.',
      table: { type: { summary: 'ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof SidePanel>;

/** A panel on its own, named by the prop. */
export const Default: Story = {};

/**
 * BESIDE THE WORK, which is what it is for: the form stays usable while the
 * panel is open, and that is the whole difference from a drawer.
 *
 * The two columns come from `repeat(auto-fit, minmax(…, 1fr))`, so the panel
 * drops under the content when there is no room for both — no media query and
 * no JavaScript.
 */
export const BesideTheContent: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-inline-m)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
        alignItems: 'start',
      }}
    >
      <section style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
        <Heading level={2}>Edit the record</Heading>
        <Field label="Name">
          <Input defaultValue="Ada Lovelace" />
        </Field>
        <Field label="Role">
          <Input defaultValue="Mathematician" />
        </Field>
        <Button style={{ justifySelf: 'start' }}>Save</Button>
      </section>

      <SidePanel label="Details">
        <Heading level={2} size="h3">
          Details
        </Heading>
        <p style={{ margin: 0 }}>
          Type in the form and this stays exactly where it is — no focus trap,
          no backdrop, nothing inert.
        </p>
      </SidePanel>
    </div>
  ),
};

/**
 * NAMED BY A HEADING ON SCREEN. `aria-labelledby` wins over `label`, so the
 * words announced are the words a sighted reader sees.
 */
export const NamedByItsHeading: Story = {
  render: () => (
    <SidePanel label="ignored" aria-labelledby="panel-heading">
      <Heading level={2} size="h3" id="panel-heading">
        Your theme
      </Heading>
      <p style={{ margin: 0 }}>
        Announced as “Your theme, complementary” rather than as the prop.
      </p>
    </SidePanel>
  ),
};

/**
 * ITS OWN SCROLL, once the app gives it a bound. The panel holds more than
 * fits; the page behind does not move when it reaches the end, because the
 * scroll does not chain.
 */
export const ScrollsOnItsOwn: Story = {
  render: () => (
    <div style={{ blockSize: '18rem' }}>
      <SidePanel label="A long panel">
        {Array.from({ length: 8 }, (_, i) => (
          <Card key={i} variant="outlined">
            <CardTitle level={3}>Item {i + 1}</CardTitle>
            <p style={{ margin: 0 }}>Something that takes up room.</p>
          </Card>
        ))}
      </SidePanel>
    </div>
  ),
};
