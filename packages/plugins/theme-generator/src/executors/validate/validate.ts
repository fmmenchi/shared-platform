import { logger, type PromiseExecutor } from '@nx/devkit';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ValidateExecutorSchema } from './schema';

interface ThemeViolation {
  message: string;
}
interface ValidateModule {
  validateTheme(colors: Readonly<Record<string, string>>): ThemeViolation[];
}

/**
 * Validates theme CSS files with the `validateTheme()` of the @fmmenchi/tokens
 * version INSTALLED in this workspace — resolved at run time, so the gate is
 * always in sync with the contract the app actually uses (completeness,
 * parsable colors, sRGB gamut, WCAG contrast on every declared pair).
 */
const runExecutor: PromiseExecutor<ValidateExecutorSchema> = async (
  options,
  context,
) => {
  let modulePath = options.tokensPath;
  if (!modulePath) {
    try {
      modulePath = createRequire(join(context.root, 'package.json')).resolve(
        '@fmmenchi/tokens/validate',
      );
    } catch {
      logger.error(
        'Could not resolve @fmmenchi/tokens from the workspace root. ' +
          'Install it, or pass --tokensPath=<path to its validate module>.',
      );
      return { success: false };
    }
  }
  const { validateTheme } = (await import(
    pathToFileURL(modulePath).href
  )) as ValidateModule;

  let success = true;
  for (const theme of options.themes) {
    const file = isAbsolute(theme) ? theme : join(context.root, theme);
    const css = readFileSync(file, 'utf8');
    const colors = Object.fromEntries(
      [...css.matchAll(/--fm-color-([a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [
        m[1],
        m[2].replace(/\s+/g, ' ').trim(),
      ]),
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
