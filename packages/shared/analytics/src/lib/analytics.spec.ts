import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAnalytics, noopClient } from './client.js';
import { resolveAnalytics } from './config.js';
import { analytics, initAnalytics } from './facade.js';
import { analyticsScript } from './script.js';

describe('resolveAnalytics', () => {
  it('is null when env is unset — analytics is off by default', () => {
    expect(resolveAnalytics({})).toBeNull();
  });

  it('resolves a valid config and derives connectSrc from the script URL', () => {
    expect(
      resolveAnalytics({
        ANALYTICS_PROVIDER: 'umami',
        ANALYTICS_SRC: 'https://a.example.com/script.js',
        ANALYTICS_SITE_ID: 's1',
      }),
    ).toEqual({
      provider: 'umami',
      src: 'https://a.example.com/script.js',
      siteId: 's1',
      connectSrc: 'https://a.example.com',
    });
  });

  it('a bad provider or URL disables analytics (never breaks the page)', () => {
    expect(
      resolveAnalytics({
        ANALYTICS_PROVIDER: 'ga',
        ANALYTICS_SRC: 'https://x/y',
        ANALYTICS_SITE_ID: 's',
      }),
    ).toBeNull();
    expect(
      resolveAnalytics({
        ANALYTICS_PROVIDER: 'umami',
        ANALYTICS_SRC: 'not a url',
        ANALYTICS_SITE_ID: 's',
      }),
    ).toBeNull();
  });
});

describe('createAnalytics / facade', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    initAnalytics(null); // reset the module facade to no-op
  });

  it('returns the no-op client with no config or on the server (no window)', () => {
    expect(createAnalytics(null)).toBe(noopClient);
  });

  it('wires the provider adapter to its browser global', () => {
    const track = vi.fn();
    vi.stubGlobal('window', {});
    vi.stubGlobal('umami', { track });
    const client = createAnalytics({
      provider: 'umami',
      src: 'x',
      siteId: 's',
      connectSrc: 'x',
    });
    client.track('evt', { a: 1 });
    client.pageview('/p');
    expect(track).toHaveBeenCalledWith('evt', { a: 1 });
    expect(track).toHaveBeenCalledWith({ url: '/p' });
  });

  it('the facade is no-op until initAnalytics, then delegates', () => {
    const plausible = vi.fn();
    vi.stubGlobal('window', {});
    vi.stubGlobal('plausible', plausible);
    expect(() => analytics.track('before-init')).not.toThrow();
    initAnalytics({
      provider: 'plausible',
      src: 'x',
      siteId: 'd',
      connectSrc: 'x',
    });
    analytics.track('after', { p: 1 });
    expect(plausible).toHaveBeenCalledWith('after', { props: { p: 1 } });
  });
});

describe('analyticsScript', () => {
  it('is null when analytics is off (ships zero third-party code)', () => {
    expect(analyticsScript(null)).toBeNull();
  });

  it('maps the provider to its script data-attribute', () => {
    expect(
      analyticsScript({
        provider: 'umami',
        src: 's',
        siteId: 'w1',
        connectSrc: 'c',
      }),
    ).toEqual({
      src: 's',
      async: true,
      attributes: { 'data-website-id': 'w1' },
    });
    expect(
      analyticsScript({
        provider: 'plausible',
        src: 's',
        siteId: 'd1',
        connectSrc: 'c',
      })?.attributes,
    ).toEqual({ 'data-domain': 'd1' });
  });
});
