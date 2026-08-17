/**
 * What happened, said once, in one shape.
 *
 * An event carries its own identity (`app`) instead of inheriting it from wherever the
 * caller happened to be standing. That is what lets one target, in one place, announce
 * anything — and what removes the question "which project does this run on?" from every
 * layer above.
 */
export type NotifyEvent =
  | {
      kind: 'release';
      /** What the message is about — a package name, or a repository. */
      app: string;
      version: string;
      /** Where to read more. Optional: a release with no page is still a release. */
      url?: string;
      /** Pre-rendered notes (a changelog). */
      body?: string;
    }
  | {
      kind: 'error';
      app: string;
      message: string;
      url?: string;
    };

/** The outcome of delivering a batch: counted, never assumed. */
export interface Delivery {
  total: number;
  delivered: number;
  failures: { app: string; reason: string }[];
}
