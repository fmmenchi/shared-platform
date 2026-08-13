import type { ComponentProps } from 'react';
import { Field } from '../field/field.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { Input } from '../input/input.component.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useBoundField } from '../../form/form-adapter.context.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { toMessages } from '../../form/messages.js';
import type { FormInputProps } from './form-input.types.js';

/**
 * A labelled text field, already bound to the form library in scope:
 *
 *     <UiProvider adapters={useMyFormField}>
 *       <FormInput name="email" label="Email" />
 *     </UiProvider>
 *
 * One tag per field, and nothing below the provider names a form library —
 * swapping one is a single line, in a single place.
 *
 * It is the assembled form of `<Field><Input /></Field>`; drop to those when a
 * field needs something this does not express, and the two stay interchangeable
 * because this adds no markup.
 */
function FormInput(props: FormInputProps) {
  const { name, label, hint, ref, ...rest } = props;
  const { control, errors } = useBoundField(name, 'FormInput');
  useBindingOwnedWarning(rest, 'FormInput');
  // A field rarely fails in one way. Each message is its OWN element, so a
  // screen reader announces them as separate statements and the eye sees a
  // list — joining them would read as one run-on sentence.
  const messages = toMessages(errors);
  return (
    <Field label={label} invalid={messages.length > 0}>
      {/* The adapter's props come FIRST so an explicit prop at the call site
          still wins — a per-field `placeholder` or `type` must not be erased by
          the binding. What the binding OWNS never reaches this spread: the type
          refuses it and `withoutBindingOwned` drops it anyway, because a
          `value` or an `onChange` from the call site does not override the
          binding, it severs it. `ref` is the exception that can be shared. */}
      <Input
        {...control}
        // The port types `type` as the platform does — every native value. The
        // design system accepts one fewer (`date` is refused, ADR-0027), so the
        // two disagree by exactly that member and the narrowing has to be said
        // out loud rather than left to a spread. A binding that really does
        // declare `date` gets the same dev warning any other caller does.
        type={control.type as ComponentProps<typeof Input>['type']}
        {...withoutBindingOwned(rest)}
        ref={mergeRefs(control.ref, ref)}
      />
      {/* Composed rather than passed as props, so the hint keeps its place
          BEFORE the errors however many of them there are. */}
      {hint === undefined ? null : <FieldDescription>{hint}</FieldDescription>}
      {/* Keyed by the message itself: the only identity a message has that
          survives an earlier one being fixed. */}
      {messages.map((message) => (
        <FieldError key={message}>{message}</FieldError>
      ))}
    </Field>
  );
}

export { FormInput };
