import type { RefCallback } from 'react';
import type { DescribesTheValue } from './control-props.js';
import type { ControlPropsByTag, FieldMessages } from './form-adapter.types.js';

/**
 * The adapter's bag as a carrier-based field spreads it: without the value,
 * the ref, and what describes a native control the field is not — the three
 * things `useBoundCarrierField` routes elsewhere.
 */
export type CarrierBinding = Omit<
  ControlPropsByTag['input'],
  'value' | 'defaultValue' | 'ref' | DescribesTheValue
>;

/** One field bound onto a carrier — see `useBoundCarrierField`. */
export interface BoundCarrierField {
  /** Spread onto the control, FIRST, so a prop at the call site still wins. */
  binding: CarrierBinding;
  /** The name the carrier posts under: the binding's, or the call site's. */
  name: string;
  /**
   * The value the binding starts with, under whichever prop the library emits
   * it — given to the control as its uncontrolled seed, never as `value`.
   */
  seed: string | undefined;
  /**
   * Goes to the CARRIER: the binding's ref, merged with the one that follows a
   * controlled adapter's value onto the node after the first render.
   */
  carrierRef: RefCallback<HTMLInputElement>;
  /** What is wrong with the field — see `FieldMessages`. */
  errors?: FieldMessages;
}
