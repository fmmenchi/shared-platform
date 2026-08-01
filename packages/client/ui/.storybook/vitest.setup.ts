/**
 * Setup for the `storybook` Vitest project — the one that runs every story as a
 * test (see `vite.config.mts`).
 *
 * `setProjectAnnotations(preview)` is what makes a story rendered by Vitest
 * identical to the one rendered in the Storybook UI: the decorators, the
 * globals and the parameters from `preview.tsx` all apply. Without it a story
 * would render bare — no `UiProvider`, no `data-theme` on the root — and would
 * be testing a component the app never shows.
 */
import { beforeAll } from 'vitest';
import { setProjectAnnotations } from '@storybook/react-vite';

import preview from './preview';

const project = setProjectAnnotations([preview]);

beforeAll(project.beforeAll);
