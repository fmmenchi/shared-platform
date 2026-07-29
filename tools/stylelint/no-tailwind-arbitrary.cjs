'use strict';
/**
 * fmmenchi/no-tailwind-arbitrary — bans Tailwind ARBITRARY VALUES in `@apply`.
 *
 * The token bridge resets the palettes so `bg-red-500` cannot compile, but
 * `bg-[#123456]` / `text-[oklch(…)]` / `w-[37px]` sidestep the whole semantic
 * contract ("la semantica vince su tutto"). This rule closes that escape
 * hatch where components are authored: the `@apply` lines of the CSS Modules.
 */
const stylelint = require('stylelint');

const ruleName = 'fmmenchi/no-tailwind-arbitrary';
const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (utility) =>
    `Arbitrary Tailwind value "${utility}" bypasses the token contract — use a semantic role/scale utility instead`,
  rawMotion: (utility) =>
    `Raw motion utility "${utility}" bypasses the motion tokens — use var(--fm-duration-*) / var(--fm-ease-*) or the --fm-transition-* composites`,
});

const ARBITRARY = /[\w-]+-\[[^\]]*\]/g;
// Numeric motion utilities are DYNAMIC in Tailwind v4 (not theme-driven), so
// resetting the namespaces can't stop them: `duration-150`/`delay-75` compile
// to raw milliseconds, bypassing the motion tokens.
const RAW_MOTION = /\b(?:duration|delay)-\d+\b/g;

module.exports = stylelint.createPlugin(ruleName, (primary) => {
  return (root, result) => {
    if (!primary) return;
    root.walkAtRules('apply', (atRule) => {
      for (const match of atRule.params.matchAll(ARBITRARY)) {
        stylelint.utils.report({
          message: messages.rejected(match[0]),
          node: atRule,
          result,
          ruleName,
        });
      }
      for (const match of atRule.params.matchAll(RAW_MOTION)) {
        stylelint.utils.report({
          message: messages.rawMotion(match[0]),
          node: atRule,
          result,
          ruleName,
        });
      }
    });
  };
});
module.exports.ruleName = ruleName;
module.exports.messages = messages;
