import { describe, it, expect, afterEach, vi } from 'vitest';
import { lockScroll, unlockScroll } from './scroll-lock.js';

/**
 * The gutter cannot be produced honestly in headless Chromium (overlay
 * scrollbars measure zero), so it is stubbed at the one seam the function
 * reads it through — `window.innerWidth` — and everything after the read is
 * exercised for real: the side, the sum, the restore.
 */
const withGutter = (px: number) =>
  vi
    .spyOn(window, 'innerWidth', 'get')
    .mockImplementation(() => document.documentElement.clientWidth + px);

afterEach(() => {
  vi.restoreAllMocks();
  const root = document.documentElement;
  while (root.dataset['fmScrollLock']) unlockScroll();
  root.removeAttribute('style');
  root.removeAttribute('dir');
});

describe('scroll lock compensation', () => {
  it('pads the side the scrollbar is on, which rtl moves', () => {
    // Chromium and Firefox draw the classic vertical scrollbar on the LEFT of
    // an rtl page: padding the right both leaves the jump and adds a spurious
    // gutter on the reading side. The original only ever measured ltr.
    document.documentElement.setAttribute('dir', 'rtl');
    withGutter(15);
    lockScroll();
    expect(
      document.documentElement.style.getPropertyValue('padding-left'),
    ).toBe('15px');
    expect(
      document.documentElement.style.getPropertyValue('padding-right'),
    ).toBe('');
  });

  it("adds the gutter to the page's own padding instead of replacing it", () => {
    // `html { padding-right: 2rem }` overwritten with the bare gutter jumped
    // the content left by 2rem — the movement the function exists to prevent.
    const sheet = document.createElement('style');
    sheet.textContent = 'html { padding-right: 32px }';
    document.head.append(sheet);
    withGutter(15);
    lockScroll();
    expect(
      document.documentElement.style.getPropertyValue('padding-right'),
    ).toBe('47px');
    unlockScroll();
    sheet.remove();
  });

  it('gives a consumer their inline padding back on unlock', () => {
    // removeProperty would delete a value this code did not write.
    document.documentElement.style.setProperty('padding-right', '20px');
    withGutter(15);
    lockScroll();
    expect(
      document.documentElement.style.getPropertyValue('padding-right'),
    ).toBe('35px');
    unlockScroll();
    expect(
      document.documentElement.style.getPropertyValue('padding-right'),
    ).toBe('20px');
  });
});
