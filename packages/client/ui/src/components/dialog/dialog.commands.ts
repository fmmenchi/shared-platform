/**
 * Does this browser have invoker commands — `command` / `commandfor`?
 *
 * Asked at CLICK TIME, on purpose, and this is the second time this component
 * has learnt the lesson. As a module constant it was `false` on the server, so
 * the rendered HTML carried no `command` attribute; React does not patch a
 * missing attribute on hydration ("This won't be patched up", it says so
 * itself), and on the client the same constant was `true`, so the fallback
 * stood down. Measured: the dialog was dead for every SSR consumer, trigger and
 * close alike, in all three engines.
 *
 * The attributes are now rendered ALWAYS — they are inert where they are not
 * understood — and only this question is deferred to the moment it can be
 * answered honestly.
 */
export function commandsSupported(): boolean {
  return (
    typeof HTMLButtonElement !== 'undefined' &&
    'command' in HTMLButtonElement.prototype
  );
}
