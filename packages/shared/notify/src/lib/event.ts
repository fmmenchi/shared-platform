import { errorNotification, releaseNotification } from './notification.js';
import type { Notification } from './notification.types.js';
import type { Transport } from './transport.types.js';
import type { Delivery, NotifyEvent } from './event.types.js';

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
    : errorNotification(event.app, event.message, event.url ?? '');
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
}

/**
 * Turns a release record into release events.
 *
 * This is the notify side of the seam: the release step records what it did, in its own
 * neutral vocabulary, and the announcement is derived from that — here, in tested code,
 * rather than by cutting tags apart in a shell. The URL is FORMED from the tag (a GitHub
 * Release lives at a known address), so nothing has to ask GitHub what it already knows.
 */
export function eventsFromReleases(
  released: readonly ReleasedProject[],
  options: { repositoryUrl?: string; bodies?: Record<string, string> } = {},
): NotifyEvent[] {
  return released.map(({ project, version, tag }) => ({
    kind: 'release' as const,
    app: project,
    version,
    ...(options.repositoryUrl
      ? {
          url: `${options.repositoryUrl.replace(/\/$/, '')}/releases/tag/${encodeURIComponent(tag)}`,
        }
      : {}),
    ...(options.bodies?.[project] ? { body: options.bodies[project] } : {}),
  }));
}
