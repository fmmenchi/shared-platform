import {
  formatFiles,
  readProjectConfiguration,
  updateProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import type { ValidationGeneratorSchema } from './schema';

export const VALIDATE_TARGET = 'validate-themes';

/**
 * Wires theme validation on a project: adds (or updates) a `validate-themes`
 * target running the `@fmmenchi/nx-theme-generator:validate` executor, and
 * registers the given theme CSS files in its options. Idempotent — re-running
 * merges and dedupes the theme list.
 */
export async function validationGenerator(
  tree: Tree,
  options: ValidationGeneratorSchema,
) {
  const projectConfig = readProjectConfiguration(tree, options.project);
  const existing = projectConfig.targets?.[VALIDATE_TARGET];
  const themes = [
    ...new Set([
      ...((existing?.options?.themes as string[] | undefined) ?? []),
      ...(options.themes ?? []),
    ]),
  ].sort();

  projectConfig.targets = {
    ...projectConfig.targets,
    [VALIDATE_TARGET]: {
      ...existing,
      executor: '@fmmenchi/nx-theme-generator:validate',
      options: { ...existing?.options, themes },
    },
  };
  updateProjectConfiguration(tree, options.project, projectConfig);
  await formatFiles(tree);
}

export default validationGenerator;
