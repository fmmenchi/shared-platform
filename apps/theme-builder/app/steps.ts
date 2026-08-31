/**
 * THE STEPS, DECLARED ONCE.
 *
 * The stepper is built from this list, and so is every "where am I" answer. The
 * route table in `routes.tsx` is written by hand — React Router reads it at build
 * time, and a loop over a runtime array would hide the routes from anyone opening
 * the file — so the two are held together by `steps.spec.ts` instead. One assertion
 * for a legible route table is the trade.
 *
 * ORDER IS THE NUMBERING. `<ol>` states position, so the array's order is what a
 * screen reader announces; there is no index to store and nothing to keep in step.
 */
export interface Step {
  /** The path segment under the wizard. The FIRST step has none: it is the index. */
  readonly slug: string;
  /** What the stepper shows, and what the page is titled. */
  readonly label: string;
}

export const STEPS: readonly Step[] = [
  { slug: 'colours', label: 'Brand colours' },
  { slug: 'palette', label: 'Palette' },
  { slug: 'roles', label: 'Semantic roles' },
  { slug: 'review', label: 'Review and export' },
];

export const FIRST_STEP = STEPS[0] as Step;

/**
 * Where a step lives. The first one is the wizard's index route, so its path is
 * `/` rather than `/colours` — a person who lands on the app is already on step one,
 * and a redirect would put a second URL in the history for the same page.
 */
export function pathOf(step: Step): string {
  return step.slug === FIRST_STEP.slug ? '/' : `/${step.slug}`;
}

/**
 * Which step a pathname is. Unknown paths answer with the first step rather than
 * throwing: a stepper is chrome, and chrome that crashes a page over a URL it did
 * not expect is worse than chrome that points at the beginning.
 */
export function slugOf(pathname: string): string {
  const segment = pathname.replace(/^\/+|\/+$/g, '');
  const found = STEPS.find((step) => step.slug === segment);
  return found ? found.slug : FIRST_STEP.slug;
}

/**
 * Where a step stands relative to the one being shown.
 *
 * Behind is `done`, here is `current`, ahead is `upcoming` — which is exactly
 * `StepperItemStatus`, and deliberately not a richer idea. A wizard that also knew
 * "visited but skipped" or "has an error" would need somewhere to keep that, and
 * this function is the argument for not needing it yet: position is derivable, and
 * anything else is state.
 */
export function statusOf(
  step: Step,
  currentSlug: string,
): 'done' | 'current' | 'upcoming' {
  const at = STEPS.findIndex((s) => s.slug === currentSlug);
  const mine = STEPS.indexOf(step);

  if (at === -1 || mine > at) return 'upcoming';
  return mine === at ? 'current' : 'done';
}
