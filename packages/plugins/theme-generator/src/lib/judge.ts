import { parseCssVars, resolveCssVar, validateTheme } from '@fmmenchi/theme';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

/**
 * JUDGING A THEME — the one piece of reasoning the generator and the executor share,
 * and which they used to hold a copy of each.
 *
 * The generator refuses a theme before writing it; the executor refuses one in CI.
 * Those are different moments with the same question, and the answer has a shape that
 * is easy to get subtly wrong in two places at once:
 *
 *   COMPLETENESS is judged on the roles the THEME ITSELF declares.
 *   RESOLUTION may look wider, because a role legitimately points at a rung.
 *
 * Keeping those two apart is the whole point. Resolve a theme against a context that
 * also carries `vars.css` and every role the theme FORGOT resolves anyway, out of the
 * reference stylesheet — so an incomplete theme reports as allowed, which is the one
 * verdict that cannot be recovered from downstream. Resolve it against nothing but
 * itself and a perfectly correct theme is refused for pointing at the palette it is
 * meant to point at.
 */
export interface Judgement {
  readonly ok: boolean;
  /** Every problem, in the order a reader would ask about them. Empty when `ok`. */
  readonly problems: readonly string[];
}

/**
 * Whether these declarations are an allowed theme.
 *
 * @param own the theme's OWN declarations — what it is judged complete on
 * @param context where a `var()` may resolve from: `own`, plus whatever sits
 *   underneath it in the cascade. Pass `own` when the file must stand alone.
 */
export function judgeTheme(
  own: ReadonlyMap<string, string>,
  context: ReadonlyMap<string, string> = own,
): Judgement {
  const colors: Record<string, string> = {};
  const problems: string[] = [];

  for (const [name, value] of own) {
    if (!name.startsWith('--fm-color-')) continue;
    try {
      colors[name.slice('--fm-color-'.length)] = resolveCssVar(value, context);
    } catch (error) {
      // A reference to something nothing declares. Left alone it installs a role
      // that falls back to its `@property` initial-value — opaque black, in both
      // themes, with nothing falsy for a later check to notice.
      problems.push(`${name} does not resolve — ${(error as Error).message}`);
    }
  }

  problems.push(...validateTheme(colors).map((v) => v.message));

  return { ok: problems.length === 0, problems };
}

/**
 * The INSTALLED tokens contract, read from the consumer's own workspace.
 *
 * Code travels with this plugin; VALUES stay with the consumer, because the
 * stylesheet their app paints with is theirs. Resolved through `createRequire` from
 * their workspace root rather than imported, which is also forced: `scope:plugins`
 * may not depend on `scope:client`.
 *
 * Returns an EMPTY map rather than throwing when tokens cannot be resolved and no
 * path was given. That is deliberate for the executor's sake: a theme carrying its
 * own palette — which is what the builder's `--from` file does — needs no reference
 * stylesheet at all, and refusing to run would turn a self-contained theme into a
 * broken pipeline. A theme that genuinely needed the palette then reports the
 * dangling reference by name, which says more than "could not resolve tokens".
 */
export function readInstalledTokens(
  root: string,
  tokensPath?: string,
): { declared: Map<string, string>; version: string; path?: string } {
  const req = createRequire(join(root, 'package.json'));
  let path = tokensPath;
  let version = 'unknown';

  try {
    path = path ?? req.resolve('@fmmenchi/tokens/styles/vars.css');
    version = (
      JSON.parse(
        readFileSync(req.resolve('@fmmenchi/tokens/package.json'), 'utf8'),
      ) as { version: string }
    ).version;
  } catch {
    if (!path) return { declared: new Map(), version };
  }

  return {
    declared: parseCssVars(readFileSync(path as string, 'utf8')),
    version,
    path,
  };
}
