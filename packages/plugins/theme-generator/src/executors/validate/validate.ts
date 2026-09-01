import { logger, type PromiseExecutor } from '@nx/devkit';
import { parseCssVars } from '@fmmenchi/theme';
import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { judgeTheme, readInstalledTokens } from '../../lib/judge';
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
 *
 * IT RESOLVES `var()` NOW, AND IT REFUSED ITS OWN GENERATOR'S OUTPUT UNTIL IT DID.
 * The roles were measured as WRITTEN, so a theme saying
 * `--fm-color-primary: var(--fm-palette-primary-700)` was scored as the literal
 * string `var(…)`, which is not a colour — every role unparsable, every theme
 * refused. That is precisely the file `theme --from` writes: a three-layer handoff
 * whose roles point at rungs is the whole design, and the generator validates it
 * in memory by resolving first. So the tool wrote a theme it had judged allowed and
 * the CI gate then rejected it, with a message about unparsable colours rather than
 * about the reference it had not followed.
 *
 * THE REFERENCE STYLESHEET GOES UNDERNEATH, NOT ALONGSIDE, and the distinction is
 * load-bearing. A theme block sits over `vars.css` in the cascade, so its roles may
 * point at rungs `vars.css` declares — resolution has to see both. But COMPLETENESS
 * is judged on the theme's own roles only: merge the two and a role the theme forgot
 * resolves out of the reference stylesheet, and an incomplete theme reports as
 * allowed. That is the one verdict nothing downstream can recover from, and
 * `judgeTheme` keeps the two questions apart for exactly that reason.
 *
 * ONE BAD FILE DOES NOT ABORT THE RUN. Every theme is judged and reported; the exit
 * status is the conjunction. A target that stops at the first failure makes a person
 * re-run it once per broken theme.
 */
const runExecutor: PromiseExecutor<ValidateExecutorSchema> = async (
  options,
  context,
) => {
  let success = true;

  // Read ONCE for the whole run — it is the same stylesheet for every theme.
  const tokens = readInstalledTokens(context.root, options.tokensPath);
  if (tokens.path) {
    logger.info(
      `Resolving palette references against @fmmenchi/tokens ${tokens.version}.`,
    );
  }

  for (const theme of options.themes) {
    const file = isAbsolute(theme) ? theme : join(context.root, theme);
    const own = parseCssVars(readFileSync(file, 'utf8'));

    const { ok, problems } = judgeTheme(
      own,
      new Map([...tokens.declared, ...own]),
    );

    if (ok) {
      logger.info(`✓ ${theme} — allowed theme`);
    } else {
      success = false;
      logger.error(
        `✗ ${theme} is NOT an allowed theme:\n  ${problems.join('\n  ')}`,
      );
    }
  }

  return { success };
};

export default runExecutor;
