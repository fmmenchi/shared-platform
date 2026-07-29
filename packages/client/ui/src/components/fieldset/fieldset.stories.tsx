import type { Meta, StoryObj } from '@storybook/react-vite';
import { Fieldset } from './fieldset.component.js';
import { FieldsetLegend } from './fieldset-legend.component.js';
import { FieldDescription } from '../field/field-description.component.js';
import { FieldsetContent } from './fieldset-content.component.js';
import { FieldError } from '../field/field-error.component.js';
import { Field } from '../field/field.component.js';
import { FieldLabel } from '../field/field-label.component.js';
import { Input } from '../input/input.component.js';

const meta: Meta<typeof Fieldset> = {
  title: 'Components/Fieldset',
  component: Fieldset,
  // The Props table is CURATED here (react-docgen can't derive it) — declare
  // every public prop with type summary, default and description.
  argTypes: {
    invalid: {
      control: 'boolean',
      description:
        'Error state of the GROUP: exposes `data-invalid` for your styling, plus `aria-invalid` when `role="radiogroup"`. It does not reveal the error on its own, and is not mirrored onto the controls inside.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    disabled: {
      control: 'boolean',
      description:
        'Native `<fieldset disabled>` — disables every control inside, for free.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    children: {
      control: false,
      description:
        'The `FieldsetLegend`, `FieldDescription`, `FieldsetContent` and `FieldError` parts.',
      table: { type: { summary: 'ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Fieldset>;

/** A radio group — the case a fieldset exists for. */
export const Default: Story = {
  args: { invalid: false },
  render: (args) => (
    <Fieldset {...args}>
      <FieldsetLegend>Favourite colour</FieldsetLegend>
      <FieldDescription>Pick exactly one.</FieldDescription>
      <FieldsetContent>
        <label>
          <input type="radio" name="colour" value="green" /> Green
        </label>
        <label>
          <input type="radio" name="colour" value="yellow" /> Yellow
        </label>
      </FieldsetContent>
    </Fieldset>
  ),
};

/** The message is described once, for the whole group, instead of repeated on
 *  every option. `role="radiogroup"` is what lets `invalid` also expose
 *  `aria-invalid` — on a plain `<fieldset>` (`role=group`) that attribute has no
 *  meaning, so the error text alone conveys the state. */
export const Invalid: Story = {
  render: () => (
    <Fieldset invalid role="radiogroup">
      <FieldsetLegend>Favourite colour</FieldsetLegend>
      <FieldsetContent>
        <label>
          <input type="radio" name="colour-invalid" value="green" /> Green
        </label>
        <label>
          <input type="radio" name="colour-invalid" value="yellow" /> Yellow
        </label>
      </FieldsetContent>
      <FieldError>Choose a colour to continue.</FieldError>
    </Fieldset>
  ),
};

/** `FieldsetContent` owns the options' layout — a stack or a wrapping row. */
export const Orientation: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      <Fieldset>
        <FieldsetLegend>Vertical (default)</FieldsetLegend>
        <FieldsetContent>
          <label>
            <input type="checkbox" name="v" value="email" /> Email
          </label>
          <label>
            <input type="checkbox" name="v" value="sms" /> SMS
          </label>
        </FieldsetContent>
      </Fieldset>
      <Fieldset>
        <FieldsetLegend>Horizontal</FieldsetLegend>
        <FieldsetContent orientation="horizontal">
          <label>
            <input type="checkbox" name="h" value="email" /> Email
          </label>
          <label>
            <input type="checkbox" name="h" value="sms" /> SMS
          </label>
        </FieldsetContent>
      </Fieldset>
    </div>
  ),
};

/** Native `disabled` on the fieldset disables every control inside. The reason it
 *  is unavailable sits OUTSIDE the fieldset: nothing inside a disabled group is
 *  focusable, so a `FieldDescription` there could never be reached by anyone
 *  navigating by focus. */
export const Disabled: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-internal-xs)' }}>
      <p style={{ margin: 0 }}>Sign in to choose a colour.</p>
      <Fieldset disabled>
        <FieldsetLegend>Favourite colour</FieldsetLegend>
        <FieldsetContent>
          <label>
            <input type="radio" name="colour-disabled" value="green" /> Green
          </label>
          <label>
            <input type="radio" name="colour-disabled" value="yellow" /> Yellow
          </label>
        </FieldsetContent>
      </Fieldset>
    </div>
  ),
};

/** A group of separate fields, each with its own label — `Field` inside
 *  `Fieldset`. Each description binds to its own owner. */
export const WithFields: Story = {
  render: () => (
    <Fieldset>
      <FieldsetLegend>Billing address</FieldsetLegend>
      <FieldDescription>Used for the invoice only.</FieldDescription>
      <FieldsetContent>
        <Field>
          <FieldLabel>Street</FieldLabel>
          <Input />
        </Field>
        <Field>
          <FieldLabel>City</FieldLabel>
          <Input />
        </Field>
      </FieldsetContent>
    </Fieldset>
  ),
};

/** Two groups in the consumer's own 2-column grid — a `<fieldset>` shrinks to
 *  its track here only because the UA `min-inline-size: min-content` is reset. */
export const InAGrid: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 'var(--fm-space-inline-m)',
      }}
    >
      <Fieldset>
        <FieldsetLegend>Favourite colour</FieldsetLegend>
        <FieldsetContent>
          <label>
            <input type="radio" name="g1" value="green" /> Green
          </label>
          <label>
            <input type="radio" name="g1" value="yellow" /> Yellow
          </label>
        </FieldsetContent>
      </Fieldset>
      <Fieldset>
        <FieldsetLegend>Contact channel</FieldsetLegend>
        <FieldsetContent>
          <label>
            <input type="radio" name="g2" value="email" /> Email
          </label>
          <label>
            <input type="radio" name="g2" value="sms" /> SMS
          </label>
        </FieldsetContent>
      </Fieldset>
    </div>
  ),
};
