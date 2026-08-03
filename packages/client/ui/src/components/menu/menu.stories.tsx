import type { Meta, StoryObj } from '@storybook/react-vite';
import { Menu } from './menu.component.js';
import { MenuTrigger } from '../menu-trigger/menu-trigger.component.js';
import { MenuContent } from '../menu-content/menu-content.component.js';
import { MenuItem } from '../menu-item/menu-item.component.js';

const meta: Meta<typeof Menu> = {
  title: 'Components/Overlays/Menu',
  component: Menu,
  // The Props table is CURATED here (react-docgen can't derive it).
  argTypes: {
    children: {
      control: false,
      description: 'The trigger, the menu, and the items inside it.',
      table: { type: { summary: 'ReactNode' } },
    },
    placement: {
      control: 'select',
      options: [
        'bottom-start',
        'bottom',
        'bottom-end',
        'top-start',
        'top',
        'top-end',
      ],
      description:
        'Preferred side of the trigger, and where it sits along it. Flipped when there is no room.',
      table: {
        type: { summary: "'bottom-start' | 'bottom' | … | 'top-end'" },
        defaultValue: { summary: "'bottom-start'" },
      },
    },
    onOpenChange: {
      control: false,
      description:
        'Called whenever it opens or closes — the trigger, `Escape`, a click outside, or a command being chosen.',
      table: { type: { summary: '(open: boolean) => void' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Menu>;

/**
 * Open it and use the arrows: one Tab stop, `Home`/`End`, wrapping at the ends,
 * and the disabled command stepped over but still announced.
 */
export const Default: Story = {
  render: (args) => (
    <div style={{ padding: 'var(--fm-space-stack-xl)' }}>
      <Menu {...args}>
        <MenuTrigger variant="secondary">Actions</MenuTrigger>
        <MenuContent>
          <MenuItem>Rename…</MenuItem>
          <MenuItem>Duplicate</MenuItem>
          <MenuItem disabled>Move to…</MenuItem>
          <MenuItem>Delete</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  ),
};

/**
 * Type a letter or two with it open: the focus goes to the command that starts
 * with what you typed. The same letter over and over walks the ones that share
 * it, and the search forgets itself half a second after you stop.
 */
export const Typeahead: Story = {
  render: () => (
    <div style={{ padding: 'var(--fm-space-stack-xl)' }}>
      <Menu>
        <MenuTrigger>Insert</MenuTrigger>
        <MenuContent>
          <MenuItem>Chart</MenuItem>
          <MenuItem>Checklist</MenuItem>
          <MenuItem>Code block</MenuItem>
          <MenuItem>Divider</MenuItem>
          <MenuItem disabled>Equation</MenuItem>
          <MenuItem>Image</MenuItem>
          <MenuItem>Table</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  ),
};

/** The pointer and the keyboard highlight the same item, never two. */
export const PointerAndKeyboard: Story = {
  render: () => (
    <div style={{ padding: 'var(--fm-space-stack-xl)' }}>
      <Menu>
        <MenuTrigger>Sort by</MenuTrigger>
        <MenuContent>
          <MenuItem>Name</MenuItem>
          <MenuItem>Date modified</MenuItem>
          <MenuItem>Size</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  ),
};
