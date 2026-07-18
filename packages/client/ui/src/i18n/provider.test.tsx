import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UiProvider, useMessages } from './provider.js';
import { defineMessages } from './messages.js';
import { renderUi } from '../test/render.js';

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
});
