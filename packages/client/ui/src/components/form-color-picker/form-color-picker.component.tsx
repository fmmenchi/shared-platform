import { ColorPicker } from '../color-picker/color-picker.component.js';
import { Field } from '../field/field.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useBoundField } from '../../form/form-adapter.context.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { toMessages } from '../../form/messages.js';
import type { FormColorPickerProps } from './form-color-picker.types.js';

/**
 * A labelled colour field, already bound to the form library in scope:
 *
 *     <UiProvider adapters={useMyFormField}>
 *       <FormColorPicker name="primary" label="Brand colour" />
 *     </UiProvider>
 *
 * One tag per field, and nothing below the provider names a form library. It is
 * the assembled form of `<Field><ColorPicker /></Field>`; drop to those when a
 * field needs something this does not express, and the two stay interchangeable
 * because this adds no markup.
 *
 * `FormInput` HAS TO NARROW ITS `type` AND THIS DOES NOT, which is the only
 * difference in the adapter and worth knowing: the port types `type` as the
 * platform does, `Input` accepts one member fewer, and the two have to be
 * reconciled out loud. Here there is nothing to reconcile — `type` is not a prop
 * of `ColorPicker`, it IS the component, so a binding cannot hand one over.
 *
 * A COLOUR FIELD IS NEVER EMPTY, and that changes what validation is for. There is
 * no "required" to check: `<input type="color">` reports `#000000` before anyone
 * touches it, so an untouched field looks exactly like a deliberate black. What a
 * schema can still say is whether the value is one a THEME may hold — in gamut,
 * far enough from its neighbours, clearing the pairs it takes part in — and those
 * are the messages this renders.
 */
function FormColorPicker(props: FormColorPickerProps) {
  const { name, label, hint, ref, ...rest } = props;
  const { control, errors } = useBoundField(name, 'FormColorPicker');
  useBindingOwnedWarning(rest, 'FormColorPicker');

  // A field rarely fails in one way. Each message is its OWN element, so a screen
  // reader announces them as separate statements and the eye sees a list.
  const messages = toMessages(errors);

  return (
    <Field label={label} invalid={messages.length > 0}>
      {/* The adapter's props come FIRST so an explicit prop at the call site still
          wins. What the binding OWNS never reaches this spread: the type refuses it
          and `withoutBindingOwned` drops it anyway, because a `value` or an
          `onChange` from the call site does not override the binding, it severs
          it. `ref` is the exception that can be shared. */}
      <ColorPicker
        {...control}
        {...withoutBindingOwned(rest)}
        ref={mergeRefs(control.ref, ref)}
      />
      {/* Composed rather than passed as props, so the hint keeps its place BEFORE
          the errors however many of them there are. */}
      {hint === undefined ? null : <FieldDescription>{hint}</FieldDescription>}
      {/* Keyed by the message itself: the only identity a message has that
          survives an earlier one being fixed. */}
      {messages.map((message) => (
        <FieldError key={message}>{message}</FieldError>
      ))}
    </Field>
  );
}

export { FormColorPicker };
