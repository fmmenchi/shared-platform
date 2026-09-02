/**
 * WHETHER THE PREVIEW RAIL IS OPEN, as a fact about the URL.
 *
 * In state it would be worse three ways: it dies on a reload, it is not a link
 * somebody can send, and the control that changes it would have to be a button with a
 * handler instead of an anchor that works with no JavaScript.
 *
 * ITS OWN FILE, although `root.tsx` is now the only caller — the header link opens
 * the rail and the rail closes itself, both there. It was two callers when the opener
 * lived on the step, and it stays out because the param's spelling is a fact about the
 * URL rather than about the shell: a step that wanted to open the rail again would
 * import this, not `root.tsx`.
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
