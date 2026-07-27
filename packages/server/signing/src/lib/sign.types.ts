/** Options for {@link sign}. */
export interface SignOptions {
  /**
   * Token lifetime in **milliseconds** from now. Stored as an absolute expiry inside the
   * token and enforced by {@link verify}. Omit for a token that never expires.
   */
  expiresIn?: number;
}
