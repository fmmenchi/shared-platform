import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormColorPicker } from './form-color-picker.component.js';
import { Fieldset } from '../fieldset/fieldset.component.js';
import { FieldsetContent } from '../fieldset-content/fieldset-content.component.js';
import { FieldsetLegend } from '../fieldset-legend/fieldset-legend.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/** A hand-written binding: what the contract is, with no library in the way. */
const bound =
  (errors: Record<string, string[]> = {}): UseFormField =>
  (name) => ({ control: { name }, errors: errors[name] });

const meta: Meta<typeof FormColorPicker> = {
  title: 'Components/Form adapters/FormColorPicker',
  component: FormColorPicker,
  argTypes: {
    name: {
      control: 'text',
      description: 'The field name, as your form library knows it.',
      table: { type: { summary: 'string' } },
    },
    label: {
      control: 'text',
      description:
        'The field’s label. Required — a colour swatch has no other name.',
      table: { type: { summary: 'ReactNode' } },
    },
    hint: {
      control: 'text',
      description:
        'Shown before any error, and part of the control’s accessible description.',
      table: { type: { summary: 'ReactNode' } },
    },
  },
  args: { name: 'primary', label: 'Brand colour' },
  decorators: [
    (Story) => (
      <UiProvider
        adapters={{ i18n: { locale: 'en' }, form: { field: bound() } }}
      >
        <Story />
      </UiProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof FormColorPicker>;

/**
 * `<Field><ColorPicker /></Field>`, assembled and already bound to the form library
 * in scope. Nothing below the provider names a library, so swapping one is a single
 * line in a single place.
 */
export const Default: Story = {};

/** With a hint, which is read as part of the control's description. */
export const WithAHint: Story = {
  args: { hint: 'Used for the primary action and its hover.' },
};

/**
 * **A colour field is never empty**, and that changes what validation is for.
 * `<input type="color">` reports `#000000` before anyone touches it, so there is no
 * "required" to check — an untouched field is indistinguishable from a deliberate
 * black. What a schema can still say is whether the value is one a THEME may hold,
 * and a colour often fails in more than one way at once.
 */
export const WithErrors: Story = {
  decorators: [
    (Story) => (
      <UiProvider
        adapters={{
          i18n: { locale: 'en' },
          form: {
            field: bound({
              primary: [
                'Outside sRGB — it will render differently in every browser.',
                'Too close to secondary to tell apart.',
              ],
            }),
          },
        }}
      >
        <Story />
      </UiProvider>
    ),
  ],
  args: { hint: 'Used for the primary action and its hover.' },
};

/**
 * The shape a theme builder needs: the seven families are ONE question, so they are
 * one `<fieldset>` with one legend — which is what a screen reader announces before
 * each field, so "primary" is heard as "Brand colours, primary" rather than as a
 * word on its own.
 */
export const AsAGroup: Story = {
  render: () => (
    <Fieldset>
      <FieldsetLegend>Brand colours</FieldsetLegend>
      <FieldsetContent orientation="horizontal">
        <FormColorPicker name="primary" label="primary" />
        <FormColorPicker name="secondary" label="secondary" />
        <FormColorPicker name="accent" label="accent" />
        <FormColorPicker name="negative" label="negative" />
      </FieldsetContent>
    </Fieldset>
  ),
};
