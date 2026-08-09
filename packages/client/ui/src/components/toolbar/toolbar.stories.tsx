import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toolbar } from './toolbar.component.js';
import { ToolbarItem } from '../toolbar-item/toolbar-item.component.js';
import { ToolbarSeparator } from '../toolbar-separator/toolbar-separator.component.js';
import { Button } from '../button/button.component.js';
import { Input } from '../input/input.component.js';

const meta: Meta<typeof Toolbar> = {
  title: 'Components/Buttons/Toolbar',
  component: Toolbar,
  // The Props table is CURATED here (react-docgen can't derive it).
  argTypes: {
    label: {
      control: 'text',
      description:
        'What the set of controls is for. Required: a screen reader announces "toolbar", and two of them on a page would otherwise share the name.',
      table: { type: { summary: 'string' } },
    },
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
      description:
        'Which way the bar runs — and with it, which pair of arrows walks the controls.',
      table: {
        type: { summary: "'horizontal' | 'vertical'" },
        defaultValue: { summary: "'horizontal'" },
      },
    },
    children: {
      control: false,
      description: 'One `ToolbarItem` per control.',
      table: { type: { summary: 'ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Toolbar>;

const formatting = (
  <>
    <ToolbarItem>
      <Button variant="secondary" size="sm">
        Bold
      </Button>
    </ToolbarItem>
    <ToolbarItem>
      <Button variant="secondary" size="sm">
        Italic
      </Button>
    </ToolbarItem>
    <ToolbarItem>
      <Button variant="secondary" size="sm">
        Underline
      </Button>
    </ToolbarItem>
    <ToolbarItem>
      <Button variant="secondary" size="sm" disabled>
        Strikethrough
      </Button>
    </ToolbarItem>
    <ToolbarSeparator />
    <ToolbarItem>
      <Button variant="secondary" size="sm">
        Left
      </Button>
    </ToolbarItem>
    <ToolbarItem>
      <Button variant="secondary" size="sm">
        Centre
      </Button>
    </ToolbarItem>
  </>
);

/**
 * Tab in once, then let go of the mouse: the whole bar is ONE stop in the page,
 * and the inline arrows walk it from there. `Home` and `End` reach the ends,
 * and the ring wraps, so holding an arrow never hits a wall.
 *
 * Tab away and back: the focus returns to the control you left, not to the
 * first one.
 *
 * "Strikethrough" is `disabled`, which on our `Button` is the NATIVE attribute
 * — so the arrows step over it, because a control that cannot take the focus is
 * one the ring would stop on. Use `aria-disabled` for a control you want a
 * reader to find and be told is unavailable.
 */
export const Default: Story = {
  args: { label: 'Text formatting' },
  render: (args) => <Toolbar {...args}>{formatting}</Toolbar>,
};

/**
 * The same bar stood on its end — `Up` and `Down` walk it, and the inline
 * arrows go back to being the page's.
 */
export const Vertical: Story = {
  args: { label: 'Text formatting', orientation: 'vertical' },
  render: (args) => (
    <div style={{ maxWidth: '12rem' }}>
      <Toolbar {...args}>{formatting}</Toolbar>
    </div>
  ),
};

/**
 * A field on the bar KEEPS its own arrows: move the caret inside it and the
 * focus stays put. So it is taken off the ring — the arrows step over it — and
 * given a tab stop of its own, which is the APG's second sanctioned answer: it
 * is reached and left with `Tab`.
 *
 * This bar is therefore TWO stops in the page, not one. That is the honest
 * price of putting a field on a toolbar, and much cheaper than the alternative:
 * leaving it on the ring makes it a wall the arrows cannot get past.
 */
export const WithAField: Story = {
  args: { label: 'Text formatting' },
  render: (args) => (
    <Toolbar {...args}>
      <ToolbarItem>
        <Button variant="secondary" size="sm">
          Bold
        </Button>
      </ToolbarItem>
      <ToolbarItem>
        <Button variant="secondary" size="sm">
          Italic
        </Button>
      </ToolbarItem>
      <ToolbarItem>
        <Input aria-label="Font size" defaultValue="14" />
      </ToolbarItem>
    </Toolbar>
  ),
};
