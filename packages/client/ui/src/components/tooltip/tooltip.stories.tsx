import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip } from './tooltip.component.js';
import { Button } from '../button/button.component.js';

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Overlays/Tooltip',
  component: Tooltip,
  args: { content: 'Move to archive' },
  // The Props table is CURATED here (react-docgen can't derive it) — declare
  // every public prop with type summary, default and description.
  argTypes: {
    content: {
      control: 'text',
      description:
        'What it says. A **string**: anything interactive inside a tooltip could never be reached by keyboard, so the type refuses it.',
      table: { type: { summary: 'string' } },
    },
    children: {
      control: false,
      description:
        'The trigger — exactly one element, cloned rather than wrapped, so the tooltip adds no markup of its own.',
      table: { type: { summary: 'ReactElement' } },
    },
    placement: {
      control: 'inline-radio',
      options: ['top', 'bottom', 'left', 'right'],
      description:
        'Preferred side. Flipped automatically when there is no room.',
      table: {
        type: { summary: "'top' | 'bottom' | 'left' | 'right' | …" },
        defaultValue: { summary: "'top'" },
      },
    },
    openDelay: {
      control: { type: 'number', min: 0, max: 2000, step: 50 },
      description:
        'Pointer rest before it opens, in ms. Keyboard focus opens immediately.',
      table: { type: { summary: 'number' }, defaultValue: { summary: '400' } },
    },
    closeDelay: {
      control: { type: 'number', min: 0, max: 2000, step: 50 },
      description:
        'How long it survives after the pointer leaves — what makes it hoverable (WCAG 1.4.13).',
      table: { type: { summary: 'number' }, defaultValue: { summary: '120' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Tooltip>;

/** Hover the button, or Tab to it — both open it. */
export const Default: Story = {
  render: (args) => (
    <div style={{ padding: 'var(--fm-space-stack-xl)' }}>
      <Tooltip {...args}>
        <Button aria-label="Archive">Archive</Button>
      </Tooltip>
    </div>
  ),
};

/** Each side, and each one flips when the viewport gets in the way. */
export const Placements: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, max-content)',
        gap: 'var(--fm-space-inline-m)',
        padding: 'var(--fm-space-stack-xl)',
      }}
    >
      {(['top', 'right', 'bottom', 'left'] as const).map((placement) => (
        <Tooltip
          key={placement}
          content={`Placed ${placement}`}
          placement={placement}
        >
          <Button variant="secondary">{placement}</Button>
        </Tooltip>
      ))}
    </div>
  ),
};

/**
 * A row of icon buttons, which is where the delays earn their place: sweeping a
 * pointer across them with no `openDelay` strobes every tooltip on the way.
 */
export const InAToolbar: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: 'var(--fm-space-inline-xs)',
        padding: 'var(--fm-space-stack-xl)',
      }}
    >
      {[
        ['Bold', 'B'],
        ['Italic', 'I'],
        ['Underline', 'U'],
        ['Strikethrough', 'S'],
      ].map(([label, glyph]) => (
        <Tooltip key={label} content={label}>
          <Button variant="ghost" aria-label={label}>
            {glyph}
          </Button>
        </Tooltip>
      ))}
    </div>
  ),
};

/**
 * The tooltip is a DESCRIPTION, never a name. The button keeps its own
 * `aria-label`: a tooltip cannot name a control, because on touch it does not
 * exist at all.
 */
export const NamingAnIconButton: Story = {
  render: () => (
    <div style={{ padding: 'var(--fm-space-stack-xl)' }}>
      <Tooltip content="Delete this draft permanently">
        <Button variant="destructive" aria-label="Delete">
          ✕
        </Button>
      </Tooltip>
    </div>
  ),
};
