import type { Meta, StoryObj } from '@storybook/react-vite';
import { DeclaredPairs } from './color-specimens.js';
import { Palette, SourcePalette } from './palette.js';
import { RoleMatrix } from './matrix.js';
import { PaletteRamps } from './ramps.js';
import {
  ACTION_GROUPS,
  REMAINING_GROUPS,
  STATUS_GROUPS,
} from './token-data.js';

/**
 * STORIES rather than a bare MDX page, and the reason is the Theme toolbar: the
 * decorator that sets `data-theme` runs per story, so specimens built straight
 * into MDX would render in whatever theme was up when the page mounted and then
 * ignore the toggle.
 *
 * It also buys the check for free — `@storybook/addon-vitest` runs stories as
 * tests, so a specimen that throws fails `nx test` instead of quietly rendering
 * an empty page nobody opens.
 */
const meta: Meta = {
  title: 'Foundations/Colors',
  parameters: {
    // Swatch grids and a measurement table have nothing to put in a Controls
    // panel, and an empty one reads as a missing one.
    controls: { disable: true },
  },
};
export default meta;

type Story = StoryObj;

export const Ramps: Story = { render: () => <PaletteRamps /> };

export const Matrix: Story = { render: () => <RoleMatrix /> };

export const FullPalette: Story = { render: () => <SourcePalette /> };

export const Action: Story = {
  render: () => <Palette groups={ACTION_GROUPS} />,
};

export const Status: Story = {
  render: () => <Palette groups={STATUS_GROUPS} />,
};

export const SurfacesInputsNeutrals: Story = {
  render: () => <Palette groups={REMAINING_GROUPS} />,
};

export const Contrast: Story = { render: () => <DeclaredPairs /> };
