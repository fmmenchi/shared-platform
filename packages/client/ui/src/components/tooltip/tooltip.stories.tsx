import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip } from './tooltip.component.js';
import { TooltipProvider } from './tooltip.context.js';
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
      control: 'select',
      options: [
        'top',
        'top-start',
        'top-end',
        'right',
        'right-start',
        'right-end',
        'bottom',
        'bottom-start',
        'bottom-end',
        'left',
        'left-start',
        'left-end',
      ],
      description:
        'Preferred side, and where it sits along that side. The bare side is **centred** — `top` means "above, centred on the trigger" — and `-start` / `-end` are the alignment. They are LOGICAL: in RTL, `top-start` is on the right. Flipped automatically when there is no room, and slid back in when it would leave the viewport.',
      table: {
        type: {
          summary: "'top' | 'top-start' | 'top-end' | 'right' | … | 'left-end'",
        },
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

/**
 * All twelve. The bare side is **centred**; `-start` and `-end` align it along
 * that side. Every one of them flips when the viewport gets in the way, so what
 * you ask for is a preference, not an instruction.
 */
export const Placements: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, max-content)',
        gap: 'var(--fm-space-inline-m) var(--fm-space-inline-l)',
        padding: 'var(--fm-space-stack-xl)',
      }}
    >
      {(
        [
          'top-start',
          'top',
          'top-end',
          'right-start',
          'right',
          'right-end',
          'bottom-start',
          'bottom',
          'bottom-end',
          'left-start',
          'left',
          'left-end',
        ] as const
      ).map((placement) => (
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
 * `-start` and `-end` follow the writing direction rather than the screen: under
 * `dir="rtl"` the same `top-start` sits on the RIGHT of the trigger. Nothing in
 * the component says so — the geometry is asked for a direction and answers.
 */
export const AlignmentIsLogical: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-xl)' }}>
      {(['ltr', 'rtl'] as const).map((dir) => (
        <div
          key={dir}
          dir={dir}
          style={{
            display: 'flex',
            gap: 'var(--fm-space-inline-l)',
            padding: 'var(--fm-space-stack-xl)',
            border: '1px dashed var(--fm-color-border)',
          }}
        >
          <Tooltip content={`${dir}: top-start`} placement="top-start">
            <Button variant="secondary">top-start</Button>
          </Tooltip>
          <Tooltip content={`${dir}: top-end`} placement="top-end">
            <Button variant="secondary">top-end</Button>
          </Tooltip>
        </div>
      ))}
    </div>
  ),
};

/**
 * A row of icon buttons, which is where the delays earn their place: sweeping a
 * pointer across them with no `openDelay` strobes every tooltip on the way.
 *
 * Wrapped in a `TooltipProvider`, so the row behaves as one set — wait once for
 * the first label and the rest are instant, and never two at a time. Hover the
 * first button, then move along the row.
 */
export const InAToolbar: Story = {
  render: () => (
    <TooltipProvider>
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
    </TooltipProvider>
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
