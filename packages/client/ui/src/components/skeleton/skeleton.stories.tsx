import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './skeleton.component.js';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.component.js';

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
        'The outline of the thing that has not arrived. `text` occupies one line box (`1lh`) of the current type; `block` is a panel you give a height to; `circle` is an avatar, kept round by `aspect-ratio` when you change only its width.',
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
      <Skeleton shape="text" style={{ flex: 1 }} />
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
 * A panel: an image, a chart, a map. Give it a height — the `1em` default is
 * only there so it is never invisible.
 */
export const Block: Story = {
  args: { shape: 'block' },
  render: (args) => <Skeleton {...args} style={{ blockSize: '8rem' }} />,
};

/** An avatar. `Avatar`'s `md` (2.5rem) by default. */
export const Circle: Story = { args: { shape: 'circle' } };

/**
 * A paragraph, stacked with NO gap — because `text` occupies the whole line
 * box, exactly as the copy it replaces does, so the lines space themselves.
 * There is no `lines` prop and no wrapper element per line: the size goes on
 * the placeholder itself, and `text` reads the font it sits in, so the heading
 * is heading-sized with nothing passed.
 */
export const Paragraph: Story = {
  render: () => (
    <div>
      <Skeleton style={{ fontSize: 'var(--fm-text-2xl)' }} />
      <Skeleton />
      <Skeleton />
      <Skeleton style={{ inlineSize: '60%' }} />
    </div>
  ),
};

/**
 * THE ACCESSIBILITY CONTRACT, shown rather than claimed — and the half that is
 * easy to get wrong is the announcement.
 *
 * Every skeleton is `aria-hidden`, so the placeholders say nothing. `aria-busy`
 * marks the region's STATE but announces nothing on its own: screen readers use
 * it to suppress updates, and none of them speak when it flips back to `false`.
 * The reliable path is the one `Button` already ships — a PERSISTENT
 * visually-hidden `role="status"` outside the placeholders, whose text changes
 * when the wait starts and ends. Persistent, because a region that appears at
 * the same moment as its text is not reliably announced.
 */
export const LoadingRegion: Story = {
  render: () => (
    <section
      aria-busy="true"
      aria-label="Recent activity"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--fm-space-inline-m)',
        padding: 'var(--fm-space-inset-s)',
        border: 'var(--fm-border-width-divider) solid var(--fm-color-border)',
        borderRadius: 'var(--fm-radius-lg)',
      }}
    >
      {/* The one thing a screen reader actually hears. In an app its text is
          swapped for "Recent activity loaded" when the data lands; the element
          itself is never unmounted. */}
      <VisuallyHidden role="status">Loading recent activity</VisuallyHidden>
      <Skeleton shape="circle" />
      <div style={{ flex: 1 }}>
        <Skeleton style={{ inlineSize: '40%' }} />
        <Skeleton />
        <Skeleton style={{ inlineSize: '75%' }} />
      </div>
    </section>
  ),
};
