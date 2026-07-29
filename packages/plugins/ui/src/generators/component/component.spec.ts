import { describe, it, expect, beforeEach } from 'vitest';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import type { Tree } from '@nx/devkit';

import { componentGenerator } from './component';

const UI = 'packages/client/ui';

/** Minimal stand-in for the real @fmmenchi/ui surface the generator wires. */
function scaffoldUi(tree: Tree): void {
  tree.write(
    `${UI}/src/index.ts`,
    `export { Button } from './components/button/button.component.js';\n`,
  );
  tree.write(
    `${UI}/package.json`,
    JSON.stringify({
      name: '@fmmenchi/ui',
      exports: {
        '.': { import: './dist/index.js' },
        './button': { import: './dist/button.js' },
        './style.css': './dist/style.css',
      },
    }),
  );
  tree.write(
    `${UI}/vite.config.mts`,
    [
      'export default {',
      '  build: {',
      '    lib: {',
      '      entry: {',
      "        index: 'src/index.ts',",
      "        button: 'src/components/button/index.ts',",
      '      },',
      '    },',
      '  },',
      '};',
      '',
    ].join('\n'),
  );
}

describe('component generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    scaffoldUi(tree);
  });

  it('scaffolds the full archetype for a component', async () => {
    await componentGenerator(tree, { name: 'badge' });
    const dir = `${UI}/src/components/badge`;
    for (const f of [
      'badge.component.tsx',
      'badge.types.ts',
      'badge.variants.ts',
      'badge.module.css',
      'badge.stories.tsx',
      'badge.mdx',
      'badge.test.tsx',
      'index.ts',
    ]) {
      expect(tree.exists(`${dir}/${f}`), f).toBe(true);
    }
    const component = tree.read(
      `${dir}/badge.component.tsx`,
      'utf-8',
    ) as string;
    expect(component).toContain('function Badge(');
    expect(component).toContain('badgeVariants');
    expect(component).toContain('<div'); // default element
    // Native-first: no dead React import in the scaffold (it caused a lint fail).
    expect(component).not.toContain("import * as React from 'react'");
    // Token-only styling doctrine is carried into the css template.
    const css = tree.read(`${dir}/badge.module.css`, 'utf-8') as string;
    expect(css).toContain("@reference '@fmmenchi/tokens/styles/tailwind.css'");
    // Rules ship inside the DS cascade layer (ADR-0011).
    expect(css).toContain('@layer fmmenchi {');
    // Every component is born with a ref-forwarding guarantee (archetype).
    const test = tree.read(`${dir}/badge.test.tsx`, 'utf-8') as string;
    expect(test).toContain('forwards ref to the underlying element');
  });

  it('respects --element (native-first)', async () => {
    await componentGenerator(tree, { name: 'tag', element: 'span' });
    expect(
      tree.read(`${UI}/src/components/tag/tag.component.tsx`, 'utf-8'),
    ).toContain('<span');
  });

  it('wires the public surface: barrel, exports, vite entry', async () => {
    await componentGenerator(tree, { name: 'badge' });

    const barrel = tree.read(`${UI}/src/index.ts`, 'utf-8') as string;
    expect(barrel).toContain(
      "export { Badge } from './components/badge/badge.component.js';",
    );
    expect(barrel).toContain('badgeVariants');

    const pkg = JSON.parse(tree.read(`${UI}/package.json`, 'utf-8') as string);
    expect(pkg.exports['./badge'].import).toBe('./dist/badge.js');
    expect(pkg.exports['./badge/style.css']).toBe('./dist/badge.css');

    const vite = tree.read(`${UI}/vite.config.mts`, 'utf-8') as string;
    expect(vite).toContain("badge: 'src/components/badge/index.ts',");
  });

  it('handles kebab-case names (radio-group → RadioGroup/radioGroup)', async () => {
    await componentGenerator(tree, { name: 'radio-group' });
    const dir = `${UI}/src/components/radio-group`;
    const component = tree.read(
      `${dir}/radio-group.component.tsx`,
      'utf-8',
    ) as string;
    expect(component).toContain('function RadioGroup(');
    expect(component).toContain('radioGroupVariants');
    expect(tree.read(`${UI}/vite.config.mts`, 'utf-8')).toContain(
      "radioGroup: 'src/components/radio-group/index.ts',",
    );
  });

  it('scaffolds the messages catalog only when asked', async () => {
    await componentGenerator(tree, { name: 'alert', messages: true });
    expect(tree.exists(`${UI}/src/components/alert/alert.messages.ts`)).toBe(
      true,
    );

    await componentGenerator(tree, { name: 'badge' });
    expect(tree.exists(`${UI}/src/components/badge/badge.messages.ts`)).toBe(
      false,
    );
  });

  it('refuses to overwrite an existing component', async () => {
    await componentGenerator(tree, { name: 'badge' });
    await expect(componentGenerator(tree, { name: 'badge' })).rejects.toThrow(
      /already exists/,
    );
  });
});
