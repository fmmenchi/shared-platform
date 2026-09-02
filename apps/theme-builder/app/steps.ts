import type { StepperItemStatus } from '@fmmenchi/ui/stepper-item';

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
  /**
   * The path segment under `/steps`. A short handle rather than the label
   * kebab-cased: `review-and-export` reads worse in a URL than `review` and says
   * nothing more. `brand-colours` is the exception because `colours` alone does not
   * say WHOSE.
   */
  readonly slug: string;
  /** What the stepper shows, and what the page is titled. */
  readonly label: string;
}

export const STEPS: readonly Step[] = [
  { slug: 'brand-colours', label: 'Brand colours' },
  { slug: 'palette', label: 'Palette' },
  { slug: 'roles', label: 'Semantic roles' },
  { slug: 'review', label: 'Review and export' },
];

export const FIRST_STEP = STEPS[0] as Step;

/** The segment every step lives under, so `/` can redirect into the sequence. */
export const STEPS_PREFIX = 'steps';

/**
 * Where a step lives — `/steps/<slug>`, for all four.
 *
 * THE FIRST STEP USED TO BE THE INDEX, at `/` rather than a path of its own, and the
 * argument was that a person landing on the app is already on step one so a redirect
 * would put a second URL in the history. Three things were wrong with it:
 *
 *   `slugOf` FELL BACK to the first step for anything it did not recognise, so `/`
 *   and `/nonsense` were the same answer — the stepper showed "step one, current"
 *   for a URL that does not exist.
 *
 *   `/` was ALSO the sidebar's "Build" link, so two nav items pointed at one page and
 *   both carried `aria-current`: measured, two current pages announced in one nav on
 *   every step of the wizard. That link is gone with this.
 *
 *   and step one was the one step nobody could link to BY NAME, in a wizard whose
 *   whole navigation model is that the URL says where you are.
 *
 * The redirect costs no history entry: React Router's loader redirect replaces.
 */
export function pathOf(step: Step): string {
  return `/${STEPS_PREFIX}/${step.slug}`;
}

/**
 * The step with that slug, or a throw.
 *
 * FOR THE BUTTONS BETWEEN STEPS, which used to write `to="/palette"` by hand while
 * the nav went through `pathOf` — two sources of truth for where a step lives, and
 * the literals are the half that does not move when the routes do. A wrong slug here
 * fails the build instead of shipping a dead link.
 */
export function stepPath(slug: string): string {
  const found = STEPS.find((step) => step.slug === slug);
  if (!found) {
    throw new Error(
      `No wizard step named "${slug}". Known: ${STEPS.map((s) => s.slug).join(', ')}.`,
    );
  }
  return pathOf(found);
}

/**
 * Which step a pathname is. Unknown paths answer with the first step rather than
 * throwing: a stepper is chrome, and chrome that crashes a page over a URL it did
 * not expect is worse than chrome that points at the beginning. `/` is no longer one
 * of those unknowns — it redirects — so the fallback now means what it says.
 */
export function slugOf(pathname: string): string {
  const segment = pathname
    .replace(/^\/+|\/+$/g, '')
    .replace(new RegExp(`^${STEPS_PREFIX}/`), '');
  const found = STEPS.find((step) => step.slug === segment);
  return found ? found.slug : FIRST_STEP.slug;
}

/**
 * Where a step stands relative to the one being shown.
 *
 * Behind is `complete`, here is `current`, ahead is `upcoming` — and the return type
 * is `StepperItemStatus` itself rather than three strings that happen to match, so
 * a status the design system adds or renames reaches this function through the
 * compiler instead of through a broken page.
 *
 * `error` is the one it never returns, and that is the honest limit of deriving
 * status from POSITION: a failure is not a place in a sequence, it is state, and
 * this wizard does not keep any yet. When it does — a step whose contrast pairs
 * fail, say — that is where `error` comes from.
 */
export function statusOf(step: Step, currentSlug: string): StepperItemStatus {
  const at = STEPS.findIndex((s) => s.slug === currentSlug);
  const mine = STEPS.indexOf(step);

  if (at === -1 || mine > at) return 'upcoming';
  return mine === at ? 'current' : 'complete';
}
