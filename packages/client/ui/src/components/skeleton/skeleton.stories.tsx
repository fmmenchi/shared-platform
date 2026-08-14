import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './skeleton.component.js';

const meta: Meta<typeof Skeleton> = {
  title: 'Components/Feedback/Skeleton',
  component: Skeleton,
  // The Props table is CURATED here (react-docgen can't derive it) — declare
  // every public prop with type summary, default and description.
  argTypes: {
    shape: {
      control: 'inline-radio',
      options: ['text', 'block', 'circle'],
      description:
        'The outline of the thing that has not arrived. `text` is one line of type and takes its height from the current font size; `block` is a panel you give a height to; `circle` is an avatar, kept round by `aspect-ratio` when you change only its width.',
      table: {
        type: { summary: "'text' | 'block' | 'circle'" },
        defaultValue: { summary: "'text'" },
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Skeleton>;

/** All three shapes at a glance. */
export const Gallery: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--fm-space-inline-m)',
      }}
    >
      <Skeleton shape="circle" />
      <div style={{ flex: 1 }}>
        <Skeleton shape="text" />
      </div>
      <Skeleton
        shape="block"
        style={{ inlineSize: '6rem', blockSize: '3rem' }}
      />
    </div>
  ),
};

/** One line of type — the default, and the case that comes up most. */
export const Text: Story = { args: { shape: 'text' } };

/**
 * A panel: an image, a chart, a map. Give it a height — it spans the inline
 * axis on its own.
 */
export const Block: Story = {
  args: { shape: 'block' },
  render: (args) => <Skeleton {...args} style={{ blockSize: '8rem' }} />,
};

/** An avatar. `Avatar`'s `md` (2.5rem) by default. */
export const Circle: Story = { args: { shape: 'circle' } };

/**
 * `text` takes its height from the FONT, so the same component stands in for a
 * heading and for body copy with nothing passed. The short last line is the
 * consumer's, not a prop: a paragraph is a stack of lines and its rhythm
 * belongs to the layout around it.
 */
export const Paragraph: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--fm-space-stack-s)',
      }}
    >
      <div style={{ fontSize: 'var(--fm-text-2xl)' }}>
        <Skeleton />
      </div>
      <Skeleton />
      <Skeleton />
      <div style={{ inlineSize: '60%' }}>
        <Skeleton />
      </div>
    </div>
  ),
};

/**
 * THE ACCESSIBILITY CONTRACT, shown rather than claimed. Every skeleton is
 * `aria-hidden`, so the region that is waiting carries the state: `aria-busy`
 * while the placeholders are up, and the real content — with its own
 * semantics — when it lands. A screen reader hears a busy region and then a
 * heading, never a grey box.
 */
export const LoadingRegion: Story = {
  render: () => (
    <section
      aria-busy="true"
      aria-label="Recent activity"
      style={{
        display: 'flex',
        gap: 'var(--fm-space-inline-m)',
        padding: 'var(--fm-space-inset-s)',
        border: 'var(--fm-border-width-divider) solid var(--fm-color-border)',
        borderRadius: 'var(--fm-radius-lg)',
      }}
    >
      <Skeleton shape="circle" />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--fm-space-stack-s)',
          flex: 1,
        }}
      >
        <div style={{ inlineSize: '40%' }}>
          <Skeleton />
        </div>
        <Skeleton />
        <div style={{ inlineSize: '75%' }}>
          <Skeleton />
        </div>
      </div>
    </section>
  ),
};
