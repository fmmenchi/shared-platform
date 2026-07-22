/** A link/button back to the source of a notification. */
export interface Action {
  label: string;
  url: string;
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
