import {
  formatFiles,
  joinPathFragments,
  readProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join } from 'node:path';
import { resolveCssVar, validateTheme } from '@fmmenchi/theme';
import { validationGenerator } from '../validation/validation';
import type { ThemeGeneratorSchema } from './schema';

/** One `--fm-color-*` declaration: the variable name and the value to emit. */
type RoleDeclaration = readonly [name: string, value: string];

/**
 * The reference theme, read off the INSTALLED contract — the scaffold path.
 *
 * COMMENTS STRIPPED FIRST, for the reason `@fmmenchi/tokens`' own `parseCssVars`
 * documents at length: a role commented out during a retune still matches the
 * regex, and the scaffold would then carry a token the shipped CSS does not
 * define — the theme starts life already ahead of the contract it claims to
 * instantiate. Stripping is inlined rather than imported because the tokens
 * package resolved here is the INSTALLED one, whose version may predate the
 * export; two lines beat a version negotiation.
 */
function readReferenceTheme(varsPath: string): RoleDeclaration[] {
  const vars = readFileSync(varsPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const roles = [
    ...vars.matchAll(/(--fm-color-[a-z0-9-]+)\s*:\s*([^;]+);/g),
  ].map((m) => [m[1], m[2].replace(/\s+/g, ' ').trim()] as const);

  if (roles.length === 0) {
    throw new Error(`No --fm-color-* roles found in ${varsPath}.`);
  }
  return roles;
}

/**
 * A theme somebody else built — the install path.
 *
 * IT READS DECLARATIONS, NOT COLOURS, and that is the whole of why a consumer's
 * theme behaves like ours rather than merely looking like it. Ours is three
 * layers — a base, a ramp derived from it in relative colour, a role pointing at
 * a rung — so changing one base recomputes everything under it. A file carrying
 * only the eighty-four finished colours is a photograph of that: same pixels, and
 * nothing left to recompute from. So the file lists CSS custom properties with
 * their values, at whatever layer, and this writes them out unchanged.
 *
 * The generator therefore does not know what a base, a ramp or a role IS, and
 * does not need to: to it they are lines. That is also what lets a builder ship a
 * theme with a rung nudged by hand or a role re-pointed — those are declarations
 * too, and nothing here has to recognise them.
 *
 * ONLY `declarations` IS READ. A builder needs more than the theme to reopen its
 * own form, and all of that travels in the same file under keys this generator
 * never looks at. Two contracts in one document: `declarations` is small and
 * stable and belongs here; the rest belongs to the builder and may change shape
 * whenever it likes without a version negotiation across two packages.
 *
 * VALIDATED BEFORE ANYTHING IS WRITTEN, with the `validateTheme()` of the
 * INSTALLED tokens — the same function `validate-themes` runs in CI, so a builder
 * cannot promise a theme the pipeline would refuse. The roles are RESOLVED first,
 * against the file's own declarations, because a role here legitimately points at
 * a rung the file also carries; that resolution is what catches the reference
 * pointing at nothing, which would otherwise install a role that falls back to
 * its `@property` initial-value — opaque black, with nothing falsy to detect.
 */
function readExportedTheme(from: string, validate: boolean): RoleDeclaration[] {
  const path = isAbsolute(from) ? from : join(process.cwd(), from);

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(
      `Could not read a theme from ${path}: ${(error as Error).message}`,
    );
  }

  const declared = (parsed as { declarations?: unknown } | null)?.declarations;
  if (!declared || typeof declared !== 'object' || Array.isArray(declared)) {
    throw new Error(
      `${path} has no "declarations" object. A theme file is ` +
        `{ "declarations": { "--fm-color-primary": "<value>", … } }; ` +
        `anything else in it is ignored.`,
    );
  }
  const entries = Object.entries(declared as Record<string, unknown>);
  if (entries.length === 0) {
    throw new Error(`${path} declares nothing.`);
  }
  const nonString = entries.filter(([, v]) => typeof v !== 'string');
  if (nonString.length > 0) {
    throw new Error(
      `${path}: these declarations are not strings: ${nonString
        .map(([k]) => k)
        .join(', ')}.`,
    );
  }
  const stray = entries.filter(([k]) => !k.startsWith('--fm-'));
  if (stray.length > 0) {
    throw new Error(
      `${path}: these are not tokens of this contract: ${stray
        .map(([k]) => k)
        .join(', ')}.`,
    );
  }
  const roles = entries as RoleDeclaration[];

  if (validate) validateExported(path, roles);
  return roles;
}

/**
 * Refuse a theme the pipeline would refuse, before it reaches the repo.
 *
 * The rules come from `@fmmenchi/theme`, IMPORTED — not resolved from the
 * consumer's workspace, which is what this used to do with `createRequire`, a
 * dynamic `import()`, an escape-hatch option and a "could not resolve" branch
 * that installed the theme unchecked. The contract is code, so it travels with
 * this plugin; only the STYLESHEET is read from the consumer's install, because
 * that is a file and theirs is the one that matters.
 */
