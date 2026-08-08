import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppLayout } from './app-layout.component.js';
import { AppLayoutNav } from '../app-layout-nav/app-layout-nav.component.js';
import { AppLayoutNavColumn } from '../app-layout-nav-column/app-layout-nav-column.component.js';
import { AppLayoutNavDrawer } from '../app-layout-nav-drawer/app-layout-nav-drawer.component.js';
import { AppLayoutMain } from '../app-layout-main/app-layout-main.component.js';
import { Nav } from '../nav/nav.component.js';
import { NavLink } from '../nav-link/nav-link.component.js';
import { NavGroup } from '../nav-group/nav-group.component.js';

const meta: Meta<typeof AppLayout> = {
  title: 'Components/Layout/AppLayout',
  component: AppLayout,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    children: {
      control: false,
      description:
        'The regions. `<header>`, `<aside>` and `<footer>` are your own elements; `AppLayoutNav` and `AppLayoutMain` are parts because they carry behaviour.',
      table: { type: { summary: 'ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof AppLayout>;

const nav = (
  <Nav label="Main" orientation="vertical">
    <NavLink href="#overview" current>
      Overview
    </NavLink>
    <NavGroup label="Reports">
      <NavLink href="#daily">Daily</NavLink>
      <NavLink href="#monthly">Monthly</NavLink>
    </NavGroup>
    <NavLink href="#settings">Settings</NavLink>
  </Nav>
);

/**
 * Tab once from the very top: the first thing you meet is **Skip to content**.
 * Narrow the viewport past `48rem` and the navigation column becomes a drawer —
 * no prop changes, and nothing decides it in JavaScript.
 */
export const Default: Story = {
  render: (args) => (
    <AppLayout {...args}>
      <header style={{ padding: 'var(--fm-space-inset-m)' }}>
        <strong>Operator panel</strong>
      </header>
      <AppLayoutNav label="Main">{nav}</AppLayoutNav>
      <AppLayoutMain>
        <h1>Overview</h1>
        <p>
          The page scrolls; the navigation column sticks. The skip link lands
          here.
        </p>
      </AppLayoutMain>
      <footer style={{ padding: 'var(--fm-space-inset-m)' }}>© 2026</footer>
    </AppLayout>
  ),
};

/**
 * Add an `<aside>` and it is three columns — no prop, no second component. The
 * grid asks what is there.
 */
export const WithAside: Story = {
  render: (args) => (
    <AppLayout {...args}>
      <header style={{ padding: 'var(--fm-space-inset-m)' }}>
        <strong>Documentation</strong>
      </header>
      <AppLayoutNav label="Main">{nav}</AppLayoutNav>
      <AppLayoutMain>
        <h1>Getting started</h1>
        <p>Nav on one side, "on this page" on the other.</p>
      </AppLayoutMain>
      <aside style={{ padding: 'var(--fm-space-inset-m)' }}>
        <Nav label="On this page" orientation="vertical">
          <NavLink href="#install">Install</NavLink>
          <NavLink href="#usage">Usage</NavLink>
        </Nav>
      </aside>
      <footer style={{ padding: 'var(--fm-space-inset-m)' }}>© 2026</footer>
    </AppLayout>
  ),
};

/**
 * No navigation column at all — a marketing or commerce page, whose nav lives
 * inside the header. Same component, one region fewer.
 */
export const WithoutNav: Story = {
  render: (args) => (
    <AppLayout {...args}>
      <header style={{ padding: 'var(--fm-space-inset-m)' }}>
        <Nav label="Main">
          <NavLink href="#products">Products</NavLink>
          <NavLink href="#pricing">Pricing</NavLink>
        </Nav>
      </header>
      <AppLayoutMain>
        <h1>Everything you need</h1>
      </AppLayoutMain>
      <footer style={{ padding: 'var(--fm-space-inset-m)' }}>© 2026</footer>
    </AppLayout>
  ),
};

/**
 * The two forms holding DIFFERENT things — the case the slots exist for. Widen
 * and narrow the preview: the column carries the sections only, while the
 * drawer also absorbs the account links that a wide screen shows in the header.
 *
 * Only the form in play is mounted, so the other slot is not hidden markup.
 */
export const DivergentForms: Story = {
  render: (args) => (
    <AppLayout {...args}>
      <header style={{ padding: 'var(--fm-space-inset-m)' }}>
        <strong>Docs</strong>
      </header>
      <AppLayoutNav label="Main">
        <AppLayoutNavColumn>
          <Nav label="Main" orientation="vertical">
            <NavLink href="#install">Install</NavLink>
            <NavLink href="#usage">Usage</NavLink>
          </Nav>
        </AppLayoutNavColumn>
        <AppLayoutNavDrawer>
          <Nav label="Main" orientation="vertical">
            <NavLink href="#install">Install</NavLink>
            <NavLink href="#usage">Usage</NavLink>
            {/* On a wide screen these are in the header, so the column omits them. */}
            <NavLink href="#account">Account</NavLink>
            <NavLink href="#sign-out">Sign out</NavLink>
          </Nav>
        </AppLayoutNavDrawer>
      </AppLayoutNav>
      <AppLayoutMain>
        <h1>Install</h1>
      </AppLayoutMain>
      <footer style={{ padding: 'var(--fm-space-inset-m)' }}>© 2026</footer>
    </AppLayout>
  ),
};
