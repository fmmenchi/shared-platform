import { createPartContext } from '../../primitives/part-context.js';

/**
 * What an `Accordion` gives its items, which is one thing: the group name.
 *
 * There is no open state here, and no toggling. `<details name="…">` makes a
 * set mutually exclusive in the platform — measured, opening the second closed
 * the first with no script — so a root that tracked which item is open could
 * only hold a second opinion about a fact the DOM already owns.
 */
export interface AccordionContextValue {
  /**
   * Shared by every item when the accordion is exclusive, `undefined` when it
   * is not. It is what makes the exclusivity, so it is generated once and never
   * taken from the consumer: two accordions on a page must not collide.
   */
  name: string | undefined;
}

export const { Context: AccordionContext, usePart: useAccordionPart } =
  createPartContext<AccordionContextValue>('Accordion');
