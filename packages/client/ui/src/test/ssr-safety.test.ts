import { describe, it, expect } from 'vitest';

/**
 * SSR safety, enforced rather than remembered.
 *
 * `.agents/doc/ui.md`: "SSR-safe (no `window`/`document` at module top-level)".
 * It was written down and then broken, and the breakage was invisible to every
 * test in the package: a `const COMMANDS_SUPPORTED = typeof HTMLButtonElement
 * !== 'undefined' && …` at module scope evaluated to `false` on the server, so
 * the Dialog rendered no `command` attribute, React refused to patch it on
 * hydration, and the client-side fallback stood down because on the client the
 * same constant was `true`. The component was dead for every SSR consumer.
 *
 * A tripwire, not a parser: it catches a DOM read in a module-level `const`
 * initialiser, which is the shape that fails. Ask the question inside the
 * function that needs the answer, where it can be answered honestly.
 */
const sources = import.meta.glob(
  '../{components,primitives,form,i18n}/**/*.{ts,tsx}',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
) as Record<string, string>;

const MODULE_LEVEL_DOM_READ =
  /^(?:export\s+)?const\s+[A-Za-z_$][\w$]*(?::[^=]+)?\s*=[\s\S]{0,240}?typeof\s+(window|document|HTML\w*)\b/m;

describe('SSR safety', () => {
  const files = Object.entries(sources).filter(
    ([path]) => !path.includes('.test.') && !path.includes('/test/'),
  );

  it('found the sources', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  for (const [path, source] of files) {
    it(`${path.split('/').slice(-1)[0]} reads no DOM at module scope`, () => {
      const offender = MODULE_LEVEL_DOM_READ.exec(source);
      expect(
        offender?.[0],
        `${path} answers a DOM question when the module loads. On a server that ` +
          `answer is "no DOM", it is baked in for the life of the module, and ` +
          `the client never revisits it. Ask inside the function that needs it.`,
      ).toBeUndefined();
    });
  }
});
