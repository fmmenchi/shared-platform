import { describe, it, expect, beforeAll } from 'vitest';
import type { ExecutorContext } from '@nx/devkit';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import executor from './validate';

// The executor is exercised against a stub validate module (the REAL
// validateTheme is exercised in @fmmenchi/tokens' own tests): here we prove
// the wiring — CSS parsing, module resolution via tokensPath, pass/fail
// reporting and the exit status.
let dir: string;
let tokensPath: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'fm-validate-'));
  tokensPath = join(dir, 'validate.mjs');
  writeFileSync(
    tokensPath,
    `export function validateTheme(colors) {
       return colors['primary'] ? [] : [{ message: 'missing color role "primary"' }];
     }`,
  );
  writeFileSync(
    join(dir, 'good.css'),
    "[data-theme='x'] {\n  --fm-color-primary: oklch(41% 0.135 255);\n}\n",
  );
  writeFileSync(
    join(dir, 'bad.css'),
    "[data-theme='x'] {\n  --fm-color-border: oklch(91% 0.008 256);\n}\n",
  );
});

const context = () =>
  ({
    root: dir,
    cwd: dir,
    isVerbose: false,
    projectGraph: { nodes: {}, dependencies: {} },
    projectsConfigurations: { projects: {}, version: 2 },
    nxJsonConfiguration: {},
  }) as ExecutorContext;

describe('validate executor', () => {
  it('passes when every theme is allowed', async () => {
    const out = await executor({ themes: ['good.css'], tokensPath }, context());
    expect(out.success).toBe(true);
  });

  it('fails when a theme violates the contract', async () => {
    const out = await executor(
      { themes: ['good.css', 'bad.css'], tokensPath },
      context(),
    );
    expect(out.success).toBe(false);
  });
});
