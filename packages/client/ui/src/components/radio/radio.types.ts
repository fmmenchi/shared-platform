import type { ComponentPropsWithRef } from 'react';

/**
 * Public Radio props: a transparent native `<input type="radio">` (ADR-0013).
 * Every native attribute and `ref` passes through, and `checked`/`onChange` are
 * never hijacked, so it drops into any form library.
 *
 * `type` is omitted rather than defaulted: it is not an axis here the way it is
 * on `Input` (email, password, search) — it is the component's identity, and a
 * `Radio` that could be rendered as a checkbox would be a lie in the type.
 *
 * There is no `size` axis and no `variant`: the control is one size, and the
 * error state is owned by the enclosing `Fieldset` (see the component doc).
 */
export type RadioProps = Omit<ComponentPropsWithRef<'input'>, 'type'>;
