import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.component.js';

/** Decorative demo icon (the DS ships none — apps inject icons). */
const PlusIcon = (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  args: { children: 'Button' },
  // The Props table is CURATED here: the polymorphic generic signature defeats
  // react-docgen, so union types, defaults and descriptions are declared
  // explicitly (see Guidelines/Component docs).
  argTypes: {
    children: {
      control: 'text',
      description: 'Button content.',
      table: { type: { summary: 'ReactNode' } },
    },
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'ghost', 'destructive'],
      description:
        'Colour role — maps 1:1 to a token action family (fill/hover/active/disabled).',
      table: {
        type: { summary: "'primary' | 'secondary' | 'ghost' | 'destructive'" },
        defaultValue: { summary: "'primary'" },
      },
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description: 'Control size.',
      table: {
        type: { summary: "'sm' | 'md' | 'lg'" },
        defaultValue: { summary: "'md'" },
      },
    },
    isLoading: {
      control: 'boolean',
      description:
        'Spinner + localized status; blocks interaction (`aria-busy`, disabled).',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    icon: {
      control: false,
      description:
        'Decorative icon slot (hidden while loading). Icon-only usage requires `aria-label`.',
      table: { type: { summary: 'ReactNode' } },
    },
    as: {
      control: false,
      description:
        'Render as another element/component (`as="a"`, `as={Link}`) keeping the button look; the target element’s props are typed.',
      table: {
        type: { summary: 'ElementType' },
        defaultValue: { summary: "'button'" },
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

/** All colour roles at a glance — each button is labeled with its variant. */
export const Gallery: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  ),
};

/** The size axis, orthogonal to the colour role. */
export const Sizes: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: 'var(--fm-space-inline-s)',
        alignItems: 'center',
      }}
    >
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Destructive: Story = { args: { variant: 'destructive' } };
export const Disabled: Story = { args: { disabled: true } };

/** Icon next to the label: the icon is decorative (aria-hidden). */
export const WithIcon: Story = {
  args: { icon: PlusIcon, children: 'Add item' },
};

/**
 * Icon-only: NO visible text, so `aria-label` is REQUIRED (a dev warning
 * fires without it) — this story is the accessible-name claim, demonstrated.
 */
export const IconOnly: Story = {
  args: { icon: PlusIcon, children: undefined, 'aria-label': 'Add item' },
};

/** Spinner + your label; the localized status is announced to screen readers. */
export const Loading: Story = { args: { isLoading: true, children: 'Save' } };

/**
 * Loading with no visible label: the localized status text becomes the content.
 * Switch the Locale toolbar (English / Italiano / العربية) to see it change —
 * `ar` also flips the layout to RTL.
 */
export const LoadingLabelOnly: Story = {
  args: { isLoading: true, children: undefined },
};

export const AsLink: Story = {
  render: (args) => (
    <Button {...args} as="a" href="/next">
      Link that looks like a button
    </Button>
  ),
};
