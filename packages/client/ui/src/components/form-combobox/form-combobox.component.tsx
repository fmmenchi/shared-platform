import { Field } from '../field/field.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { Combobox } from '../combobox/combobox.component.js';
import {
  useBoundField,
  useBoundOptionField,
} from '../../form/form-adapter.context.js';
import { OptionBindingProvider } from '../../form/option-binding.context.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { toMessages } from '../../form/messages.js';
import { useBoundCarrier } from '../../form/use-bound-carrier.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import type { FormComboboxProps } from './form-combobox.types.js';

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
function BoundToASet<T>(props: FormComboboxProps<T>) {
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

/** ONE OF MANY, bound — the shape this component had before it grew a second. */
function BoundToOneValue<T>(props: FormComboboxProps<T>) {
  // WHAT THE UNION DISCRIMINATES ON COMES OUT OF THE SPREAD, rather than being
  // written over it: a discriminated union does not narrow through a spread, so
  // anything left in `rest` re-widens what is written above it. The mode and the
  // report are the two members whose type differs between the halves — the
  // value and its seed are the binding's and never travel from the call site
  // (`BindingOwned`), so they are not here to take out.
  const {
    name,
    label,
    hint,
    ref,
    multiple: _mode,
    onValueChange: _report,
    ...rest
  } = props;
  const { control, errors } = useBoundField(name, 'FormCombobox');
  useBindingOwnedWarning(rest, 'FormCombobox');
  const messages = toMessages(errors);

  const {
    value,
    defaultValue,
    ref: bindingRef,
    type,
    pattern,
    min,
    max,
    step,
    accept,
    multiple,
    checked,
    defaultChecked,
    // THE TWO THE FIRST TABLE MISSED, and they are the sharpest of the set here.
    // `getInputProps` emits them from the same constraint as the rest, so a key
    // that is a UUID arrives as `maxLength={36}` — landing on the VISIBLE field,
    // which holds the query. The search box then hard-truncates typing at the
    // length of a value the user never sees, and a `minLength` blocks the submit
    // with a native bubble pointing at a field whose contents are not the value.
    minLength,
    maxLength,
    ...binding
  } = control;

  // Narrowed to a string because `control` is typed for an `<input>`, where a
  // value may also be a number or a list; a key is neither.
  const asString = (candidate: unknown) =>
    typeof candidate === 'string' ? candidate : undefined;
  // The adapter's starting value arrives under either name: Conform emits
  // `defaultValue`, react-hook-form emits neither and leaves the DOM to keep
  // it, Formik and TanStack emit `value` on every render.
  const seed = asString(defaultValue) ?? asString(value);
  // A CONTROLLED adapter hands over `value` and no ref, so nothing it does
  // after the first render reaches the field. This follows it onto the carrier
  // with a BARE ASSIGNMENT — deliberately, and only sound because the carrier
  // wraps its own `value` descriptor (`useCarrierSync`). It did not, at first:
  // the write landed on the node, the component never heard it, the box stayed
  // empty and the next commit wrote the empty string back — so `setFieldValue`
  // wiped the library's own state through the control it was setting.
  const carrier = useBoundCarrier(asString(value));

  return (
    <Field label={label} invalid={messages.length > 0}>
      <Combobox
        {...binding}
        // SAID OUT LOUD: a spread does not narrow a discriminated union, and
        // this half binds ONE value — without it TypeScript reads the seeded
        // key below as a list.
        multiple={false}
        // `name` is optional on the port's control, and without one the carrier
        // is nameless: nothing is submitted, and `FormErrorSummary` — which
        // finds a field by `name` — cannot reach it.
        name={control.name ?? name}
        // The key the binding starts with, as the component's own uncontrolled
        // seed. Passed as `defaultValue` and never as `value`: controlling the
        // choice from here would take it away from the component AND from the
        // consumer at once.
        defaultValue={seed ?? null}
        {...withoutBindingOwned(rest)}
        // TWO REFS, two jobs, two nodes. THE BINDING'S goes to the CARRIER —
        // react-hook-form reads `.value` off the element its ref was given, and
        // given the visible field it would store the search text. THE CALL
        // SITE'S goes to the visible input, which is where focus belongs.
        carrierRef={(node) => mergeRefs(carrier, bindingRef)(node)}
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
