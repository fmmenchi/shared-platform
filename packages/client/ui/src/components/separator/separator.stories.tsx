import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from './separator.component.js';

const meta: Meta<typeof Separator> = {
  title: 'Components/Utilities/Separator',
  component: Separator,
  // The Props table is CURATED here (react-docgen can't derive it) — every
  // public prop, with its type summary, default and description.
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
      description:
        'Which way the line runs. `vertical` also announces itself as such — `role="separator"` defaults to horizontal.',
      table: {
        type: { summary: "'horizontal' | 'vertical'" },
        defaultValue: { summary: "'horizontal'" },
      },
    },
    decorative: {
      control: 'boolean',
      description:
        'Purely visual: keeps the line, hides it from assistive tech (`aria-hidden`). For a line that repeats a boundary the structure already states.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Separator>;

/** The default: a horizontal rule between stacked regions of content. */
export const Horizontal: Story = {
  render: (args) => (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-s)',
        maxInlineSize: '28rem',
      }}
    >
      <p>An overview of the release, in a paragraph or two.</p>
      <Separator {...args} />
      <p>The changelog that follows it, a different region of the page.</p>
    </div>
  ),
};

/**
 * Vertical, in a flex row of metadata. The row gives it its height
 * (`align-self: stretch`); standing alone there is no row to take it from,
 * and the consumer must give it an explicit `block-size`.
 */
export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
      <span>12 comments</span>
      <Separator {...args} />
      <span>3 likes</span>
      <Separator {...args} />
      <span>Shared yesterday</span>
    </div>
  ),
};

/**
 * Decorative: the same line, hidden from assistive tech — here it only
 * repeats the boundary the heading already states.
 */
export const Decorative: Story = {
  args: { decorative: true },
  render: (args) => (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-s)',
        maxInlineSize: '28rem',
      }}
    >
      <h2>Settings</h2>
      <Separator {...args} />
      <p>The heading names the section; the line is only underlining it.</p>
    </div>
  ),
};
