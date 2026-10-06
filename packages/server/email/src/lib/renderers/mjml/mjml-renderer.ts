import mjml2html from 'mjml';
import type { Renderer } from '../../template.types.js';

/**
 * The MJML renderer: a template's `body` is MJML, and this compiles it to the HTML that
 * mail clients need.
 *
 * Validation is `strict`, and that is the reason this is not a bare call. MJML's default
 * is `soft`: markup it does not understand — a misspelled tag, a component in the wrong
 * parent — is DROPPED, the rest is compiled, and the problem is returned in an `errors`
 * array beside perfectly usable HTML. A caller that reads only `html` sends an email with
 * a hole in it. Strict throws instead, so a broken template fails where it is rendered.
 */
export function mjmlRenderer(): Renderer {
  return {
    render: async (source) => {
      const { html } = await mjml2html(source, { validationLevel: 'strict' });
      return { html };
    },
  };
}
