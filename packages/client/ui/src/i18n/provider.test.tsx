import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UiProvider, useMessages } from './provider.js';
import { defineMessages } from './messages.js';
import { renderUi } from '../test/render.js';
import type { UseFormField } from '../form/form-adapter.types.js';

// Pure provider/i18n logic — tested generically, not through any component.

describe('UiProvider — direction', () => {
  const dirOf = (locale: string) =>
    renderUi(<span>x</span>, { locale }).container.querySelector('[dir]');

  it('is ltr for a Latin locale', () => {
    expect(dirOf('en')).toHaveAttribute('dir', 'ltr');
  });

  it('is rtl for Arabic', () => {
    expect(dirOf('ar')).toHaveAttribute('dir', 'rtl');
  });

  it('is script-aware: az-Arab is rtl, az is ltr', () => {
    // Direction comes from the resolved script, not the language — a
    // language-only check would get az-Arab wrong.
    expect(dirOf('az-Arab')).toHaveAttribute('dir', 'rtl');
    expect(dirOf('az')).toHaveAttribute('dir', 'ltr');
  });
});

/**
 * Nesting is how one screen scopes ONE adapter — the TanStack binding, which
 * closes over a form instance and so cannot be given app-wide like the other
 * three. It has to cost a single line, or the app-level provider stops being
 * the normal case.
 */
describe('UiProvider — nesting', () => {
  const field: UseFormField = (name) => ({ control: { name } });

  function Probe() {
    const t = useMessages(
      defineMessages('nest', {
        en: { hi: 'Hello' },
        it: { hi: 'Ciao' },
        ar: { hi: 'مرحبا' },
      }),
    );
    return <span>{t('hi')}</span>;
  }

  it('inherits every adapter it does not declare', () => {
    render(
      <UiProvider adapters={{ i18n: { locale: 'it' } }}>
        <UiProvider adapters={{ form: { field } }}>
          <Probe />
        </UiProvider>
      </UiProvider>,
    );
    // the locale came from above, unrepeated
    expect(screen.getByText('Ciao')).toBeInTheDocument();
  });

  it('adds NO second wrapper when it changes neither direction nor theme', () => {
    const { container } = render(
      <UiProvider adapters={{ i18n: { locale: 'en' } }}>
        <UiProvider adapters={{ form: { field } }}>
          <span>x</span>
        </UiProvider>
      </UiProvider>,
    );
    // One box, not two: a nested `dir`/`data-theme` would only repeat its
    // ancestor's, and an extra element inside a grid or a flex row is not free.
    expect(container.querySelectorAll('[dir]')).toHaveLength(1);
  });

  it('does wrap when the direction changes', () => {
    const { container } = render(
      <UiProvider adapters={{ i18n: { locale: 'en' } }}>
        <UiProvider adapters={{ i18n: { locale: 'ar' } }}>
          <span>x</span>
        </UiProvider>
      </UiProvider>,
    );
    const boxes = container.querySelectorAll('[dir]');
    expect(boxes).toHaveLength(2);
    expect(boxes[1]).toHaveAttribute('dir', 'rtl');
  });

  it('does wrap when a theme is declared', () => {
    const { container } = render(
      <UiProvider adapters={{ i18n: { locale: 'en' } }}>
        <UiProvider adapters={{}} theme="night">
          <span>x</span>
        </UiProvider>
      </UiProvider>,
    );
    expect(container.querySelector('[data-theme="night"]')).toBeInTheDocument();
  });

  it('throws when nothing above declares `i18n`', () => {
    // Degrading to a default locale would pick a language nobody on the team
    // reads, and say nothing about it.
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    expect(() =>
      render(
        <UiProvider adapters={{ form: { field } }}>
          <span>x</span>
        </UiProvider>,
      ),
    ).toThrow(/no `i18n` in scope/);
    error.mockRestore();
  });
});

describe('useMessages', () => {
  const messages = defineMessages('probe', {
    en: { hi: 'Hello' },
    it: { hi: 'Ciao' },
    ar: { hi: 'مرحبا' },
  });

  function Probe() {
    const t = useMessages(messages);
    return <span>{t('hi')}</span>;
  }

  it('resolves from the active locale', () => {
    renderUi(<Probe />, { locale: 'it' });
    expect(screen.getByText('Ciao')).toBeInTheDocument();
  });

  it('falls back to the base locale outside a provider', () => {
    render(<Probe />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('falls back to the base locale for an unsupported locale', () => {
    renderUi(<Probe />, { locale: 'de' });
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it("honors the app's namespaced override", () => {
    render(
      <UiProvider
        adapters={{ i18n: { locale: 'it', messages: { 'probe.hi': 'Yo' } } }}
      >
        <Probe />
      </UiProvider>,
    );
    expect(screen.getByText('Yo')).toBeInTheDocument();
  });

  describe('a message with a moving part', () => {
    const greetings = defineMessages('probe', {
      en: { hi: 'Back to {name}' },
      it: { hi: 'Torna a {name}' },
      ar: { hi: 'العودة إلى {name}' },
    });

    function Greet(props: { values?: Record<string, string> }) {
      const t = useMessages(greetings);
      return <span data-testid="out">{t('hi', props.values)}</span>;
    }

    it('fills the hole', () => {
      renderUi(<Greet values={{ name: 'Share' }} />, { locale: 'en' });
      expect(screen.getByTestId('out')).toHaveTextContent('Back to Share');
    });

    it('lets the copy decide the word order, which is the whole point', () => {
      // THE CASE THE OLD SHAPE COULD NOT REACH. Concatenating a fragment with a
      // name — `t('back') + ' ' + name` — puts "<something> <name>" in the CODE,
      // so no translator and no app override could produce Japanese, where the
      // name comes first and the verb last. With a hole in the string, an
      // override is all it takes.
      render(
        <UiProvider
          adapters={{
            i18n: { locale: 'en', messages: { 'probe.hi': '{name}に戻る' } },
          }}
        >
          <Greet values={{ name: '共有' }} />
        </UiProvider>,
      );
      expect(screen.getByTestId('out')).toHaveTextContent('共有に戻る');
    });

    it('leaves an unfilled hole visible, and says so', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      // A value IS passed, and it is the wrong one — which is the case that
      // actually happens: an app overrides the message with one whose holes the
      // component knows nothing about. Passing none at all takes an early
      // return and never reaches the decision this is about.
      renderUi(<Greet values={{ other: 'x' }} />, { locale: 'en' });

      // NOT blanked: an app may override a message with one whose holes the
      // component knows nothing about, and a visible `{name}` is a bug somebody
      // reports — where an empty string is a label that quietly says less than
      // it should, in an `aria-label` nobody reads before a screen reader does.
      expect(screen.getByTestId('out')).toHaveTextContent('Back to {name}');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('unfilled placeholder'),
      );
      warn.mockRestore();
    });

    it('says nothing when there is no hole to fill', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      renderUi(<Probe />, { locale: 'en' });
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });
});
