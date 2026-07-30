import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from './alert.component.js';

const VARIANTS = ['info', 'success', 'warning', 'error'] as const;

const meta: Meta<typeof Alert> = {
  title: 'Components/Feedback/Alert',
  component: Alert,
  args: { children: 'Your changes have been saved.', variant: 'info' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: VARIANTS,
      description:
        'Semantic status role — sets the colour and the severity word.',
      table: {
        type: { summary: VARIANTS.map((v) => `'${v}'`).join(' | ') },
        defaultValue: { summary: "'info'" },
      },
    },
    live: {
      control: 'inline-radio',
      options: ['off', 'polite', 'assertive'],
      description:
        'How assistive tech announces it: polite (role=status), assertive (role=alert), off (none). Defaults by variant — error is assertive, the rest polite.',
      table: {
        type: { summary: "'off' | 'polite' | 'assertive'" },
        defaultValue: { summary: 'by variant' },
      },
    },
    title: {
      control: 'text',
      description: 'Optional bold lead-in above the message.',
      table: { type: { summary: 'ReactNode' } },
    },
    icon: {
      control: false,
      description:
        'Optional decorative leading icon (aria-hidden). App-provided.',
      table: { type: { summary: 'ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Alert>;

/** The default control surface (drives the Props table). */
export const Default: Story = {};

/** Every status variant. */
export const Gallery: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Alert variant="info">A new version is available.</Alert>
      <Alert variant="success">Your changes have been saved.</Alert>
      <Alert variant="warning">Your trial ends in 3 days.</Alert>
      <Alert variant="error">We couldn’t process your payment.</Alert>
    </div>
  ),
};

/** With a bold title above the message. */
export const WithTitle: Story = {
  args: {
    variant: 'error',
    title: 'Payment failed',
    children: 'Your card was declined. Try another payment method.',
  },
};

/** With a decorative leading icon (the text still carries the meaning). */
export const WithIcon: Story = {
  args: {
    variant: 'success',
    title: 'Saved',
    children: 'All your changes are up to date.',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M7.5 13.5l-3-3 1-1 2 2 5-5 1 1z" fill="currentColor" />
      </svg>
    ),
  },
};
