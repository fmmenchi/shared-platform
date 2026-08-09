import type { ComponentPropsWithRef } from 'react';

/**
 * Public Switch props: a transparent native `<input type="checkbox">` carrying
 * `role="switch"` (ADR-0013). Every native attribute and `ref` passes through
 * and `onChange` is attached to the element unchanged, so it works uncontrolled
 * or controlled and drops into any form library.
 *
 * There are no own props at all, and that is the point rather than an omission:
 * a switch's state IS `checked`, its name IS `name`, and the pair the rest of
 * this package spells `value`/`defaultValue` the platform already spells
 * `checked`/`defaultChecked`. Inventing a second vocabulary over the top would
 * cost the form behaviour that is the whole reason this one is an input.
 *
 * `type` and `role` are omitted — they are the component's identity, not axes.
 * There is no `size` and no `variant`, and no third state: `mixed` belongs to
 * `Checkbox`, which summarises a set. A switch is on or off (ADR-0024).
 */
export type SwitchProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'role'>;
