'use strict';
/**
 * fmmenchi/no-unresolvable-var — every `var()` a component authors must still
 * resolve in a CONSUMER's page.
 *
 * The defect this exists for shipped once already. `fieldset-legend` wrote
 * `margin-block-end: var(--spacing-internal-xs)` — the Tailwind BRIDGE alias.
 * `@apply` resolves an alias at build time (`gap-internal-xs` ships as
 * `gap: var(--fm-space-internal-xs)`), but a hand-written `var()` is passed
 * through untouched, and the alias is defined only in
 * `@fmmenchi/tokens/styles/tailwind.css` — which Storybook and the test suite
 * were importing and no consumer ever does. So the declaration shipped, resolved
 * to nothing, and the legend had no bottom margin in every consuming app.
 *
 * A typo in a real token name (`--fm-color-inputt`) fails the same way and just
 * as silently, so the rule checks the names too, not only the prefix.
 *
 * Allowed inside a `*.module.css`:
 *   1. a `--fm-*` token that the token package actually defines, and
 *   2. a custom property the same file declares (Alert's `--alert-bg`, Badge's
 *      `--badge-solid-fg` — locals a variant sets and the base rule reads).
 * Everything else is rejected: it either does not ship or does not exist.
 */
const fs = require('node:fs');
const path = require('node:path');
const stylelint = require('stylelint');

const ruleName = 'fmmenchi/no-unresolvable-var';
const messages = stylelint.utils.ruleMessages(ruleName, {
  bridge: (name) =>
    `"${name}" is a Tailwind bridge alias, not a token — it is defined only in @fmmenchi/tokens/styles/tailwind.css, which no consumer imports, so this var() ships unresolved. \`@apply\` resolves aliases at build time; a hand-written var() does not. Name the token instead (var(--fm-…)).`,
  unknownToken: (name) =>
    `"${name}" is not defined by @fmmenchi/tokens — a var() naming a token that does not exist resolves to nothing, silently. Check the spelling against tokens/src/styles/vars.css.`,
  foreign: (name) =>
    `"${name}" is neither an @fmmenchi/tokens token nor a custom property this file declares, so nothing a consumer imports defines it. Use a var(--fm-…) token, or declare it in this module.`,
});

// The token files, relative to this plugin. `vars.css` holds every value;
// `properties.css` registers the typed subset (ADR-0012) — union them so a role
// that is only registered still counts as defined.
const TOKEN_SOURCES = [
  '../../packages/client/tokens/src/styles/vars.css',
  '../../packages/client/tokens/src/styles/properties.css',
];

const DEFINED = /(?:^|[;{]|@property)\s*(--fm-[A-Za-z0-9_-]+)\s*[:{]/gm;
// The capture stops at the name; group 2 sniffs whether a fallback follows.
const USED = /var\(\s*(--[A-Za-z0-9_-]+)\s*(,)?/g;
const DECLARED_IN_FILE = /^--[A-Za-z0-9_-]+$/;

/** Read the token contract once per process — the files do not change mid-run. */
let tokenCache;
function knownTokens() {
  if (tokenCache !== undefined) return tokenCache;
  const tokens = new Set();
  for (const rel of TOKEN_SOURCES) {
    let css;
    try {
      css = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
    } catch {
      // The plugin must not turn a moved/missing token file into a wall of
      // false positives: degrade to prefix-only checking instead.
      tokenCache = null;
      return tokenCache;
    }
    for (const match of css.matchAll(DEFINED)) tokens.add(match[1]);
  }
  tokenCache = tokens.size > 0 ? tokens : null;
  return tokenCache;
}

module.exports = stylelint.createPlugin(ruleName, (primary) => {
  return (root, result) => {
    if (!primary) return;

    // Locals first: a variant rule may declare what the base rule reads, in
    // either order, so the whole file is collected before anything is judged.
    const locals = new Set();
    root.walkDecls((decl) => {
      if (DECLARED_IN_FILE.test(decl.prop)) locals.add(decl.prop);
    });

    const tokens = knownTokens();

    root.walkDecls((decl) => {
      for (const match of decl.value.matchAll(USED)) {
        const name = match[1];
        if (locals.has(name)) continue;
        // A var() WITH A FALLBACK cannot ship unresolved — the fallback IS the
        // resolution, by construction. This is how a component declares a knob
        // the CONSUMER may set (`var(--app-layout-header-offset, 0px)`)
        // without a local default that would shadow a value inherited from
        // :root — locality beats inheritance for custom properties, layers or
        // not. The rule kept flagging exactly that shape, and what it exists
        // for — a name that resolves to NOTHING — is the case with no
        // fallback.
        if (match[2] === ',') continue;

        let message;
        if (name.startsWith('--fm-')) {
          // With no readable token contract, the prefix is all we can trust.
          if (tokens === null || tokens.has(name)) continue;
          message = messages.unknownToken(name);
        } else if (name.startsWith('--tw-')) {
          // Tailwind's own internals: emitted by the compiler, never authored.
          message = messages.foreign(name);
        } else {
          message = messages.bridge(name);
        }

        stylelint.utils.report({
          message,
          node: decl,
          word: name,
          result,
          ruleName,
        });
      }
    });
  };
});
module.exports.ruleName = ruleName;
module.exports.messages = messages;
