import type { Meta, StoryObj } from '@storybook/react-vite';
import { InputGroup } from './input-group.component.js';
import { Input } from '../input/input.component.js';
import { Field } from '../field/field.component.js';
import { FieldLabel } from '../field-label/field-label.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';

const meta: Meta<typeof InputGroup> = {
  title: 'Components/Inputs/InputGroup',
  component: InputGroup,
  // The Props table is CURATED here (react-docgen can't derive it). There is one
  // row to declare: everything else is a native div prop, and there is no size
  // axis — the height comes from the control.
  argTypes: {
    children: {
      control: false,
      description:
        'One control, and whatever you inset beside it. Anything that is not the control is spaced by the row’s gap and reads as secondary.',
      table: { type: { summary: 'ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof InputGroup>;

/** An icon inset before the control. It is `aria-hidden` because it repeats what
 *  the label already says — an icon that adds nothing to a screen reader is noise. */
export const Default: Story = {
  render: () => (
    <InputGroup>
      <span aria-hidden="true">⌕</span>
      <Input aria-label="Search" placeholder="Search" />
    </InputGroup>
  ),
};

/** Put a control beside the field and it behaves like one — it keeps its own click
 *  and its own focus ring, and the field's ring stays off while it has focus. */
export const WithAction: Story = {
  render: () => (
    <InputGroup>
      <Input aria-label="Search" defaultValue="fieldset" />
      <button type="button" aria-label="Clear search">
        ✕
      </button>
    </InputGroup>
  ),
};

/** A unit or currency beside the value. The affix is NOT associated with the
 *  control, so whatever it means has to be in the label or the description —
 *  here the label carries it and the symbol is decorative. */
export const Affix: Story = {
  render: () => (
    <InputGroup>
      <Input
        aria-label="Amount in euros"
        inputMode="decimal"
        placeholder="0.00"
      />
      <span aria-hidden="true">€</span>
    </InputGroup>
  ),
};

/** The height comes from the control, so a grouped field lines up with a bare one
 *  and `size` is declared in exactly one place. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <InputGroup key={size}>
          <span aria-hidden="true">⌕</span>
          <Input size={size} aria-label={`Search ${size}`} placeholder={size} />
        </InputGroup>
      ))}
      <Input
        size="md"
        aria-label="Bare, for comparison"
        placeholder="no group"
      />
    </div>
  ),
};

/** The group reads the control's own `aria-invalid` and `disabled` — it has no
 *  state of its own to desync (ADR-0013). */
export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <InputGroup>
        <Input aria-label="Amount in euros" aria-invalid defaultValue="-3" />
        <span aria-hidden="true">€</span>
      </InputGroup>
      <InputGroup>
        <Input aria-label="Locked" disabled defaultValue="read only" />
        <span aria-hidden="true">🔒</span>
      </InputGroup>
    </div>
  ),
};

/** Inside a `Field`, so the label, description and error wiring still apply — the
 *  group changes the chrome, not the a11y contract. The label is where the unit
 *  is stated, because the affix beside the control is not associated with it. */
export const InAField: Story = {
  render: () => (
    <Field>
      <FieldLabel>Budget per person, in euros</FieldLabel>
      <InputGroup>
        <Input inputMode="decimal" placeholder="0.00" />
        <span aria-hidden="true">€</span>
      </InputGroup>
      <FieldDescription>Taxes included.</FieldDescription>
    </Field>
  ),
};

/** An error goes through three components that know nothing about each other:
 *  `Field` puts `aria-invalid` on the CONTROL, the group reads it off its direct
 *  child to draw the chrome, and `FieldError` describes the control. The group has
 *  no `invalid` prop of its own — it would be a third source of truth. */
export const WithError: Story = {
  render: () => (
    <Field invalid>
      <FieldLabel>Budget per person, in euros</FieldLabel>
      <InputGroup>
        <Input inputMode="decimal" defaultValue="-3" />
        <span aria-hidden="true">€</span>
      </InputGroup>
      <FieldError>Enter an amount above zero.</FieldError>
    </Field>
  ),
};
