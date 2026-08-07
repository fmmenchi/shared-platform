import type { Meta, StoryObj } from '@storybook/react-vite';
import { Menubar } from './menubar.component.js';
import { Menu } from '../menu/menu.component.js';
import { MenuContent } from '../menu-content/menu-content.component.js';
import { MenuItem } from '../menu-item/menu-item.component.js';
import { MenuItemTrigger } from '../menu-item-trigger/menu-item-trigger.component.js';

const meta: Meta<typeof Menubar> = {
  title: 'Components/Overlays/Menubar',
  component: Menubar,
  // The Props table is CURATED here (react-docgen can't derive it).
  argTypes: {
    label: {
      control: 'text',
      description:
        'What the bar is called. Required: a screen reader announces "menu bar", and two of them on a page would otherwise share the name.',
      table: { type: { summary: 'string' } },
    },
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
      description:
        'Which way the bar runs — and with it, which arrows walk the commands and where a menu opens.',
      table: {
        type: { summary: "'horizontal' | 'vertical'" },
        defaultValue: { summary: "'horizontal'" },
      },
    },
    children: {
      control: false,
      description: 'One `Menu` per command on the bar.',
      table: { type: { summary: 'ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Menubar>;

const menus = (
  <>
    <Menu>
      <MenuItemTrigger>File</MenuItemTrigger>
      <MenuContent>
        <MenuItem>New</MenuItem>
        <MenuItem>Open…</MenuItem>
        <Menu>
          <MenuItemTrigger>Open recent</MenuItemTrigger>
          <MenuContent>
            <MenuItem>report.pdf</MenuItem>
            <MenuItem>notes.md</MenuItem>
          </MenuContent>
        </Menu>
        <MenuItem>Save</MenuItem>
      </MenuContent>
    </Menu>
    <Menu>
      <MenuItemTrigger>Edit</MenuItemTrigger>
      <MenuContent>
        <MenuItem>Undo</MenuItem>
        <MenuItem disabled>Redo</MenuItem>
        <MenuItem>Cut</MenuItem>
        <MenuItem>Copy link</MenuItem>
      </MenuContent>
    </Menu>
    <Menu>
      <MenuItemTrigger>View</MenuItemTrigger>
      <MenuContent>
        <MenuItem>Zoom in</MenuItem>
        <MenuItem>Zoom out</MenuItem>
      </MenuContent>
    </Menu>
  </>
);

/**
 * Tab in once, then let go of the mouse: the inline arrows walk the bar,
 * `Down` opens a menu at its first command and `Up` at its last, and walking
 * the bar with a menu open carries the menu along it. Typing jumps — "co"
 * reaches "Copy link" from anywhere on the bar.
 */
export const Default: Story = {
  args: { label: 'Editor' },
  render: (args) => (
    <div style={{ padding: 'var(--fm-space-stack-xl)' }}>
      <Menubar {...args}>{menus}</Menubar>
    </div>
  ),
};

/**
 * The same bar stood on its end — the arrows that walk it become `Up`/`Down`,
 * and each menu opens BESIDE its command rather than below it, the way a
 * submenu does.
 */
export const Vertical: Story = {
  args: { label: 'Editor', orientation: 'vertical' },
  render: (args) => (
    <div style={{ padding: 'var(--fm-space-stack-xl)', maxWidth: '12rem' }}>
      <Menubar {...args}>{menus}</Menubar>
    </div>
  ),
};
