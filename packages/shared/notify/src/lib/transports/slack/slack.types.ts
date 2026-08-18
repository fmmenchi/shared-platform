/** Block Kit, kept loose: this library does not police Slack's schema. */
export type SlackBlock = Record<string, unknown>;

/** What the Slack transport needs. */
export interface SlackConfig {
  /**
   * A bot token (`xoxb-…`) carrying `chat:write` — plus `files:write` if any notification
   * carries attachments, which Slack answers with a 200 and `{ok:false}` when it is missing.
   */
  token: string;
  /** Channel ID (`C…`), not the name: a renamed channel keeps its ID. */
  channel: string;
}

/**
 * Slack's response shape, reduced to what is read.
 *
 * `ok` matters more than the HTTP status: Slack answers 200 for a rejected call. `ts` is the
 * posted message's timestamp, which is also its thread id.
 */
export interface SlackResponse {
  ok: boolean;
  error?: string;
  ts?: string;
}

/** What `files.getUploadURLExternal` hands back before the bytes are sent. */
export interface SlackUploadUrlResponse extends SlackResponse {
  upload_url?: string;
  file_id?: string;
}
