import type { Meta, StoryObj } from '@storybook/react-vite';
import { Nav } from './nav.component.js';
import { NavGroup } from '../nav-group/nav-group.component.js';
import { NavLink } from '../nav-link/nav-link.component.js';

const meta: Meta<typeof Nav> = {
  title: 'Components/Navigation/Nav',
  component: Nav,
  argTypes: {
    label: {
      control: 'text',
      description:
        'What this navigation is, in a word or two. Required: a page with two navigation landmarks gives a screen reader user two entries both called “navigation”.',
      table: { type: { summary: 'string' } },
    },
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
      description:
        'A bar whose groups fly out over the page, or a sidebar whose groups open in place and indented. It changes the behaviour, not only the layout — see Usage.',
      table: {
        type: { summary: "'horizontal' | 'vertical'" },
        defaultValue: { summary: "'horizontal'" },
      },
    },
    children: {
      control: false,
      description: '`NavLink`s, and `NavGroup`s for the ones that open.',
      table: { type: { summary: 'ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Nav>;

/** A bar: the groups sit side by side and open over the page, one at a time. */
export const Default: Story = {
  args: { label: 'Main', orientation: 'horizontal' },
  render: (args) => (
    <div style={{ padding: 'var(--fm-space-stack-xl)' }}>
      <Nav {...args}>
        <NavLink href="#home" current>
          Home
        </NavLink>
        <NavGroup label="Products">
          <NavLink href="#tea">Tea</NavLink>
          <NavLink href="#coffee">Coffee</NavLink>
          <NavLink href="#chocolate">Chocolate</NavLink>
        </NavGroup>
        <NavGroup label="About">
          <NavLink href="#team">Team</NavLink>
          <NavLink href="#history">History</NavLink>
        </NavGroup>
        <NavLink href="#contact">Contact</NavLink>
      </Nav>
    </div>
  ),
};

/**
 * A sidebar: the groups open IN PLACE and indented, and every section the
 * reader opened stays open — shutting one to open another loses the place they
 * were keeping.
 */
export const Sidebar: Story = {
  args: { label: 'In this section', orientation: 'vertical' },
  render: (args) => (
    <div style={{ padding: 'var(--fm-space-stack-xl)', maxWidth: '16rem' }}>
      <Nav {...args}>
        <NavLink href="#overview">Overview</NavLink>
        <NavGroup label="Components">
          <NavLink href="#button">Button</NavLink>
          <NavLink href="#menu" current>
            Menu
          </NavLink>
          <NavLink href="#tooltip">Tooltip</NavLink>
        </NavGroup>
        <NavGroup label="Foundations">
          <NavLink href="#tokens">Tokens</NavLink>
          <NavLink href="#motion">Motion</NavLink>
        </NavGroup>
      </Nav>
    </div>
  ),
};
