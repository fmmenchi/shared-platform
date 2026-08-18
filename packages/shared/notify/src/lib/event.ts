import { errorNotification, releaseNotification } from './notification.js';
import type { Attachment, Notification } from './notification.types.js';
import type { Transport } from './transport.types.js';
import type {
  Delivery,
  ErrorEvent,
  NotifyEvent,
  RunFailures,
} from './event.types.js';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const requireString = (
  value: unknown,
  field: string,
  index: number,
): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `notify: event ${index} has no "${field}". An incomplete event is a message that would go out wrong, not a message with nothing to say.`,
    );
  }
  return value;
};

/**
 * Validates a batch of events, or throws.
 *
 * There is no tolerant path here on purpose. Every silent notification failure this
 * codebase has had came from a missing value being read as "nothing to announce": an
 * option nx swallowed, an env var never set. A missing field is a broken caller, and a
 * broken caller must hear about it.
 */
/**
 * Attachments are validated like everything else — a `path` that is not a string is a broken
 * caller. Nothing is read from disk here: whether the file EXISTS is the transport's problem,
 * and failing at parse time would make a report that appears mid-run impossible to attach.
 */
function parseAttachments(raw: unknown[], index: number): Attachment[] {
  return raw.map((entry, position) => {
    if (!isObject(entry)) {
      throw new Error(
        `notify: event ${index} attachment ${position} is not an object.`,
      );
    }
    return {
      path: requireString(
        entry['path'],
        `attachments[${position}].path`,
        index,
      ),
      ...(typeof entry['title'] === 'string' ? { title: entry['title'] } : {}),
    };
  });
}

export function parseEvents(input: unknown): NotifyEvent[] {
  const list = Array.isArray(input) ? input : [input];
  return list.map((raw, index) => {
    if (!isObject(raw)) {
      throw new Error(`notify: event ${index} is not an object.`);
    }
    const app = requireString(raw['app'], 'app', index);
    if (raw['kind'] === 'release') {
      return {
        kind: 'release',
        app,
        version: requireString(raw['version'], 'version', index),
        ...(typeof raw['url'] === 'string' ? { url: raw['url'] } : {}),
        ...(typeof raw['body'] === 'string' ? { body: raw['body'] } : {}),
      };
    }
    if (raw['kind'] === 'error') {
      return {
        kind: 'error',
        app,
        message: requireString(raw['message'], 'message', index),
        ...(typeof raw['url'] === 'string' ? { url: raw['url'] } : {}),
        ...(typeof raw['body'] === 'string' ? { body: raw['body'] } : {}),
        ...(Array.isArray(raw['attachments'])
          ? { attachments: parseAttachments(raw['attachments'], index) }
          : {}),
      };
    }
    throw new Error(
      `notify: event ${index} has kind "${String(raw['kind'])}" — expected "release" or "error".`,
    );
  });
}

/** Renders one event into the channel-neutral notification the transports know. */
export function toNotification(event: NotifyEvent): Notification {
  return event.kind === 'release'
    ? releaseNotification(
        event.app,
        event.version,
        event.url ?? '',
        event.body ? { body: event.body } : undefined,
      )
    : errorNotification(event.app, event.message, event.url ?? '', {
        ...(event.body ? { body: event.body } : {}),
        ...(event.attachments ? { attachments: event.attachments } : {}),
      });
}

/**
 * Delivers a batch and reports what actually arrived.
 *
 * Three rules, and they are the contract:
 *   1. every event is validated BEFORE any is sent — a malformed one at the end must not
 *      be discovered halfway through a batch;
 *   2. every event is attempted — one package's failure must not silence the other twelve;
 *   3. the result is a count, not a boolean. The caller turns `delivered !== total` into a
 *      red build, which is the only way "it never even started" is visible from outside.
 */
export async function deliver(
  events: readonly NotifyEvent[],
  transports: Transport | Transport[],
): Promise<Delivery> {
  const validated = parseEvents(events as unknown);
  const list = Array.isArray(transports) ? transports : [transports];
  const failures: Delivery['failures'] = [];

  for (const event of validated) {
    const notification = toNotification(event);
    try {
      await Promise.all(list.map((transport) => transport.send(notification)));
    } catch (error) {
      failures.push({ app: event.app, reason: String(error) });
    }
  }

  return {
    total: validated.length,
    delivered: validated.length - failures.length,
    failures,
  };
}

/** One released package, as the release step recorded it. */
export interface ReleasedProject {
  project: string;
  version: string;
  tag: string;
  /** The changelog the release step recorded, as the release tool rendered it. */
  notes?: string;
}

/**
 * Turns a release record into release events.
 *
 * This is the notify side of the seam: the release step records what it did, in its own
 * neutral vocabulary, and the announcement is derived from that — here, in tested code,
 * rather than by cutting tags apart in a shell. The URL is FORMED from the tag (a GitHub
 * Release lives at a known address), so nothing has to ask GitHub what it already knows.
 *
 * The changelog comes from the record's own `notes`. It has to be read from there and
 * nowhere else: the first version of this function only looked at an injected `bodies` map,
 * so when the record started carrying its notes the announcements kept going out with a
 * title and a link and no changelog at all — the notes were present the whole time and
 * nothing was reading them.
 */
export function eventsFromReleases(
  released: readonly ReleasedProject[],
  options: { repositoryUrl?: string } = {},
): NotifyEvent[] {
  return released.map(({ project, version, tag, notes }) => ({
    kind: 'release' as const,
    app: project,
    version,
    ...(options.repositoryUrl
      ? {
          url: `${options.repositoryUrl.replace(/\/$/, '')}/releases/tag/${encodeURIComponent(tag)}`,
        }
      : {}),
    ...(notes ? { body: notes } : {}),
  }));
}

/**
 * One event describing everything that failed in a workflow run.
 *
 * A step and a job are BOTH inspected, and that is not belt-and-braces. Used from a separate
 * job (`needs:` + `if: failure()`) the failed jobs have concluded, so `job.conclusion` is the
 * signal; used from the SAME job as the thing that broke — a weekly audit alerting on its own
 * scan — that job is still `in_progress` while its failed step has already concluded. Reading
 * only one of the two would work in exactly one of the two shapes, and the other would send a
 * message naming nothing.
 *
 * Returns null when nothing failed. The caller must not treat that as success: it was invoked
 * because something went red, so an empty answer means the view is wrong (a token without
 * `actions: read`, a job not visible yet) and saying nothing would hide that twice over.
 */
export function eventFromRunFailures(failures: RunFailures): ErrorEvent | null {
  const failed = failures.jobs.flatMap((job) => {
    const steps = (job.steps ?? [])
      .filter((step) => step.conclusion === 'failure')
      .map((step) => step.name);
    if (job.conclusion !== 'failure' && steps.length === 0) return [];
    return [{ job: job.name, steps }];
  });

  if (failed.length === 0) return null;

  const lines = failed.map(({ job, steps }) =>
    steps.length > 0 ? `• ${job} › ${steps.join(', ')}` : `• ${job}`,
  );

  return {
    kind: 'error',
    app: failures.app,
    message: `${failures.workflow ?? 'Workflow'} failed — ${failed.length} job(s)`,
    body: lines.join('\n'),
    url: failures.url,
  };
}
