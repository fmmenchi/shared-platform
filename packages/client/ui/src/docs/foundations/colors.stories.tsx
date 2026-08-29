import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  ActionFamilies,
  DeclaredPairs,
  StatusFamilies,
  SurfacesAndInputs,
} from './color-specimens.js';

/**
 * STORIES rather than a bare MDX page, and the reason is the Theme toolbar:
 * the decorator that sets `data-theme` runs per story, so a page built out of
 * plain MDX components would render every specimen in whatever theme was up
 * when it mounted and then ignore the toggle.
 *
 * It also buys the check for free — `@storybook/addon-vitest` runs stories as
 * tests, so a specimen that throws fails `nx test` instead of quietly rendering
 * an empty page nobody opens.
 */
const meta: Meta = {
  title: 'Foundations/Colors',
  parameters: {
    // The specimens are swatch grids and a measurement table: a Controls panel
    // has nothing to offer them, and an empty one reads as a missing one.
    controls: { disable: true },
  },
};
export default meta;

type Story = StoryObj;

export const Action: Story = { render: () => <ActionFamilies /> };
export const Status: Story = { render: () => <StatusFamilies /> };
export const SurfacesInputsNeutrals: Story = {
  render: () => <SurfacesAndInputs />,
};
export const Contrast: Story = { render: () => <DeclaredPairs /> };
