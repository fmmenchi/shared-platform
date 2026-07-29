/** One registered text part: its id, and the node whose position orders it. */
export interface DescribedByPart {
  id: string;
  node: Element;
}

/** What a group hands to its description/error parts to describe itself. */
export interface DescribedByRegistry {
  /** Space-joined ids of the registered part(s), in DOM order. */
  describedBy: string | undefined;
  /**
   * A part registers its own id and its node; the returned cleanup unregisters
   * it. The node is what lets the group order the ids by document position.
   */
  register: (id: string, node: Element) => () => void;
}
