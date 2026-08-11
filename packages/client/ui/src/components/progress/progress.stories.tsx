import type { Meta, StoryObj } from '@storybook/react-vite';
import { Progress } from './progress.component.js';

const meta: Meta<typeof Progress> = {
  title: 'Components/Progress',
  component: Progress,
  args: { label: 'Upload', value: 0.4 },
  // The Props table is CURATED here (react-docgen can't derive it) — every
  // public prop, with its type summary, default and description.
  argTypes: {
    label: {
      control: 'text',
      description:
        'What is progressing, in a word or two. Required: a bar with no name announces a percentage of nothing. `aria-labelledby` outranks it.',
      table: { type: { summary: 'string' } },
    },
    value: {
      control: { type: 'number', step: 0.1 },
      description:
        'How far along, between `0` and `max`. **Omit it for indeterminate** — that is the platform’s rule. `0` is a value and says the work has not started.',
      table: { type: { summary: 'number' } },
    },
    max: {
      control: 'number',
      description:
        'The value that means finished. Defaults to the platform’s `1`, so `value={0.4}` is 40%.',
      table: { type: { summary: 'number' }, defaultValue: { summary: '1' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Progress>;

/** Determinate: the caller knows how far along the work is. */
export const Default: Story = {};

/**
 * Indeterminate — no `value` at all. The band sweeps because nobody can say how
 * long it will take; under `prefers-reduced-motion` it stops travelling and
 * breathes instead, because the movement IS the information here and removing
 * it entirely would say "finished".
 */
export const Indeterminate: Story = { args: { value: undefined } };

/** Working in whole percent instead of the platform's 0–1. */
export const OutOfOneHundred: Story = {
  args: { label: 'Import', value: 72, max: 100 },
};

/** The extremes, and the difference between "not started" and "unknown". */
export const Gallery: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-m)',
        inlineSize: '20rem',
      }}
    >
      <Progress label="Not started" value={0} />
      <Progress label="Part way" value={0.4} />
      <Progress label="Finished" value={1} />
      <Progress label="Unknown" />
    </div>
  ),
};
