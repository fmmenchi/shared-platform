import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge.component.js';

const VARIANTS = [
  'neutral',
  'primary',
  'accent',
  'destructive',
  'success',
  'warning',
  'info',
] as const;

const meta: Meta<typeof Badge> = {
  title: 'Components/Data display/Badge',
  component: Badge,
  args: { children: 'Badge', variant: 'neutral', emphasis: 'soft', size: 'md' },
  // The Props table is CURATED here (react-docgen can't derive it) — declare
  // every public prop with type summary, default and description.
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: VARIANTS,
      description: 'Semantic colour role — brand identity or status feedback.',
      table: {
        type: { summary: VARIANTS.map((v) => `'${v}'`).join(' | ') },
        defaultValue: { summary: "'neutral'" },
      },
    },
    emphasis: {
      control: 'inline-radio',
      options: ['soft', 'solid'],
      description:
        "Treatment, orthogonal to the colour role: 'soft' (the subtle wash) or 'solid' (the full fill).",
      table: {
        type: { summary: "'soft' | 'solid'" },
        defaultValue: { summary: "'soft'" },
      },
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description: 'Padding-driven size — the pill sits on the text baseline.',
      table: {
        type: { summary: "'sm' | 'md' | 'lg'" },
        defaultValue: { summary: "'md'" },
      },
    },
    icon: {
      control: false,
      description: 'Optional decorative leading icon (aria-hidden, sized 1em).',
      table: { type: { summary: 'ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Badge>;

/** The default control surface (drives the Props table). */
export const Default: Story = {};

const Row = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      display: 'flex',
      gap: 'var(--fm-space-inline-s)',
      alignItems: 'center',
      flexWrap: 'wrap',
    }}
  >
    {children}
  </div>
);

/** Every colour role, soft treatment. */
export const Gallery: Story = {
  render: () => (
    <Row>
      {VARIANTS.map((v) => (
        <Badge key={v} variant={v}>
          {v}
        </Badge>
      ))}
    </Row>
  ),
};

/** Soft (the subtle wash) vs solid (the full fill) — orthogonal to the role. */
export const Emphasis: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Row>
        {VARIANTS.map((v) => (
          <Badge key={v} variant={v} emphasis="soft">
            {v}
          </Badge>
        ))}
      </Row>
      <Row>
        {VARIANTS.map((v) => (
          <Badge key={v} variant={v} emphasis="solid">
            {v}
          </Badge>
        ))}
      </Row>
    </div>
  ),
};

/** sm · md · lg. */
export const Sizes: Story = {
  render: () => (
    <Row>
      <Badge variant="success" size="sm">
        sm
      </Badge>
      <Badge variant="success" size="md">
        md
      </Badge>
      <Badge variant="success" size="lg">
        lg
      </Badge>
    </Row>
  ),
};

/** A decorative leading icon next to the label. */
export const WithIcon: Story = {
  render: () => (
    <Row>
      <Badge
        variant="success"
        icon={
          <svg viewBox="0 0 8 8" aria-hidden="true">
            <circle cx="4" cy="4" r="4" fill="currentColor" />
          </svg>
        }
      >
        Online
      </Badge>
    </Row>
  ),
};
