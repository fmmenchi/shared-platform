/**
 * WHETHER THE PREVIEW RAIL IS OPEN, as a fact about the URL.
 *
 * In state it would be worse three ways: it dies on a reload, it is not a link
 * somebody can send, and the control that changes it would have to be a button with a
 * handler instead of an anchor that works with no JavaScript. The `?from=` beside it
 * is in the URL for the same reasons.
 *
 * HERE RATHER THAN IN EITHER CALLER, because there are two: the rail is rendered by
 * `root.tsx` (it has to be a direct child of `AppLayout` to be a region of it) and the
 * control that opens it lives on the step, in `routes/build.tsx`. A param name spelled
 * out in both is one decision in two places, obliged to agree forever.
 */
const PARAM = 'preview';

/** The value, spelled one way, so "absent" has exactly one spelling too. */
const OPEN = '1';

export function isPreviewOpen(search: string): boolean {
  return new URLSearchParams(search).get(PARAM) === OPEN;
}

/**
 * The same path with the rail opened or closed — everything else in the query kept,
 * because this is not the only thing that lives there.
 */
export function withPreview(
  pathname: string,
  search: string,
  open: boolean,
): string {
  const next = new URLSearchParams(search);
  if (open) next.set(PARAM, OPEN);
  else next.delete(PARAM);

  const query = next.toString();
  return query === '' ? pathname : `${pathname}?${query}`;
}
