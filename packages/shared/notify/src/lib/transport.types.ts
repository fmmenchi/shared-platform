import type { Notification } from './notification.types.js';

/**
 * Delivers a notification to one channel. This is the seam that makes the library
 * channel-agnostic: `slack()` returns one, and email / webhook transports would be new
 * implementations of the same interface, not new packages.
 */
export interface Transport {
  send(notification: Notification): Promise<void>;
}
