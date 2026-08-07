import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dialog } from './dialog.component.js';
import { DialogTrigger } from '../dialog-trigger/dialog-trigger.component.js';
import { DialogContent } from '../dialog-content/dialog-content.component.js';
import { Nav } from '../nav/nav.component.js';
import { NavLink } from '../nav-link/nav-link.component.js';
import { NavGroup } from '../nav-group/nav-group.component.js';
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

/**
 * A DRAWER: `side` pins the same modal to an edge instead of centring it.
 * Everything that makes a dialog a dialog is unchanged — the focus is trapped,
 * the page is inert and unscrollable, `Escape` and the backdrop dismiss it —
 * so this is geometry, not a second component.
 *
 * The edges are LOGICAL: switch the locale to Arabic and it pins, and slides
 * in, from the other side.
 */
export const Drawer: Story = {
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger variant="secondary">Menu</DialogTrigger>
      <DialogContent side="inline-start" aria-label="Navigation menu">
        <DialogClose variant="secondary">Close</DialogClose>
        <Nav
          label="Main"
          orientation="vertical"
          // CHOOSING A DESTINATION CLOSES IT. `NavLink` adds no handler on
          // purpose — a link is the one control the browser does perfectly —
          // so with a client router the route changes underneath and the
          // drawer would stay open over the page it just navigated to.
          onClick={(event) => {
            if ((event.target as Element).closest('a')) {
              event.currentTarget.closest('dialog')?.close();
            }
          }}
        >
          <NavLink href="#home" current>
            Home
          </NavLink>
          <NavGroup label="Products">
            <NavLink href="#tea">Tea</NavLink>
            <NavLink href="#coffee">Coffee</NavLink>
          </NavGroup>
          <NavLink href="#contact">Contact</NavLink>
        </Nav>
      </DialogContent>
    </Dialog>
  ),
};

/** The same thing along the bottom, where a phone expects a sheet. */
export const Sheet: Story = {
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger variant="secondary">Options</DialogTrigger>
      <DialogContent side="block-end" aria-label="Options">
        <DialogClose variant="secondary">Close</DialogClose>
        <Nav label="Options" orientation="vertical">
          <NavLink href="#share">Share</NavLink>
          <NavLink href="#rename">Rename</NavLink>
        </Nav>
      </DialogContent>
    </Dialog>
  ),
};
