import type { Meta, StoryObj } from '@storybook/react-vite';
import { Breadcrumb } from './breadcrumb.component.js';
import { BreadcrumbLink } from '../breadcrumb-link/breadcrumb-link.component.js';

const meta: Meta<typeof Breadcrumb> = {
  title: 'Components/Navigation/Breadcrumb',
  component: Breadcrumb,
  subcomponents: { BreadcrumbLink },
  // The Props table is CURATED here (react-docgen can't derive it) — declare
  // every public prop with type summary, default and description.
  argTypes: {
    children: {
      control: false,
      description: 'The trail — `BreadcrumbLink`s, first level first.',
      table: { type: { summary: 'ReactNode' } },
    },
    'aria-label': {
      control: 'text',
      description:
        'Overrides the localized default landmark name ("Breadcrumb").',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "'Breadcrumb' (localized DS copy)" },
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Breadcrumb>;

/** The common case: a hierarchy, the last crumb marked as the page. */
export const Default: Story = {
  render: (args) => (
    <Breadcrumb {...args}>
      <BreadcrumbLink href="#home">Home</BreadcrumbLink>
      <BreadcrumbLink href="#tea">Tea</BreadcrumbLink>
      <BreadcrumbLink href="#oolong" current>
        Oolong
      </BreadcrumbLink>
    </Breadcrumb>
  ),
};

/** A deep trail WRAPS between crumbs, never inside one. */
export const DeepTrail: Story = {
  render: () => (
    <div style={{ maxWidth: '18rem' }}>
      <Breadcrumb>
        <BreadcrumbLink href="#home">Home</BreadcrumbLink>
        <BreadcrumbLink href="#catalogue">Catalogue</BreadcrumbLink>
        <BreadcrumbLink href="#tea">Tea</BreadcrumbLink>
        <BreadcrumbLink href="#oolong">Oolong</BreadcrumbLink>
        <BreadcrumbLink href="#taiwan">Taiwan</BreadcrumbLink>
        <BreadcrumbLink href="#dong-ding" current>
          Dong Ding
        </BreadcrumbLink>
      </Breadcrumb>
    </div>
  ),
};

/**
 * A trail that is a flow, not a hierarchy: the current crumb is a step.
 *
 * This is the right shape only when every entry is a real link and no step has
 * a STATUS. The moment steps are done / here / not-yet — or one has failed —
 * reach for `Stepper`: `current` is a single-valued marker with nowhere to say
 * "behind you", so a breadcrumb leaves that unsaid rather than unsaid-and-shown.
 */
export const WizardSteps: Story = {
  render: () => (
    <Breadcrumb aria-label="Checkout steps">
      <BreadcrumbLink href="#cart">Cart</BreadcrumbLink>
      <BreadcrumbLink href="#shipping" current="step">
        Shipping
      </BreadcrumbLink>
      <BreadcrumbLink href="#payment">Payment</BreadcrumbLink>
    </Breadcrumb>
  ),
};
