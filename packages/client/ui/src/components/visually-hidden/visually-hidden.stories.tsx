import type { Meta, StoryObj } from '@storybook/react-vite';
import { VisuallyHidden } from './visually-hidden.component.js';
import { Button } from '../button/button.component.js';

/**
 * A component with nothing to look at, so every story shows the SURROUNDING
 * content and names what a screen reader hears. A gallery of variants would be
 * a blank canvas, which is the one presentation this component cannot use.
 *
 * There is deliberately NO live anti-pattern story. Demonstrating "do not hide
 * something focusable" with a real hidden control would put an invisible tab
 * stop on the published docs page and inflict the WCAG 2.4.7 failure on the
 * reader — ADR-0016's own evidence counts a shipped example that commits its
 * violation among the findings that motivated it. The guard is demonstrated in
 * `visually-hidden.test.tsx`, where it costs nobody their focus ring.
 */
const meta: Meta<typeof VisuallyHidden> = {
  title: 'Components/Utilities/VisuallyHidden',
  component: VisuallyHidden,
  args: { children: 'and this part is only announced' },
  argTypes: {
    as: {
      control: 'select',
      // Only what is legal where the Playground renders it. `legend` outside a
      // `<fieldset>` and flow content inside a `<p>` are both invalid markup,
      // and offering them from a control is offering a broken page.
      options: ['span', 'div', 'h2'],
      description:
        'Element to render. Put the hiding on the element that had to exist anyway (`as="h2"`) rather than wrapping it — a wrapped `<h2>` stays in flow as an empty box. A component passed here must forward `className`, or the hiding is lost silently.',
      table: {
        type: { summary: 'ElementType' },
        defaultValue: { summary: "'span'" },
      },
    },
    children: {
      control: 'text',
      description:
        'The content to expose to assistive tech while hiding it from sight. Phrasing content — a `<span>` cannot legally hold a `<div>`, and in SSR the parser reparents it out of the hiding.',
      table: { type: { summary: 'ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof VisuallyHidden>;

/**
 * The control surface that drives the Props table. Args are spread, so the
 * `as` and `children` controls actually do something — inspect the DOM to see
 * the text that never reaches the screen.
 */
export const Playground: Story = {
  render: (args) => (
    <div>
      Visible text <VisuallyHidden {...args} />
    </div>
  ),
};

/**
 * The everyday case: an action whose meaning is carried by an icon, given the
 * words a reader needs. The button's accessible name becomes "Delete the
 * invoice from March" — asserted in the tests, not only claimed here.
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
