import { useContext } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '../button/button.component.js';
import { FormAdapterContext } from '../../form/form-adapter.context.js';
import type { UseFormStatus } from '../../form/form-adapter.types.js';
import type { FormSubmitProps } from './form-submit.types.js';

/** The button itself, once the adapter's answer (if any) has been resolved. */
function SubmitButton(
  props: FormSubmitProps & { adapterPending: boolean },
): React.ReactElement {
  const { children, isLoading, adapterPending, ...rest } = props;
  // React's own, for a `<form action>`. Outside a form it reports false, so it
  // is safe — and required — to call unconditionally.
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      isLoading={isLoading ?? (pending || adapterPending)}
      {...rest}
    >
      {children}
    </Button>
  );
}

/** The branch that has an adapter, so its hook can be called unconditionally. */
function BoundSubmitButton(
  props: FormSubmitProps & { useStatus: UseFormStatus },
): React.ReactElement {
  const { useStatus, ...rest } = props;
  const { submitting } = useStatus();
  return <SubmitButton adapterPending={submitting} {...rest} />;
}

/**
 * The form's submit button, which knows when a submission is in flight:
 *
 *     <FormSubmit>Create account</FormSubmit>
 *
 * It blocks a second submit and shows the pending state — the small thing every
 * form needs and every form forgets, which is why it belongs here rather than
 * at each call site.
 *
 * It asks THREE sources, in order, and requires none of them to exist:
 *
 * 1. **`isLoading` passed explicitly** — the app already knows, e.g. from its
 *    own `useTransition`. An explicit answer always wins.
 * 2. **React's own `useFormStatus`** — free and exact for a `<form action>`,
 *    including a server action. Measured: pending is true for the life of the
 *    action with no adapter, no form library and no wiring at all.
 * 3. **The adapter's form status**, when one is in scope — the path for a
 *    client form library that owns submission itself.
 *
 * So it works in a React 19 action form, in a react-hook-form form and in a
 * hand-rolled one, without the call site choosing.
 *
 * Two components rather than one branch, because whether there is an adapter
 * decides whether a HOOK is called: conditional hooks are conditional
 * components. It also means this button is never the reason a form needs an
 * adapter.
 */
function FormSubmit(props: FormSubmitProps) {
  const adapter = useContext(FormAdapterContext);
  const useStatus = adapter?.status;

  return useStatus === undefined ? (
    <SubmitButton adapterPending={false} {...props} />
  ) : (
    <BoundSubmitButton useStatus={useStatus} {...props} />
  );
}

export { FormSubmit };
