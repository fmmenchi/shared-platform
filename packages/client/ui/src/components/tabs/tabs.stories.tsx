import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs } from './tabs.component.js';
import { TabList } from '../tab-list/tab-list.component.js';
import { Tab } from '../tab/tab.component.js';
import { TabPanel } from '../tab-panel/tab-panel.component.js';

const meta: Meta<typeof Tabs> = {
  title: 'Components/Navigation/Tabs',
  component: Tabs,
  argTypes: {
    children: {
      control: false,
      description: 'A `TabList` of `Tab`s, and the `TabPanel`s they control.',
      table: { type: { summary: 'ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Tabs>;

const sections = (
  <>
    <TabList aria-label="Documentation sections">
      <Tab value="overview">Overview</Tab>
      <Tab value="usage">Usage</Tab>
      <Tab value="api">API</Tab>
    </TabList>
    <TabPanel value="overview">
      <p>What it is, and when to reach for it.</p>
    </TabPanel>
    <TabPanel value="usage">
      <p>How to use it, with the two mistakes people make first.</p>
    </TabPanel>
    <TabPanel value="api">
      <p>Every prop, and what it does when you leave it out.</p>
    </TabPanel>
  </>
);

/**
 * Tab once to reach the list, then the arrows to walk it — nine tabs are one
 * stop on the way down a page, not nine. Selection follows the focus.
 */
export const Default: Story = {
  render: (args) => <Tabs {...args}>{sections}</Tabs>,
};

/**
 * `activation="manual"` for panels that cost something to show: the arrows move
 * the focus, and Enter or Space selects. Arrowing past six panels should not
 * fetch six times.
 */
export const ManualActivation: Story = {
  args: { activation: 'manual' },
  render: (args) => <Tabs {...args}>{sections}</Tabs>,
};

/** The list runs down the side, and the arrows that walk it change with it. */
export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => <Tabs {...args}>{sections}</Tabs>,
};

/**
 * A disabled tab is **focusable**. The arrows walk onto it and it refuses to
 * activate — the APG's "focusable but cannot be activated", because a tab the
 * keyboard skips is one its user is never told exists.
 */
export const WithDisabled: Story = {
  render: (args) => (
    <Tabs {...args}>
      <TabList aria-label="Plans">
        <Tab value="free">Free</Tab>
        <Tab value="team" disabled>
          Team
        </Tab>
        <Tab value="enterprise">Enterprise</Tab>
      </TabList>
      <TabPanel value="free">What you get for nothing.</TabPanel>
      <TabPanel value="team">Not available on your account.</TabPanel>
      <TabPanel value="enterprise">Everything, and a phone number.</TabPanel>
    </Tabs>
  ),
};
