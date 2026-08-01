import type { Meta, StoryObj } from '@storybook/react-vite';
import { Popover } from './popover.component.js';
import { PopoverTrigger } from '../popover-trigger/popover-trigger.component.js';
import { PopoverContent } from '../popover-content/popover-content.component.js';
import { PopoverHeading } from '../popover-heading/popover-heading.component.js';
import { PopoverClose } from '../popover-close/popover-close.component.js';
import { Button } from '../button/button.component.js';
import { Input } from '../input/input.component.js';

const meta: Meta<typeof Popover> = {
  title: 'Components/Overlays/Popover',
  component: Popover,
  // The Props table is CURATED here (react-docgen can't derive it).
  argTypes: {
    children: {
      control: false,
      description:
        'The trigger, the content, and whatever else belongs to this popover.',
      table: { type: { summary: 'ReactNode' } },
    },
    placement: {
      control: 'select',
      options: [
        'bottom',
        'bottom-start',
        'bottom-end',
        'top',
        'top-start',
        'top-end',
        'left',
        'right',
      ],
      description:
        'Preferred side of the trigger, and where it sits along it. Logical: `-start` is the right-hand edge under `dir="rtl"`. Flipped when there is no room.',
      table: {
        type: { summary: "'bottom' | 'bottom-start' | … | 'left-end'" },
        defaultValue: { summary: "'bottom'" },
      },
    },
    onOpenChange: {
      control: false,
      description:
        'Told when the platform opens or closes it. A **report**, not a control — the state lives in the DOM. To drive it from code, call `showPopover()` / `hidePopover()` on the content’s ref.',
      table: { type: { summary: '(open: boolean) => void' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Popover>;

/** Click the trigger. `Escape`, or a click outside, closes it. */
export const Default: Story = {
  render: (args) => (
    <div style={{ padding: 'var(--fm-space-stack-xl)' }}>
      <Popover {...args}>
        <PopoverTrigger>Share</PopoverTrigger>
        <PopoverContent>
          <PopoverHeading>Share this page</PopoverHeading>
          <p>Anyone with the link can read it.</p>
          <Button variant="secondary">Copy link</Button>
        </PopoverContent>
      </Popover>
    </div>
  ),
};

/**
 * What separates it from a tooltip: the content takes focus, so anything in it
 * can be operated. Tab through the field and the buttons.
 */
export const WithAForm: Story = {
  render: () => (
    <div style={{ padding: 'var(--fm-space-stack-xl)' }}>
      <Popover placement="bottom-start">
        <PopoverTrigger variant="secondary">Rename</PopoverTrigger>
        <PopoverContent>
          <PopoverHeading>Rename this file</PopoverHeading>
          <Input defaultValue="report.pdf" aria-label="File name" />
          <div
            style={{
              display: 'flex',
              gap: 'var(--fm-space-inline-s)',
              marginBlockStart: 'var(--fm-space-stack-s)',
            }}
          >
            <Button>Save</Button>
            <PopoverClose as={Button} variant="ghost">
              Cancel
            </PopoverClose>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  ),
};

/**
 * The side is a preference: it flips when there is no room and slides back in
 * when it would leave the viewport.
 */
export const Placements: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: 'var(--fm-space-inline-m)',
        padding: 'var(--fm-space-stack-xl)',
      }}
    >
      {(['top', 'bottom-start', 'right', 'left'] as const).map((placement) => (
        <Popover key={placement} placement={placement}>
          <PopoverTrigger variant="secondary">{placement}</PopoverTrigger>
          <PopoverContent>
            <PopoverHeading>{placement}</PopoverHeading>
            <p>Placed {placement}.</p>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  ),
};
