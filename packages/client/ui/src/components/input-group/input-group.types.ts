import type { ComponentPropsWithRef } from 'react';

/**
 * Puts content INSIDE a field's border by taking the chrome an `<input>` cannot
 * carry beside it — the border, the fill and the radius — while the control keeps
 * everything that is its own: height, padding, type scale, and the native state
 * the form library sets on it (ADR-0013).
 *
 * There is no size axis here on purpose. The height comes from the control, where
 * it already lives, so a group cannot disagree with the field inside it.
 */
export type InputGroupProps = ComponentPropsWithRef<'div'>;
