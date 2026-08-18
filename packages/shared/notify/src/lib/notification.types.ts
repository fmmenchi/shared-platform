/** A link/button back to the source of a notification. */
export interface Action {
  label: string;
  url: string;
}

/**
 * A file to carry along with a notification — a scan report, a log excerpt.
 *
 * A PATH, not bytes: the thing that produced the report already wrote it to disk, and a
 * notification that re-read it into memory would only add a way for the two to disagree.
 * Channel-neutral by construction — Slack uploads it, an email attaches it, a webhook may
 * ignore it.
 */
export interface Attachment {
  /** Path on disk, absolute or relative to the process cwd. */
  path: string;
  /** Shown as the file's name/title; defaults to the file's basename. */
  title?: string;
}

/** What a notification is about — transports may style each kind differently. */
export type NotificationKind = 'release' | 'error' | 'info';

/**
 * A channel-neutral notification. Transports (Slack, email, …) render it to their own
 * format, so the content here is plain text / lightweight markdown — never a channel's
 * native schema. This is what makes the library channel-agnostic.
 */
export interface Notification {
  kind: NotificationKind;
  /** Plain-text fallback — the phone notification, the sidebar, a screen reader. */
  text: string;
  /** One-line headline. Light markdown allowed; transports add their own emphasis. */
  title: string;
  /** Optional markdown detail — a changelog, an error trace. */
  body?: string;
  /** Links/buttons back to the source. */
  actions?: Action[];
  /** Files to send with it. A transport that cannot carry files must say so, not drop them. */
  attachments?: Attachment[];
}

/** One line of a changelog: a short sha and the commit subject. */
export interface Commit {
  sha: string;
  subject: string;
}

/**
 * The set of changes a release carries: the range it spans and the commits inside it.
 * `fromRef`/`toRef` are whatever the caller wants shown — short shas or tags.
 */
export interface Changelog {
  fromRef: string;
  toRef: string;
  commits: Commit[];
}

/**
 * A release's changes, either **structured** (commits the library renders) or a
 * **pre-rendered** markdown body (e.g. the notes `nx release` wrote into a GitHub Release).
 */
export type ReleaseChangelog = Changelog | { body: string };
