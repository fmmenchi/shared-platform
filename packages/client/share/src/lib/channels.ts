/**
 * Every channel a link can be built for. Which of them a page offers, and in
 * what order, is the app's decision: it passes its own subset.
 */
export const SHARE_CHANNELS = [
  'whatsapp',
  'x',
  'facebook',
  'telegram',
  'email',
  'bluesky',
  'linkedin',
  'hackernews',
] as const;

export type ShareChannel = (typeof SHARE_CHANNELS)[number];

/** Proper nouns, so they are never translated. */
export const SHARE_CHANNEL_NAMES: Record<ShareChannel, string> = {
  whatsapp: 'WhatsApp',
  x: 'X',
  facebook: 'Facebook',
  telegram: 'Telegram',
  email: 'Email',
  bluesky: 'Bluesky',
  linkedin: 'LinkedIn',
  hackernews: 'Hacker News',
};
