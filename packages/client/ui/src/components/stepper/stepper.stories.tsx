import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stepper } from './stepper.component.js';
import { StepperItem } from '../stepper-item/stepper-item.component.js';

const meta: Meta<typeof Stepper> = {
  title: 'Components/Navigation/Stepper',
  component: Stepper,
  subcomponents: { StepperItem },
  // The Props table is CURATED here (react-docgen can't derive it) — declare
  // every public prop with type summary, default and description.
  argTypes: {
    children: {
      control: false,
      description: 'The sequence — `StepperItem`s, first step first.',
      table: { type: { summary: 'ReactNode' } },
    },
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
      description: 'Which way the sequence runs.',
      table: {
        type: { summary: "'horizontal' | 'vertical'" },
        defaultValue: { summary: "'horizontal'" },
      },
    },
    'aria-label': {
      control: 'text',
      description:
        'Overrides the localized default landmark name ("Progress").',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "'Progress' (localized DS copy)" },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Stepper>;

/** A checkout, halfway through. */
export const Default: Story = {
  render: () => (
    <Stepper>
      <StepperItem status="complete">Cart</StepperItem>
      <StepperItem status="current">Shipping</StepperItem>
      <StepperItem>Payment</StepperItem>
    </Stepper>
  ),
};

/** The same sequence down a sidebar, where a form takes the rest of the page. */
export const Vertical: Story = {
  render: () => (
    <Stepper orientation="vertical" aria-label="Checkout">
      <StepperItem status="complete">Cart</StepperItem>
      <StepperItem status="current">Shipping</StepperItem>
      <StepperItem>Payment</StepperItem>
      <StepperItem>Review</StepperItem>
    </Stepper>
  ),
};

/**
 * A step that failed. It takes the slot rather than sharing it, because a
 * failure is more urgent than where the reader happens to be — and it says its
 * word ("Has an error") like `complete` does, so the second hue is not the only
 * thing carrying it.
 */
export const WithAnError: Story = {
  render: () => (
    <Stepper aria-label="Checkout">
      <StepperItem status="complete">Cart</StepperItem>
      <StepperItem status="error">Shipping</StepperItem>
      <StepperItem>Payment</StepperItem>
    </Stepper>
  ),
};

/**
 * Steps behind the reader are often reachable again — steps ahead usually are
 * not. That difference is the consumer's to make: pass an `<a>` for the ones
 * they may return to and plain text for the rest, because only the app knows
 * which is which.
 *
 * KNOWN LIMIT: `aria-current` sits on the `<li>` and the status word is the
 * link's sibling, so TABBING to this link announces "Cart, link" and neither.
 * Browse mode reads both. Put the status in the link's own text if focus-mode
 * announcement matters for your flow.
 */
export const WithLinksBack: Story = {
  render: () => (
    <Stepper aria-label="Checkout">
      <StepperItem status="complete">
        <a href="#cart">Cart</a>
      </StepperItem>
      <StepperItem status="current">Shipping</StepperItem>
      <StepperItem>Payment</StepperItem>
    </Stepper>
  ),
};

/** The first step, before anything is done. */
export const AtTheStart: Story = {
  render: () => (
    <Stepper aria-label="Onboarding">
      <StepperItem status="current">Account</StepperItem>
      <StepperItem>Profile</StepperItem>
      <StepperItem>Team</StepperItem>
    </Stepper>
  ),
};

/** A long sequence wraps rather than overflowing. */
export const Wrapping: Story = {
  render: () => (
    <div style={{ maxWidth: '22rem' }}>
      <Stepper aria-label="Application">
        <StepperItem status="complete">Details</StepperItem>
        <StepperItem status="complete">Address</StepperItem>
        <StepperItem status="complete">Employment</StepperItem>
        <StepperItem status="current">Documents</StepperItem>
        <StepperItem>Review</StepperItem>
        <StepperItem>Submit</StepperItem>
      </Stepper>
    </div>
  ),
};

/**
 * Right-to-left: the row reverses and the connector follows it, because the
 * geometry is written in logical properties.
 */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <Stepper aria-label="الدفع">
        <StepperItem status="complete">السلة</StepperItem>
        <StepperItem status="current">الشحن</StepperItem>
        <StepperItem>الدفع</StepperItem>
      </Stepper>
    </div>
  ),
};
