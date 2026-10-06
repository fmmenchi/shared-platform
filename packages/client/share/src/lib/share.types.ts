/**
 * What is being shared. The shape of the platform's own `ShareData`, minus
 * `files`, so one object serves a channel's link and the native sheet alike.
 */
export interface ShareContent {
  /**
   * ABSOLUTE. A relative url stops being a link the moment it leaves the page,
   * and nothing here can know which origin was meant.
   */
  url: string;
  /** The name of the thing: an email's subject, a submission's title. */
  title?: string;
  /** The words that travel with the link. Falls back to `title`. */
  text?: string;
}

/**
 * How a call to the native sheet ended — as far as the platform lets on.
 *
 * - `shared`: the sheet TOOK the content. Not "the reader shared it": on
 *   Windows the platform resolves as soon as the sheet opens, so a dismissal
 *   there arrives as `shared` too. Do not count shares or say thanks on it.
 * - `cancelled`: the platform reported an abort — the reader closed the sheet,
 *   or there was no target to offer. Neither is an error to report.
 * - `unavailable`: there is no sheet.
 * - `failed`: everything else — no user gesture, content the sheet refused.
 */
export type NativeShareOutcome =
  'shared' | 'cancelled' | 'unavailable' | 'failed';
