import { Button } from '../button/button.component.js';
import { useFormStatus } from '../../form/form-adapter.context.js';
import type { FormSubmitProps } from './form-submit.types.js';

/**
 * The form's submit button, which knows when a submission is in flight:
 *
 *     <FormSubmit>Create account</FormSubmit>
 *
 * It shows the pending state and blocks a second submit — the small thing every
 * form needs and every form forgets, which is why it belongs here rather than
 * in each call site.
 *
 * It uses `Button`'s `isLoading`, which is PENDING rather than disabled: the
 * control stays focusable and announces the state, where a native `disabled`
 * would drop focus mid-interaction and leave a screen-reader user with nothing
 * under the cursor.
 */
function FormSubmit(props: FormSubmitProps) {
  const { children, ...rest } = props;
  const { submitting } = useFormStatus('FormSubmit');

  return (
    <Button type="submit" isLoading={submitting} {...rest}>
      {children}
    </Button>
  );
}

export { FormSubmit };
