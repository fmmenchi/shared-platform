import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dialog } from './dialog.component.js';
import { DialogTrigger } from '../dialog-trigger/dialog-trigger.component.js';
import { DialogContent } from '../dialog-content/dialog-content.component.js';
import { DialogHeading } from '../dialog-heading/dialog-heading.component.js';
import { DialogClose } from '../dialog-close/dialog-close.component.js';
import { Button } from '../button/button.component.js';
import { Input } from '../input/input.component.js';

const meta: Meta<typeof Dialog> = {
  title: 'Components/Overlays/Dialog',
  component: Dialog,
  // The Props table is CURATED here (react-docgen can't derive it).
  argTypes: {
    children: {
      control: false,
      description: 'The trigger, the dialog, and whatever else belongs to it.',
      table: { type: { summary: 'ReactNode' } },
    },
    onOpenChange: {
      control: false,
      description:
        'Told when the platform opens or closes it. A **report**, not a control — the state lives in the DOM. To drive it from code, call `showModal()` / `close()` on the content’s ref.',
      table: { type: { summary: '(open: boolean) => void' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Dialog>;

/**
 * Open it, then try to reach the page behind: you cannot. `Escape`, the close
 * button and a click on the backdrop all dismiss it, and the focus goes back to
 * the trigger.
 */
export const Default: Story = {
  render: (args) => (
    <div style={{ padding: 'var(--fm-space-stack-xl)' }}>
      <Dialog {...args}>
        <DialogTrigger variant="destructive">Delete…</DialogTrigger>
        <DialogContent>
          <DialogHeading>Delete this draft?</DialogHeading>
          <p>It cannot be undone.</p>
          <div
            style={{
              display: 'flex',
              gap: 'var(--fm-space-inline-s)',
              marginBlockStart: 'var(--fm-space-stack-m)',
            }}
          >
            <Button variant="destructive">Delete</Button>
            <DialogClose variant="secondary">Cancel</DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  ),
};

/**
 * A dialog that RETURNS something needs no part of ours: `<form method="dialog">`
 * closes it and puts the submit button's `value` in `dialog.returnValue` — the
 * platform's own answer, measured working in all three engines.
 */
export const WithAForm: Story = {
  render: () => (
    <div style={{ padding: 'var(--fm-space-stack-xl)' }}>
      <Dialog>
        <DialogTrigger>Rename…</DialogTrigger>
        <DialogContent>
          <DialogHeading>Rename this file</DialogHeading>
          <form method="dialog">
            <Input defaultValue="report.pdf" aria-label="File name" />
            <div
              style={{
                display: 'flex',
                gap: 'var(--fm-space-inline-s)',
                marginBlockStart: 'var(--fm-space-stack-m)',
              }}
            >
              {/* `type="submit"` explicitly: the DS `Button` defaults a native
                  button to `type="button"`, so without this the form never
                  submits and `returnValue` stays empty — measured, in all three
                  engines, on this very story. */}
              <Button type="submit" value="saved">
                Save
              </Button>
              <Button type="submit" variant="ghost" value="cancelled">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  ),
};

/** Taller than the screen: the dialog scrolls, the page behind does not. */
export const LongContent: Story = {
  render: () => (
    <div style={{ padding: 'var(--fm-space-stack-xl)', height: '200vh' }}>
      <Dialog>
        <DialogTrigger>Terms…</DialogTrigger>
        <DialogContent>
          <DialogHeading>Terms of service</DialogHeading>
          {Array.from({ length: 30 }, (_, row) => (
            <p key={row}>Clause {row + 1}. Something the user must scroll.</p>
          ))}
          <DialogClose>Done</DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  ),
};
