import { escape } from './escape.js';

describe('escape', () => {
  it('neutralises markup in a value, so a name cannot become a component', () => {
    expect(escape('<mj-image src="https://evil" />')).toBe(
      '&lt;mj-image src=&quot;https://evil&quot; /&gt;',
    );
  });

  it('escapes both quotes, so a value cannot close the attribute it sits in', () => {
    expect(escape(`" onload='x'`)).toBe('&quot; onload=&#39;x&#39;');
  });

  /* The ampersand first, or `<` would come out as `&amp;lt;`. */
  it('escapes an ampersand once', () => {
    expect(escape('Tom & <Jerry>')).toBe('Tom &amp; &lt;Jerry&gt;');
  });

  it('leaves everything else alone', () => {
    expect(escape('Così è — 100% ✓')).toBe('Così è — 100% ✓');
  });
});
