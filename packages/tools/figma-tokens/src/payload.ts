/**
 * Resolving a contract against a stylesheet.
 *
 * The invariant this file exists to hold: EVERY declared custom property is
 * either mapped by a rule or skipped by a named exclusion. There is no third
 * outcome and no default — a property nobody has decided about becomes a
 * `problem`, which is what lets a token added to the design system fail this
 * tool instead of quietly missing from Figma.
 */
import { toFigmaColor, toFigmaNumber } from './convert.js';
import { parseCustomProperties } from './parse.js';
import type { TokenContract, TokenRule } from './contract.types.js';
import type {
  FigmaTokenPayload,
  FigmaVariable,
  SkippedToken,
} from './payload.types.js';

/** `$1`, or `$2|default` for "this group, or `default` when it captured nothing". */
const PLACEHOLDER = /\$(\d)(?:\|([a-z0-9-]+))?/g;

const expandPath = (template: string, match: RegExpExecArray): string =>
  template.replace(
    PLACEHOLDER,
    (_, index: string, fallback: string | undefined) => {
      const captured = match[Number(index)] ?? '';
      return captured === '' ? (fallback ?? '') : captured;
    },
  );

/** Anchored so a rule cannot match a prefix of a longer property by accident. */
const compile = (source: string) => new RegExp(`^(?:${source})$`);

const resolveValue = (rule: TokenRule, css: string, rootFontSize: number) =>
  rule.type === 'COLOR' ? toFigmaColor(css) : toFigmaNumber(css, rootFontSize);

/**
 * Turn a stylesheet into the Figma variables a contract declares it should
 * become. Rules are tried in order and the first match wins, so an exception
 * must be written before the general rule it excepts.
 */
export const buildPayload = (
  css: string,
  contract: TokenContract,
): FigmaTokenPayload => {
  const declared = parseCustomProperties(css);

  const rules = contract.rules.map((rule) => ({
    rule,
    test: compile(rule.match),
  }));
  const exclusions = contract.exclusions.map((ex) => ({
    ex,
    test: compile(ex.match),
  }));

  const variables: FigmaVariable[] = [];
  const skipped: SkippedToken[] = [];
  const problems: string[] = [];
  const claimed = new Map<string, string>();

  for (const [cssVar, value] of declared) {
    const matched = rules
      .map(({ rule, test }) => ({ rule, hit: test.exec(cssVar) }))
      .find(({ hit }) => hit !== null);

    if (!matched?.hit) {
      const excluded = exclusions.find(({ test }) => test.test(cssVar));
      if (excluded)
        skipped.push({ cssVar, css: value, reason: excluded.ex.reason });
      else
        problems.push(
          `unaccounted: ${cssVar} matches no rule and no exclusion`,
        );
      continue;
    }

    const { rule, hit } = matched;
    const path = expandPath(rule.path, hit);

    const previous = claimed.get(path);
    if (previous) {
      problems.push(
        `path collision: ${previous} and ${cssVar} both map to ${path}`,
      );
      continue;
    }
    claimed.set(path, cssVar);

    const converted = resolveValue(rule, value, contract.rootFontSize);
    if ('error' in converted) {
      problems.push(`${cssVar}: ${converted.error}`);
      continue;
    }

    variables.push({
      cssVar,
      path,
      type: rule.type,
      css: value,
      value: converted.value,
      scopes: rule.scopes,
      ...(converted.clipped ? { clipped: true } : {}),
    });
  }

  return { contract: contract.name, variables, skipped, problems };
};
