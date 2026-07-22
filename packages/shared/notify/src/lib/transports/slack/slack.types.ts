/** Block Kit, kept loose: this library does not police Slack's schema. */
export type SlackBlock = Record<string, unknown>;

/** What the Slack transport needs. */
export interface SlackConfig {
  /** A bot token (`xoxb-…`) carrying the `chat:write` scope. */
  token: string;
  /** Channel ID (`C…`), not the name: a renamed channel keeps its ID. */
  channel: string;
}
