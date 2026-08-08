import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './card.component.js';
import { CardTitle } from '../card-title/card-title.component.js';
import { CardMedia } from '../card-media/card-media.component.js';
import { CardActions } from '../card-actions/card-actions.component.js';
import { Button } from '../button/button.component.js';

const meta: Meta<typeof Card> = {
  title: 'Components/Layout/Card',
  component: Card,
  argTypes: {
    children: {
      control: false,
      description:
        'Whatever the card holds. `CardTitle`, `CardMedia` and `CardActions` are parts because each carries CSS a consumer gets wrong; everything else is your own markup.',
      table: { type: { summary: 'ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Card>;

/** A card holds one thing and decides nothing about what it is. */
export const Default: Story = {
  render: (args) => (
    <Card {...args} style={{ maxWidth: '22rem' }}>
      <CardTitle level={3}>Weekly digest</CardTitle>
      <p>Four things happened this week that are worth ninety seconds.</p>
    </Card>
  ),
};

/**
 * Give `CardTitle` a destination and **the whole card becomes clickable** —
 * hover anywhere. The anchor is still only around the title, so a screen
 * reader announces "Weekly digest, link" rather than reading the card out.
 */
export const Linked: Story = {
  render: (args) => (
    <Card {...args} style={{ maxWidth: '22rem' }}>
      <CardTitle level={3} href="/digest">
        Weekly digest
      </CardTitle>
      <p>Four things happened this week that are worth ninety seconds.</p>
    </Card>
  ),
};

/**
 * `CardMedia` reaches the edges by cancelling exactly the card's padding, and
 * rounds its own corners — the card deliberately does not clip its contents,
 * because that would clip the focus ring of everything inside it too.
 */
export const WithMedia: Story = {
  render: (args) => (
    <Card {...args} style={{ maxWidth: '22rem' }}>
      <CardMedia
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%23b8c4d9'/%3E%3C/svg%3E"
        alt=""
      />
      <CardTitle level={3} href="/digest">
        Weekly digest
      </CardTitle>
      <p>Four things happened this week.</p>
    </Card>
  ),
};

/**
 * The two things that only mean something **in a grid**: the actions row pins
 * itself to the bottom, so cards with summaries of different lengths still line
 * their buttons up — and it sits above the title's invisible layer, so the
 * buttons stay clickable on a card that is itself a link.
 */
export const InAGrid: Story = {
  render: (args) => (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-inset-m)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
      }}
    >
      <Card {...args}>
        <CardTitle level={3} href="/digest">
          Weekly digest
        </CardTitle>
        <p>Short.</p>
        <CardActions>
          <Button variant="secondary">Save</Button>
        </CardActions>
      </Card>
      <Card {...args}>
        <CardTitle level={3} href="/report">
          Quarterly report
        </CardTitle>
        <p>
          A longer summary, which is the only situation in which pinning the
          actions to the bottom does anything at all.
        </p>
        <CardActions>
          <Button variant="secondary">Save</Button>
          <Button variant="ghost">Share</Button>
        </CardActions>
      </Card>
    </div>
  ),
};

/** A shadow instead of a hairline, for a card that floats above content. */
export const Elevated: Story = {
  args: { variant: 'elevated' },
  render: (args) => (
    <Card {...args} style={{ maxWidth: '22rem' }}>
      <CardTitle level={3}>Weekly digest</CardTitle>
      <p>Four things happened this week.</p>
    </Card>
  ),
};
