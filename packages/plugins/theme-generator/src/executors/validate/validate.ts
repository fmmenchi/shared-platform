import { logger, type PromiseExecutor } from '@nx/devkit';
import { parseCssVars, validateTheme } from '@fmmenchi/theme';
import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import type { ValidateExecutorSchema } from './schema';

/**
 * Hold every `[data-theme]` file to the contract: completeness, parsable colours,
 * the sRGB gamut, WCAG on every declared pair, an APCA floor, and the state ramps.
 *
 * THE RULES ARE IMPORTED, which is a change worth reading. This used to resolve
 * `@fmmenchi/tokens/validate` from the consumer's workspace with `createRequire`
 * and a dynamic `import()`, so the gate ran against whatever contract they had
 * installed. That bought version-tracking and cost three things: an escape-hatch
 * option for when resolution failed, a failure mode where the target refused to
 * run at all, and — because the resolved module might predate any export — a
 * comment-stripping regex inlined by hand here AND in the theme generator, each
 * copy carrying a comment apologising for the other.
 *
 * `@fmmenchi/theme` is `scope:shared`, which a plugin may depend on, so the rules
 * now travel with this plugin as ordinary code. What it enforces is the contract
 * it shipped with; what a consumer installs are the VALUES, and those it still
 * reads from their own `@fmmenchi/tokens`. Code with the tool, values with the
 * consumer.
 *
 * `parseCssVars` is the shared parser, and using it is the point rather than a
 * tidy-up: it strips comments before parsing, because a role commented out during
 * a retune still matches a naive regex — and then the gate scores contrast on a
 * value the shipped CSS does not define, while completeness passes on a role that
 * resolves to its `@property` initial-value, black, in production.
 */
const runExecutor: PromiseExecutor<ValidateExecutorSchema> = async (
  options,
  context,
) => {
  let success = true;

  for (const theme of options.themes) {
    const file = isAbsolute(theme) ? theme : join(context.root, theme);
    const declared = parseCssVars(readFileSync(file, 'utf8'));

    const colors = Object.fromEntries(
      [...declared]
        .filter(([name]) => name.startsWith('--fm-color-'))
        .map(([name, value]) => [name.slice('--fm-color-'.length), value]),
    );

    const violations = validateTheme(colors);
    if (violations.length > 0) {
      success = false;
      logger.error(
        `✗ ${theme} is NOT an allowed theme:\n  ${violations
          .map((v) => v.message)
          .join('\n  ')}`,
      );
    } else {
      logger.info(`✓ ${theme} — allowed theme`);
    }
  }

  return { success };
};

export default runExecutor;
