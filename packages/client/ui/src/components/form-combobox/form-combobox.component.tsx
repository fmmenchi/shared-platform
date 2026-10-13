import { Field } from '../field/field.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { Combobox } from '../combobox/combobox.component.js';
import { useBoundOptionField } from '../../form/form-adapter.context.js';
import { OptionBindingProvider } from '../../form/option-binding.context.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { toMessages } from '../../form/messages.js';
import { useBoundCarrierField } from '../../form/use-bound-carrier-field.js';
import type {
  FormComboboxMultipleProps,
  FormComboboxProps,
  FormComboboxSingleProps,
} from './form-combobox.types.js';

/**
 * A labelled combobox, already bound to the form library in scope:
 *
 *     <FormCombobox name="city" label="City" items={cities}
 *       getKey={(c) => c.id} getLabel={(c) => c.name} />
 *
 * It is `FormDateInput`'s shape with a different control inside, and for the
 * same reason: both are one field whose VALUE lives on a carrier while the
 * visible box shows something else. So the binding goes to the carrier and the
 * call site's `ref` to the field, and neither has to know about the other.
 *
 * A ROUTING TABLE, not a blanket spread — the lesson `FormDateInput` paid for
 * twice. A hand-picked list dropped Conform's `required`, `id` and `form`, and a
 * field rendered outside its `<form>` posts nothing without the last of those.
 * A blanket spread forwarded `type`, `pattern`, `min`, `max`, `step` and
 * `multiple`, which a schema derives from the value and which are then checked
 * against a KEY: a `pattern` that can never match blocks the submit for good.
 * So what describes a native control this is not never travels; everything else
 * does.
 */
/**
 * TWO COMPONENTS BEHIND ONE NAME, and the mode chooses between them at the
 * only moment it can: a hook may not be called conditionally, and the two halves
 * bind through DIFFERENT PORTS — one value is a per-field binding, a set is the
 * option binding, which is the only one that can say a whole list.
 *
 * Switching `multiple` therefore swaps the component rather than a branch, which
 * is also the truth about it: the mode is structural, not state. A control that
 * changed it mid-life would be a different control, the same way a controlled
 * one that became uncontrolled would be.
 */
function FormCombobox<T>(props: FormComboboxProps<T>) {
  return props.multiple === true ? (
    <BoundToASet {...props} />
  ) : (
    <BoundToOneValue {...props} />
  );
}

/**
 * SEVERAL OF MANY, bound. The option port is the whole difference: it is called
 * once for the FIELD, and the component inside draws one carrier per chosen key
 * from it — plus `setValues`, which is how a library that keeps a store hears
 * that a key has gone, since an unmounting carrier sends nothing.
 *
 * No `carrierRef` and no `useBoundCarrier` here, and neither is an omission: a
 * ref-based library gets its ref through the option bag, on every carrier, and a
 * controlled one is told the whole list rather than having a value written into
 * one node. Both are things the per-field shape could not do for a set.
 */
function BoundToASet<T>(props: FormComboboxMultipleProps<T>) {
  const { name, label, hint, ref, ...rest } = props;
  const binding = useBoundOptionField(name, 'FormCombobox');
  useBindingOwnedWarning(rest, 'FormCombobox');
  const messages = toMessages(binding.errors);

  return (
    <Field label={label} invalid={messages.length > 0}>
      {/* INSIDE the field and around the control, the way
          `FormSegmentedControl` provides it: the component reads the binding
          for what only the field knows — which keys the form holds, and how to
          tell it about the next ones. */}
      <OptionBindingProvider value={binding}>
        <Combobox {...withoutBindingOwned(rest)} name={name} ref={ref} />
      </OptionBindingProvider>
      {hint === undefined ? null : <FieldDescription>{hint}</FieldDescription>}
      {messages.map((message) => (
        <FieldError key={message}>{message}</FieldError>
      ))}
    </Field>
  );
}

/**
 * ONE OF MANY, bound — the shape this component had before it grew a second.
 *
 * Bound through `useBoundCarrierField`, like the date and time fields: the
 * value lives on a carrier and the visible box holds the QUERY, so the
 * adapter's bag is routed rather than spread. The length constraints are the
 * sharpest case of that routing here — a UUID key arriving as `maxLength={36}`
 * on the search box — and they are in the shared table now rather than only in
 * this file, where the date fields could not see them.
 *
 * The carrier follows a controlled adapter's value with a BARE ASSIGNMENT —
 * deliberately, and only sound because the carrier wraps its own `value`
 * descriptor (`useCarrierSync`). It did not, at first: the write landed on the
 * node, the component never heard it, the box stayed empty and the next commit
 * wrote the empty string back — so `setFieldValue` wiped the library's own
 * state through the control it was setting.
 */
function BoundToOneValue<T>(props: FormComboboxSingleProps<T>) {
  const { name, label, hint, ref, ...rest } = props;
  const bound = useBoundCarrierField(name, 'FormCombobox');
  useBindingOwnedWarning(rest, 'FormCombobox');
  const messages = toMessages(bound.errors);

  return (
    <Field label={label} invalid={messages.length > 0}>
      <Combobox
        {...bound.binding}
        // SAID OUT LOUD: a spread does not narrow a discriminated union, and
        // this half binds ONE value — without it TypeScript reads the seeded
        // key below as a list.
        multiple={false}
        name={bound.name}
        // The key the binding starts with, as the component's own uncontrolled
        // seed. Passed as `defaultValue` and never as `value`: controlling the
        // choice from here would take it away from the component AND from the
        // consumer at once.
        defaultValue={bound.seed ?? null}
        {...withoutBindingOwned(rest)}
        // The binding's ref is inside `carrierRef` — react-hook-form reads
        // `.value` off the element its ref was given, and given the visible
        // field it would store the search text. The call site's goes to the
        // visible input, which is where focus belongs.
        carrierRef={bound.carrierRef}
        ref={ref}
      />
      {hint === undefined ? null : <FieldDescription>{hint}</FieldDescription>}
      {messages.map((message) => (
        <FieldError key={message}>{message}</FieldError>
      ))}
    </Field>
  );
}

export { FormCombobox };
