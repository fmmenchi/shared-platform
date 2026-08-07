import type { Meta, StoryObj } from '@storybook/react-vite';
import { Menu } from './menu.component.js';
import { MenuTrigger } from '../menu-trigger/menu-trigger.component.js';
import { MenuContent } from '../menu-content/menu-content.component.js';
import { MenuItem } from '../menu-item/menu-item.component.js';
import { MenuItemTrigger } from '../menu-item-trigger/menu-item-trigger.component.js';
import { MenuItemCheckbox } from '../menu-item-checkbox/menu-item-checkbox.component.js';
import { MenuItemRadio } from '../menu-item-radio/menu-item-radio.component.js';
import { MenuGroup } from '../menu-group/menu-group.component.js';
import { MenuSeparator } from '../menu-separator/menu-separator.component.js';

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
 * and the disabled command reached like any other, and inert.
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
 * A submenu is a `Menu` inside a `MenuContent` — same component, so same
 * arrows, same typing, same sheet on a phone. `→` goes in and `←` comes back
 * (mirrored for a right-to-left reader); `Escape` unwinds one level at a time,
 * and choosing a command closes the lot.
 */
export const Submenu: Story = {
  render: () => (
    <div style={{ padding: 'var(--fm-space-stack-xl)' }}>
      <Menu>
        <MenuTrigger variant="secondary">Actions</MenuTrigger>
        <MenuContent>
          <MenuItem>Rename…</MenuItem>
          <Menu>
            <MenuItemTrigger>Share</MenuItemTrigger>
            <MenuContent>
              <MenuItem>Email</MenuItem>
              <MenuItem>Copy link</MenuItem>
              <Menu>
                <MenuItemTrigger>Social</MenuItemTrigger>
                <MenuContent>
                  <MenuItem>Mastodon</MenuItem>
                  <MenuItem>Bluesky</MenuItem>
                </MenuContent>
              </Menu>
            </MenuContent>
          </Menu>
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
 * it, and the search forgets itself a second after you stop.
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

/**
 * The same menu on a touch screen. Open this story in a device toolbar (or on a
 * phone) and it is a sheet on the bottom edge, full width, with rows sized for a
 * finger — one media query, no JavaScript, so it follows the INPUT rather than
 * the screen width.
 */
export const OnTouch: Story = {
  render: () => (
    <div style={{ padding: 'var(--fm-space-stack-xl)' }}>
      <Menu>
        <MenuTrigger>Actions</MenuTrigger>
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

/**
 * Commands that carry a STATE. The mark is a real `<input>` wearing the menu's
 * role — which "ARIA in HTML" allows — so the browser draws the box, the tick
 * and the dot exactly as it draws them in a form, and a radio set is grouped by
 * `name` by the browser rather than by us.
 */
export const Checkable: Story = {
  render: (args) => (
    <div style={{ padding: 'var(--fm-space-stack-xl)' }}>
      <Menu {...args}>
        <MenuTrigger variant="secondary">View</MenuTrigger>
        <MenuContent>
          <MenuItem>Reload</MenuItem>
          <MenuSeparator />
          <MenuItemCheckbox defaultChecked closeOnSelect={false}>
            Show sidebar
          </MenuItemCheckbox>
          <MenuItemCheckbox closeOnSelect={false}>Word wrap</MenuItemCheckbox>
          <MenuItemCheckbox disabled>Minimap</MenuItemCheckbox>
          <MenuSeparator />
          <MenuGroup label="Sort by">
            <MenuItemRadio name="sort" defaultChecked>
              Date
            </MenuItemRadio>
            <MenuItemRadio name="sort">Name</MenuItemRadio>
            <MenuItemRadio name="sort">Size</MenuItemRadio>
          </MenuGroup>
        </MenuContent>
      </Menu>
    </div>
  ),
};
