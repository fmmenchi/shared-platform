/**
 * An email an app can send: three functions of the same data.
 *
 * Templates are authored by the consumer and never live in this package — it ships the
 * engine, not the content. A template is a plain object; annotate it with this type and
 * `Data` is checked at every `sendEmail` call.
 */
export interface EmailTemplate<Data> {
  subject(data: Data): string;
  /** The plain-text alternative, written by hand: it is not derived from the markup. */
  text(data: Data): string;
  /**
   * The markup the renderer compiles — MJML for `mjmlRenderer()`. Values interpolated
   * into it must go through `escape()`: nothing downstream can tell data from markup.
   */
  body(data: Data): string;
}

/** What a renderer produces. */
export interface RenderedBody {
  html: string;
}

/**
 * Compiles a template's markup into the HTML that is sent. `mjmlRenderer()` returns one;
 * the interface is what keeps the template engine out of the core. Asynchronous whatever
 * the engine, so an engine that is cannot change the contract.
 */
export interface Renderer {
  render(source: string): Promise<RenderedBody>;
}
