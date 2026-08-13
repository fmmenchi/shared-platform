import type { Meta, StoryObj } from '@storybook/react-vite';
import { Numeric } from './numeric.component.js';

const meta: Meta<typeof Numeric> = {
  title: 'Components/Data display/Numeric',
  component: Numeric,
  args: { value: 12345.5 },
  argTypes: {
    value: {
      description:
        'The number. `null`, `undefined` and `NaN` all mean "there isn’t one" — zero does not.',
      table: { type: { summary: 'number | null | undefined' } },
    },
    format: {
      control: 'inline-radio',
      options: ['number', 'integer', 'currency', 'percent'],
      description: 'What the number IS, which decides how it is written.',
      table: {
        type: { summary: "'number' | 'integer' | 'currency' | 'percent'" },
        defaultValue: { summary: "'number'" },
      },
    },
    currency: {
      description:
        'ISO-4217 code. Left out, the app’s answer from `UiProvider` — with neither, nothing is rendered.',
      table: { type: { summary: 'string' } },
    },
    scale: {
      control: 'inline-radio',
      options: ['ratio', 'units'],
      description: '`0.15` → 15% (`ratio`) or `15` → 15% (`units`).',
      table: {
        type: { summary: "'ratio' | 'units'" },
        defaultValue: { summary: "'ratio'" },
      },
    },
    grouping: {
      control: 'inline-radio',
      options: ['auto', 'always', 'never'],
      description:
        'Thousands separators. `auto` is the language’s own rule — Italian writes `1234` plain and `12.345` grouped.',
      table: {
        type: { summary: "'auto' | 'always' | 'never'" },
        defaultValue: { summary: "'auto'" },
      },
    },
    currencyDisplay: {
      control: 'inline-radio',
      options: ['symbol', 'narrowSymbol', 'code', 'name'],
      table: { defaultValue: { summary: "'symbol'" } },
    },
    fallback: {
      description:
        'What to render when there is no number. Nothing by default.',
      table: {
        type: { summary: 'ReactNode' },
        defaultValue: { summary: 'null' },
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Numeric>;

export const Number_: Story = { name: 'Number' };

/** Each format on a value that suits it. */
export const Formats: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-xs)' }}>
      <Numeric value={12345.678} />
      <Numeric value={12345.678} format="integer" />
      <Numeric value={1234.5} format="currency" currency="EUR" />
      <Numeric value={0.155} format="percent" maximumFractionDigits={1} />
    </div>
  ),
};

/**
 * Zero is a number. Every hand-rolled formatter guards with `value ? … : ''`
 * and turns a balance of zero into an empty cell, which reads as missing data.
 */
export const Zero: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-xs)' }}>
      <Numeric value={0} />
      <Numeric value={0} format="currency" currency="EUR" />
      <Numeric value={null} fallback="—" />
    </div>
  ),
};

/**
 * `auto` follows the language: Italian declares `minimumGroupingDigits: 2`, so
 * four digits are written plain. `always` overrides the language, which is what
 * `useGrouping: true` does and why it is not the default.
 */
export const Grouping: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-xs)' }}>
      <Numeric value={1234} grouping="auto" />
      <Numeric value={1234} grouping="always" />
      <Numeric value={1234} grouping="never" />
    </div>
  ),
};
