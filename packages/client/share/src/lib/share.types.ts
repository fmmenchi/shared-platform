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
 * How a call to the native sheet ended. `cancelled` is the reader closing it,
 * which is not an error and must not be reported as one.
 */
export type NativeShareOutcome =
  'shared' | 'cancelled' | 'unavailable' | 'failed';
