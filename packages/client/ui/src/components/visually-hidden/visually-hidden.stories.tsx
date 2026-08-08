import type { Meta, StoryObj } from '@storybook/react-vite';
import { VisuallyHidden } from './visually-hidden.component.js';
import { Button } from '../button/button.component.js';

/**
 * A component with nothing to look at, so every story shows the SURROUNDING
 * content and names what a screen reader hears. A gallery of variants would be
 * a blank canvas, which is the one presentation this component cannot use.
 */
const meta: Meta<typeof VisuallyHidden> = {
  title: 'Components/Utilities/VisuallyHidden',
  component: VisuallyHidden,
  args: { children: 'and this is only announced' },
  argTypes: {
    as: {
      control: 'select',
      options: ['span', 'div', 'h2', 'legend'],
      description:
        'Element to render. Put the hiding on the element that had to exist anyway (`as="h2"`) rather than wrapping it — a wrapped `<h2>` stays in flow as an empty box.',
      table: {
        type: { summary: 'ElementType' },
        defaultValue: { summary: "'span'" },
      },
    },
    children: {
      control: 'text',
      description:
        'The content to expose to assistive tech while hiding it from sight.',
      table: { type: { summary: 'ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof VisuallyHidden>;

/**
 * The everyday case: an action whose meaning is carried by an icon, given the
 * words a reader needs. Inspect the DOM — the text is there, sized 1×1 and
 * clipped, and the button's accessible name is "Delete the invoice from March".
 */
export const Usage: Story = {
  render: () => (
    <p>
      <Button variant="destructive">
        Delete <VisuallyHidden>the invoice from March</VisuallyHidden>
      </Button>
    </p>
  ),
};

/**
 * A heading the document owes its outline and the design does not draw. `as`
 * puts the hiding ON the `<h2>`; wrapping one would leave an empty heading box
 * in the flow, with a heading's own margins.
 */
export const AsAHeading: Story = {
  render: () => (
    <section>
      <VisuallyHidden as="h2">Search results</VisuallyHidden>
      <ul>
        <li>Invoice 118 — March</li>
        <li>Invoice 119 — April</li>
      </ul>
    </section>
  ),
};

/**
 * A qualifier that would be noise on screen and is information to a reader.
 * The link's accessible name becomes "Read the changelog (opens in a new tab)".
 */
export const InlineQualifier: Story = {
  render: () => (
    <p>
      <a href="https://example.com" target="_blank" rel="noreferrer">
        Read the changelog
        <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
      </a>
    </p>
  ),
};

/**
 * What it is NOT for. Focusable content hidden this way leaves a sighted
 * keyboard user tabbing onto a control that is one pixel wide, with the focus
 * ring nowhere on screen (WCAG 2.4.7) — so the component warns in development.
 * A control that must be out of the way until focused is a skip link, and
 * `AppLayout` ships one.
 */
export const HidingSomethingFocusableWarns: Story = {
  render: () => (
    <p>
      Open the console:{' '}
      <VisuallyHidden>
        <button type="button">Unreachable on screen</button>
      </VisuallyHidden>
      the warning names the element it found.
    </p>
  ),
};
