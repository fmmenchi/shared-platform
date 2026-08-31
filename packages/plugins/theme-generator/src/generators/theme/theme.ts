import {
  formatFiles,
  joinPathFragments,
  logger,
  readProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validationGenerator } from '../validation/validation';
import type { ThemeGeneratorSchema } from './schema';

/** What this generator needs from the installed tokens package. */
interface ValidateModule {
  validateTheme(
    colors: Readonly<Record<string, string>>,
  ): { message: string }[];
}
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
 * ONLY `colors` IS READ, and that is the whole contract this generator has with
 * whatever wrote the file. A builder needs more than the finished colours to
 * reopen its own form — which rung each role was pointed at, which ones a person
 * overrode by hand — and all of that travels in the same file under keys this
 * generator never looks at. Two contracts in one document: `colors` is small and
 * stable and belongs here; the rest belongs to the builder and may change shape
 * whenever it likes without a version negotiation across two packages.
 *
 * VALIDATED BEFORE ANYTHING IS WRITTEN, with the `validateTheme()` of the
 * INSTALLED tokens — the same function `validate-themes` runs in CI, so a builder
 * cannot promise a theme the pipeline would refuse. It also catches the mistake
 * an exporter is most likely to make: emitting `var(--fm-palette-…)` references
 * rather than resolved literals. Those parse as nothing, so the check reports
 * them — and they would otherwise install a theme that resolves against `:root`
 * and changes no colour at all.
 */
async function readExportedTheme(
  from: string,
  req: ReturnType<typeof createRequire>,
  validate: boolean,
): Promise<RoleDeclaration[]> {
  const path = isAbsolute(from) ? from : join(process.cwd(), from);

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(
      `Could not read a theme from ${path}: ${(error as Error).message}`,
    );
  }

  const colors = (parsed as { colors?: unknown } | null)?.colors;
  if (!colors || typeof colors !== 'object' || Array.isArray(colors)) {
    throw new Error(
      `${path} has no "colors" object. A theme file is ` +
        `{ "colors": { "<role>": "<value>", … } }; anything else in it is ignored.`,
    );
  }
  const entries = Object.entries(colors as Record<string, unknown>);
  if (entries.length === 0) {
    throw new Error(`${path} declares no colors.`);
  }
  const nonString = entries.filter(([, v]) => typeof v !== 'string');
  if (nonString.length > 0) {
    throw new Error(
      `${path}: these roles are not strings: ${nonString
        .map(([k]) => k)
        .join(', ')}.`,
    );
  }
  const theme = Object.fromEntries(entries) as Record<string, string>;

  // Resolution failure is not fatal: the `validate-themes` target this generator
  // wires still gates the theme in CI. Writing nothing because the check could
  // not be loaded would be worse than writing something CI will judge.
  let validateTheme: ValidateModule['validateTheme'] | undefined;
  try {
    if (!validate) throw new Error('--skipValidation');
    const modulePath = req.resolve('@fmmenchi/tokens/validate');
    ({ validateTheme } = (await import(
      pathToFileURL(modulePath).href
    )) as ValidateModule);
  } catch {
    if (validate) {
      logger.warn(
        `Could not resolve @fmmenchi/tokens/validate — ${path} was installed ` +
          'unchecked. `nx run <project>:validate-themes` will still gate it.',
      );
    }
  }

  if (validateTheme) {
    const violations = validateTheme(theme);
    if (violations.length > 0) {
      throw new Error(
        `${path} is not a valid theme, so nothing was written:\n  ` +
          violations.map((v) => v.message).join('\n  '),
      );
    }
  }

  return entries.map(
    ([role, value]) => [`--fm-color-${role}`, value as string] as const,
  );
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
    ? await readExportedTheme(options.from, req, !options.skipValidation)
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