function validateExported(path: string, roles: RoleDeclaration[]): void {
  const map = new Map(roles);
  const colors: Record<string, string> = {};

  for (const [name, value] of roles) {
    if (!name.startsWith('--fm-color-')) continue;
    try {
      colors[name.slice('--fm-color-'.length)] = resolveCssVar(value, map);
    } catch (error) {
      // A reference to something the file never declares. Left alone it installs
      // a role that falls back to its `@property` initial-value — opaque black,
      // in both themes, with nothing falsy for a check to notice.
      throw new Error(
        `${path}: ${name} does not resolve — ${(error as Error).message}`,
      );
    }
  }

  const violations = validateTheme(colors);
  if (violations.length > 0) {
    throw new Error(
      `${path} is not a valid theme, so nothing was written:\n  ` +
        violations.map((v) => v.message).join('\n  '),
    );
  }
}

/**
 * Write a brand theme into a consumer's repo — a COMPLETE `[data-theme='<name>']`
 * assignment of every color role, and the `validate-themes` target that gates it
 * in CI from day one (unless --skipValidation).
 *
 * TWO WAYS TO GET THE VALUES, one way to write them. Without `--from` it
 * scaffolds from the @fmmenchi/tokens contract INSTALLED in the workspace, so the
 * starting point is always in step with the tokens version the app actually uses;
 * with `--from` it installs a theme somebody else built and validates it first.
 * Everything after that — the template, the `color-scheme` line, the file, the
 * wiring — is identical, because where a colour came from is not this
 * generator's business and where the file goes is.
 */
export async function themeGenerator(
  tree: Tree,
  options: ThemeGeneratorSchema,
) {
  if (!/^[a-z][a-z0-9-]*$/.test(options.name)) {
    throw new Error(
      `Invalid theme name "${options.name}" — use a lowercase data-theme value (a-z, 0-9, -).`,
    );
  }

  // Resolve the INSTALLED tokens contract (never a bundled copy).
  const req = createRequire(join(tree.root, 'package.json'));
  let varsPath = options.tokensPath;
  let tokensVersion = 'unknown';
  try {
    varsPath = varsPath ?? req.resolve('@fmmenchi/tokens/styles/vars.css');
    const pkgPath = req.resolve('@fmmenchi/tokens/package.json');
    tokensVersion = (
      JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string }
    ).version;
  } catch {
    if (!varsPath) {
      throw new Error(
        'Could not resolve @fmmenchi/tokens from the workspace root. ' +
          'Install it, or pass --tokensPath=<path to its vars.css>.',
      );
    }
  }

  // COMMENTS STRIPPED FIRST, for the reason `@fmmenchi/tokens`' own `parseCssVars`
  // documents at length: a role commented out during a retune still matches the
  // regex, and the scaffold would then carry a token the shipped CSS does not
  // define — the theme starts life already ahead of the contract it claims to
  // instantiate. Stripping is inlined rather than imported because the tokens
  // package resolved here is the INSTALLED one, whose version may predate the
  // export; two lines beat a version negotiation.
  const roles = options.from
    ? readExportedTheme(options.from, !options.skipValidation)
    : readReferenceTheme(varsPath);

  const project = readProjectConfiguration(tree, options.project);
  const cssPath = joinPathFragments(
    project.root,
    options.directory ?? 'src/themes',
    `${options.name}.css`,
  );

  const css = `/**
 * \`${options.name}\` theme for @fmmenchi/ui — generated by
 * @fmmenchi/nx-theme-generator:theme from @fmmenchi/tokens ${tokensVersion}.
 *
 * A theme is a COMPLETE assignment of every color role: edit the values,
 * never remove a role. Values must be sRGB-displayable literals and every
 * declared pair must keep WCAG contrast — \`nx run ${options.project}:validate-themes\`
 * checks all of it and reports exact ratios. Starting values are the light
 * reference preset. Apply with \`<html data-theme="${options.name}">\`.
 */
[data-theme='${options.name}'] {
  /* The parts the BROWSER paints — a select's popup, a native checkbox — take
     their palette from \`color-scheme\`, never from the roles below. Without
     this line a dark brand theme ships white native lists on Safari and
     Firefox (a recorded defect of hand-written presets, which is why the
     scaffold states it). Keep it in step with the theme's own lightness. */
  color-scheme: ${options.scheme ?? 'light'};

${roles.map(([name, value]) => `  ${name}: ${value};`).join('\n')}
}
`;
  tree.write(cssPath, css);

  if (!options.skipValidation) {
    await validationGenerator(tree, {
      project: options.project,
      themes: [cssPath],
    });
  }
  await formatFiles(tree);
}

export default themeGenerator;
