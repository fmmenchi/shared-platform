import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heading } from './heading.component.js';

const meta: Meta<typeof Heading> = {
  title: 'Components/Typography/Heading',
  component: Heading,
  args: { level: 2, children: 'The quick brown fox' },
  argTypes: {
    level: {
      control: 'inline-radio',
      options: [1, 2, 3, 4, 5, 6],
      description:
        'What this heading IS: the tag, and the document outline assistive tech navigates by. Required — it follows the structure of the page, never the look.',
      table: { type: { summary: '1 | 2 | 3 | 4 | 5 | 6' } },
    },
    size: {
      control: 'inline-radio',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      description:
        'How big it LOOKS, when that has to differ from what it is. Steps of the shared type scale. Defaults to the size belonging to `level`.',
      table: {
        type: { summary: "'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'" },
        defaultValue: { summary: "the level's own size" },
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Heading>;

export const Default: Story = {};

/** Every level at its own size — the outline and the scale agreeing. */
export const Levels: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {([1, 2, 3, 4, 5, 6] as const).map((level) => (
        <Heading key={level} level={level}>
          Level {level}
        </Heading>
      ))}
    </div>
  ),
};

/**
 * The reason the component exists: three headings that are the SAME level —
 * so the outline reads h2, h2, h2 — rendered at three sizes. In raw markup the
 * small one would have become an `<h4>` and the outline would have lied.
 */
export const SizeIsNotLevel: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Heading level={2} size="h2">
        A section
      </Heading>
      <Heading level={2} size="h5">
        A quieter section, still an h2
      </Heading>
      <Heading level={2} size="h6">
        A very quiet one, still an h2
      </Heading>
    </div>
  ),
};

/** The whole scale, on one level, for choosing a step. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map((size) => (
        <Heading key={size} level={2} size={size}>
          {size}
        </Heading>
      ))}
    </div>
  ),
};
