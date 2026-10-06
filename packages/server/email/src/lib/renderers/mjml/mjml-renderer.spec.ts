import { escape } from '../../escape.js';
import { mjmlRenderer } from './mjml-renderer.js';

const wrap = (content: string) =>
  `<mjml><mj-body><mj-section><mj-column>${content}</mj-column></mj-section></mj-body></mjml>`;

describe('mjmlRenderer', () => {
  it('compiles MJML into a full HTML document carrying the content', async () => {
    const { html } = await mjmlRenderer().render(
      wrap('<mj-text>Hello Ada</mj-text>'),
    );

    expect(html).toMatch(/^\s*<!doctype html>/i);
    expect(html).toContain('Hello Ada');
    expect(html).not.toContain('<mj-text');
  });

  /*
   * The reason for `strict`. MJML's default drops what it does not understand and
   * returns the rest as usable HTML, with the problem in an array beside it.
   */
  it('throws on a tag MJML does not know, instead of sending an email without it', async () => {
    await expect(
      mjmlRenderer().render(wrap('<mj-txt>Hello</mj-txt>')),
    ).rejects.toThrow(/mj-txt/);
  });

  it('throws on a component in the wrong parent', async () => {
    await expect(
      mjmlRenderer().render(
        '<mjml><mj-body><mj-text>Hello</mj-text></mj-body></mjml>',
      ),
    ).rejects.toThrow(/mj-text cannot be used inside mj-body/);
  });

  /* The two halves of the package meeting: an escaped value stays text in the output. */
  it('keeps an escaped value as text', async () => {
    const hostile = '<mj-image src="https://evil.test/x.png" />';

    const { html } = await mjmlRenderer().render(
      wrap(`<mj-text>${escape(hostile)}</mj-text>`),
    );

    expect(html).toContain('&lt;mj-image');
    expect(html).not.toContain('<img');
  });
});
