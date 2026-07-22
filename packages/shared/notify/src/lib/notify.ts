import type { Notification } from './notification.types.js';
import type { Transport } from './transport.types.js';

/**
 * Sends one notification to one or many transports (Slack today, email/webhook tomorrow),
 * concurrently. A single transport that throws rejects the whole call — a notification
 * that silently did not arrive is worse than one that failed loudly.
 */
export async function notify(
  transports: Transport | Transport[],
  notification: Notification,
): Promise<void> {
  const list = Array.isArray(transports) ? transports : [transports];
  await Promise.all(list.map((t) => t.send(notification)));
}
