import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorPicker } from './color-picker.component.js';
import { Field } from '../field/field.component.js';
import { FieldLabel } from '../field-label/field-label.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { Input } from '../input/input.component.js';

const meta: Meta<typeof ColorPicker> = {
  title: 'Components/Inputs/ColorPicker',
  component: ColorPicker,
  argTypes: {
    defaultValue: {
      control: 'color',
      description:
        'An sRGB hex — `#rrggbb`. The platform lowercases it and there is no alpha; a consumer working in oklch converts on the way in and out.',
      table: { type: { summary: 'string' } },
    },
    disabled: {
      control: 'boolean',
      description:
        'The swatch dims rather than greying out: the colour is often the thing a person is trying to read.',
      table: { type: { summary: 'boolean' } },
    },
  },
  args: { defaultValue: '#635bff', 'aria-label': 'Brand colour' },
};
export default meta;

type Story = StoryObj<typeof ColorPicker>;

/**
 * `<input type="color">` and nothing else. The platform already ships the picker —
 * the OS one, which a person knows, with an eyedropper on the desktops that offer
 * one, and reachable by keyboard because the browser made it so.
 *
 * It exists as a component for one reason: the swatch is painted by the browser
 * inside `::-webkit-color-swatch`, which none of `Input`'s text-shaped rules
 * reaches. Same element, different stylesheet.
 */
export const Default: Story = {};

/**
 * In a `Field` it takes its name and its description without being told — the same
 * opt-in wiring `Input` uses, so a colour sits in a form like everything else.
 */
export const InAField: Story = {
  render: (args) => (
    <Field>
      <FieldLabel>Brand colour</FieldLabel>
      <ColorPicker {...args} aria-label={undefined} name="primary" />
      <FieldDescription>Used for the primary action.</FieldDescription>
    </Field>
  ),
};

/**
 * **There is no hex field inside this component, on purpose.** A value you can
 * type is a second control holding the same value, and two controls holding one
 * value is a synchronisation problem: which wins mid-keystroke, what `#63` means,
 * what happens on blur. The native control has one value and one source of truth.
 *
 * An app that wants both composes them and owns that decision — which is what this
 * story is, rather than a feature.
 */
export const WithATypedValue: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
      <ColorPicker {...args} />
      <Input aria-label="Hex" defaultValue={args.defaultValue as string} />
    </div>
  ),
};

/**
 * Several at once is the shape a theme builder actually needs: one swatch per
 * family, on a row that lines up because the picker is `control-md`'s 36px.
 */
export const Several: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
      <ColorPicker aria-label="Primary" defaultValue="#635bff" />
      <ColorPicker aria-label="Secondary" defaultValue="#425466" />
      <ColorPicker aria-label="Accent" defaultValue="#00d4ff" />
      <ColorPicker aria-label="Negative" defaultValue="#df1b41" />
    </div>
  ),
};

/** Disabled dims the swatch — see the control's stylesheet for why not a filter. */
export const Disabled: Story = { args: { disabled: true } };
