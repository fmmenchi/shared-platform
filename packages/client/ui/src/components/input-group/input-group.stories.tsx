import type { Meta, StoryObj } from '@storybook/react-vite';
import { InputGroup } from './input-group.component.js';
import { InputGroupSlot } from '../input-group-slot/input-group-slot.component.js';
import { Input } from '../input/input.component.js';
import { Field } from '../field/field.component.js';
import { FieldLabel } from '../field-label/field-label.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';

const meta: Meta<typeof InputGroup> = {
  title: 'Components/Inputs/InputGroup',
  component: InputGroup,
  // The Props table is CURATED here (react-docgen can't derive it) — declare
  // every public prop with type summary, default and description.
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description:
        'Field height — 32/36/44px, matching Input and Button so controls align. The control inside inherits it, so its own `size` is redundant here.',
      table: {
        type: { summary: "'sm' | 'md' | 'lg'" },
        defaultValue: { summary: "'md'" },
      },
    },
    children: {
      control: false,
      description: 'One control, and the `InputGroupSlot`s inset beside it.',
      table: { type: { summary: 'ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof InputGroup>;

/** A decorative icon inset at the start. It is `aria-hidden` because it repeats
 *  what the label already says — and it lets the click through to the field. */
export const Default: Story = {
  args: { size: 'md' },
  render: (args) => (
    <InputGroup {...args}>
      <InputGroupSlot>
        <span aria-hidden="true">⌕</span>
      </InputGroupSlot>
      <Input aria-label="Search" placeholder="Search" />
    </InputGroup>
  ),
};

/** A slot holding a real control takes its pointer events back. Give that control
 *  its own accessible name — the slot does not name it. */
export const WithAction: Story = {
  render: () => (
    <InputGroup>
      <Input aria-label="Search" defaultValue="fieldset" />
      <InputGroupSlot interactive>
        <button type="button" aria-label="Clear search">
          ✕
        </button>
      </InputGroupSlot>
    </InputGroup>
  ),
};

/** Text on either side: a unit, a currency, a fixed prefix. */
export const Affixes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <InputGroup>
        <InputGroupSlot>€</InputGroupSlot>
        <Input aria-label="Amount" inputMode="decimal" placeholder="0.00" />
      </InputGroup>
      <InputGroup>
        <InputGroupSlot>https://</InputGroupSlot>
        <Input aria-label="Site" placeholder="example.com" />
      </InputGroup>
    </div>
  ),
};

/** Heights match Input and Button, so a row of controls lines up. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <InputGroup key={size} size={size}>
          <InputGroupSlot>
            <span aria-hidden="true">⌕</span>
          </InputGroupSlot>
          <Input aria-label={`Search ${size}`} placeholder={size} />
        </InputGroup>
      ))}
    </div>
  ),
};

/** The group reads the control's own `aria-invalid` and `disabled` — it has no
 *  state of its own to desync (ADR-0013). */
export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <InputGroup>
        <Input aria-label="Amount" aria-invalid defaultValue="-3" />
        <InputGroupSlot>EUR</InputGroupSlot>
      </InputGroup>
      <InputGroup>
        <Input aria-label="Locked" disabled defaultValue="read only" />
        <InputGroupSlot>
          <span aria-hidden="true">🔒</span>
        </InputGroupSlot>
      </InputGroup>
    </div>
  ),
};

/** Inside a `Field`, so the label, description and error wiring still apply — the
 *  group changes the chrome, not the a11y contract. */
export const InAField: Story = {
  render: () => (
    <Field>
      <FieldLabel>Budget</FieldLabel>
      <InputGroup>
        <InputGroupSlot>€</InputGroupSlot>
        <Input inputMode="decimal" placeholder="0.00" />
      </InputGroup>
      <FieldDescription>Per person, taxes included.</FieldDescription>
    </Field>
  ),
};
