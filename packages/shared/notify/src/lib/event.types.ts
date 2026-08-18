import type { Attachment } from './notification.types.js';

/**
 * What happened, said once, in one shape.
 *
 * An event carries its own identity (`app`) instead of inheriting it from wherever the
 * caller happened to be standing. That is what lets one target, in one place, announce
 * anything — and what removes the question "which project does this run on?" from every
 * layer above.
 */
export type NotifyEvent = ReleaseEvent | ErrorEvent;

/** A release happened. */
export interface ReleaseEvent {
  kind: 'release';
  /** What the message is about — a package name, or a repository. */
  app: string;
  version: string;
  /** Where to read more. Optional: a release with no page is still a release. */
  url?: string;
  /** Pre-rendered notes (a changelog). */
  body?: string;
}

/** Something went wrong, and someone should look. */
export interface ErrorEvent {
  kind: 'error';
  app: string;
  /** The reason, in ONE line: it becomes the title and the phone notification. */
  message: string;
  url?: string;
  /** Optional markdown detail — the failed steps, a trace. Keeps the title readable. */
  body?: string;
  /** Files to send with it — a scan report, a log excerpt. */
  attachments?: Attachment[];
}

/** The outcome of delivering a batch: counted, never assumed. */
export interface Delivery {
  total: number;
  delivered: number;
  failures: { app: string; reason: string }[];
}

/** One step of a workflow job, as the GitHub API reports it. */
export interface RunStep {
  name: string;
  conclusion: string | null;
}

/** One job of a workflow run, reduced to what "what failed?" needs. */
export interface RunJob {
  name: string;
  conclusion: string | null;
  steps?: RunStep[];
}

/**
 * A workflow run's failures, as handed over by whoever asked GitHub.
 *
 * The jobs come from the API rather than from the caller's guesses, because a workflow
 * knows which of ITS steps it wrote but not which of its jobs the run actually lost.
 */
export interface RunFailures {
  /** What the message is about — the repository, or a name the caller prefers. */
  app: string;
  /** Where to read more: the run's own page. */
  url: string;
  /** The workflow's name, for a message that says which pipeline broke. */
  workflow?: string;
  jobs: readonly RunJob[];
}
