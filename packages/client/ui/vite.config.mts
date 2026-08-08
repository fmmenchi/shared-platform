/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import dts from 'vite-plugin-dts';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import * as path from 'path';
import * as fs from 'fs';

// Emit a combined `style.css` (all component CSS concatenated) next to the
// per-component files, so a consumer can import everything with one stylesheet
// (`@fmmenchi/ui/style.css`) OR granularly (`@fmmenchi/ui/button/style.css`).
function combinedCssPlugin() {
  return {
    name: 'fm-combined-css',
    writeBundle(options: { dir?: string }, bundle: Record<string, unknown>) {
      const outDir = options.dir ?? 'dist';
      const css = Object.values(bundle)
        .filter(
          (c): c is { type: string; fileName: string; source: string } =>
            typeof c === 'object' &&
            c !== null &&
            (c as { type?: string }).type === 'asset' &&
            (c as { fileName?: string }).fileName?.endsWith('.css') === true &&
            (c as { fileName?: string }).fileName !== 'style.css',
        )
        .map((c) => c.source)
        .join('\n');
      if (css) fs.writeFileSync(path.join(outDir, 'style.css'), css);
    },
  };
}

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../node_modules/.vite/packages/client/ui',
  plugins: [
    react(),
    // React Compiler auto-memoizes components/hooks. On rolldown-vite it runs
    // via @rolldown/plugin-babel + reactCompilerPreset (the `react({ babel })`
    // path doesn't apply here). Applied at the library build, so the published
    // output ships already memoized (`react/compiler-runtime`, present in the
    // React 19 peer dep) — every consumer benefits, compiler or not.
    // `panicThreshold: 'all_errors'` is the GUARD, and it exists because the
    // failure it guards is SILENT: the compiler skips a function it cannot
    // handle and says nothing, so a component stops being memoized and the
    // build stays green. Measured after that had already happened twice — a
    // `case` whose value was a conditional expression cost `MenuContent` its
    // compilation, and a Babel version mismatch cost five more components
    // theirs, for months, with nobody able to notice.
    //
    // A function that genuinely cannot be compiled says so where it is
    // written, with `'use no memo'` and a reason. That is two hooks in one
    // file today, and the reason is that they call a hook the APP injects.
    // Tests and stories are EXCLUDED, and not as an escape hatch: they are not
    // shipped, so compiling them buys nothing — while `panicThreshold` would
    // turn an inline component written for one assertion into a failed
    // transform, which reads as forty-five unrelated test failures. Measured.
    babel({
      presets: [reactCompilerPreset({ panicThreshold: 'all_errors' })],
      exclude: [/\.test\.tsx?$/, /\.stories\.tsx?$/, /test-setup\.ts$/],
    }),
    tailwindcss(),
    combinedCssPlugin(),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(import.meta.dirname, 'tsconfig.lib.json'),
    }),
  ],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    // Per-entry CSS so each component subpath ships only its own styles.
    cssCodeSplit: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      // One entry per public subpath: the barrel (`.`) + each component
      // (`./button`). New components add an entry here.
      entry: {
        'tab-panel': 'src/components/tab-panel/index.ts',
        tab: 'src/components/tab/index.ts',
        'tab-list': 'src/components/tab-list/index.ts',
        tabs: 'src/components/tabs/index.ts',
        heading: 'src/components/heading/index.ts',
        'card-actions': 'src/components/card-actions/index.ts',
        'card-media': 'src/components/card-media/index.ts',
        'card-title': 'src/components/card-title/index.ts',
        card: 'src/components/card/index.ts',
        'app-layout-nav-drawer':
          'src/components/app-layout-nav-drawer/index.ts',
        'app-layout-nav-column':
          'src/components/app-layout-nav-column/index.ts',
        'app-layout-main': 'src/components/app-layout-main/index.ts',
        'app-layout-nav': 'src/components/app-layout-nav/index.ts',
        'app-layout': 'src/components/app-layout/index.ts',
        'menu-separator': 'src/components/menu-separator/index.ts',
        'menu-group': 'src/components/menu-group/index.ts',
        'menu-item-radio': 'src/components/menu-item-radio/index.ts',
        'menu-item-checkbox': 'src/components/menu-item-checkbox/index.ts',
        menubar: 'src/components/menubar/index.ts',
        nav: 'src/components/nav/index.ts',
        'nav-group': 'src/components/nav-group/index.ts',
        'nav-link': 'src/components/nav-link/index.ts',
        'menu-item': 'src/components/menu-item/index.ts',
        'menu-item-trigger': 'src/components/menu-item-trigger/index.ts',
        'menu-content': 'src/components/menu-content/index.ts',
        'menu-trigger': 'src/components/menu-trigger/index.ts',
        menu: 'src/components/menu/index.ts',
        'dialog-close': 'src/components/dialog-close/index.ts',
        'dialog-heading': 'src/components/dialog-heading/index.ts',
        'dialog-content': 'src/components/dialog-content/index.ts',
        'dialog-trigger': 'src/components/dialog-trigger/index.ts',
        dialog: 'src/components/dialog/index.ts',
        'popover-close': 'src/components/popover-close/index.ts',
        'popover-heading': 'src/components/popover-heading/index.ts',
        'popover-content': 'src/components/popover-content/index.ts',
        'popover-trigger': 'src/components/popover-trigger/index.ts',
        popover: 'src/components/popover/index.ts',
        tooltip: 'src/components/tooltip/index.ts',
        select: 'src/components/select/index.ts',
        textarea: 'src/components/textarea/index.ts',
        'form-error-summary': 'src/components/form-error-summary/index.ts',
        'form-choice': 'src/components/form-choice/index.ts',
        'form-input': 'src/components/form-input/index.ts',
        'form-textarea': 'src/components/form-textarea/index.ts',
        'form-select': 'src/components/form-select/index.ts',
        'choice-field': 'src/components/choice-field/index.ts',
        checkbox: 'src/components/checkbox/index.ts',
        radio: 'src/components/radio/index.ts',
        'input-group': 'src/components/input-group/index.ts',
        fieldset: 'src/components/fieldset/index.ts',
        'fieldset-legend': 'src/components/fieldset-legend/index.ts',
        'fieldset-content': 'src/components/fieldset-content/index.ts',
        field: 'src/components/field/index.ts',
        'field-label': 'src/components/field-label/index.ts',
        'field-description': 'src/components/field-description/index.ts',
        'field-error': 'src/components/field-error/index.ts',
        input: 'src/components/input/index.ts',
        badge: 'src/components/badge/index.ts',
        index: 'src/index.ts',
        button: 'src/components/button/index.ts',
      },
      formats: ['es' as const],
    },
    rolldownOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
  test: {
    // TWO projects, not one. The first is the suite as it was — the hand-written
    // component and logic tests. The second runs every STORY as a test, which is
    // what `@storybook/addon-vitest` adds: one run backs both the test widget
    // inside Storybook's UI and `nx test @fmmenchi/ui` in CI.
    //
    // They stay apart rather than merging because they load different setups.
    // The unit project loads `src/test-setup.ts` (token values, and NO Preflight
    // — ADR-0022). The story project loads `.storybook/vitest.setup.ts`, which
    // applies `preview.tsx`'s decorators, so a story under test renders the way
    // the Storybook UI renders it rather than bare.
    projects: [
      {
        // `as const` on both literals below: without them TypeScript widens
        // them to `boolean` and `string`, and Vitest's project config wants
        // `true` and `'chromium' | 'firefox' | 'webkit'` exactly. The whole
        // config then fails to typecheck, which is how it reached `main`.
        extends: true as const,
        test: {
          name: '@fmmenchi/ui',
          watch: false,
          globals: true,
          setupFiles: ['./src/test-setup.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' as const }],
          },
          include: ['{src,tests}/**/*.{test,spec}.{ts,tsx}'],
          // `*.touch.test.tsx` and `*.desktop.test.tsx` belong to the projects
          // below — the only ones that run a browser a media query has anything
          // to say to.
          exclude: ['**/*.touch.test.{ts,tsx}', '**/*.desktop.test.{ts,tsx}'],
          reporters: ['default'],
        },
      },
      {
        // THE TOUCH PROJECT. A component whose touch form is a media query has
        // nothing to assert in a browser that reports `pointer: fine` — and
        // `hasTouch` is what flips it: measured, that option alone turns
        // `(pointer: coarse)` on and `(hover: hover)` off, with `isMobile` and
        // the viewport making no further difference. The viewport is a phone's
        // so that "it spans the screen" is a claim about a screen.
        extends: true as const,
        test: {
          name: 'touch',
          watch: false,
          globals: true,
          setupFiles: ['./src/test-setup.ts'],
          browser: {
            enabled: true,
            // On the PROVIDER, not on the instance: `contextOptions` belongs to
            // `browser.newContext`, and an instance quietly ignores it — the
            // first version of this ran the whole touch suite in a browser
            // reporting `pointer: fine`, measuring the desktop form under the
            // touch form's name.
            provider: playwright({ contextOptions: { hasTouch: true } }),
            headless: true,
            viewport: { width: 390, height: 664 },
            instances: [{ browser: 'chromium' as const }],
          },
          include: ['src/**/*.touch.test.{ts,tsx}'],
          reporters: ['default'],
        },
      },
      {
        // THE DESKTOP PROJECT. The default project runs at 414px — BELOW the
        // `tablet` breakpoint (48rem) — so a component whose whole value is the
        // swap at that breakpoint would only ever be measured on one side of
        // it, which is the mistake the touch project above exists to prevent.
        // Same reasoning, other end of the scale.
        extends: true as const,
        test: {
          name: 'desktop',
          watch: false,
          globals: true,
          setupFiles: ['./src/test-setup.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            viewport: { width: 1280, height: 800 },
            instances: [{ browser: 'chromium' as const }],
          },
          include: ['src/**/*.desktop.test.{ts,tsx}'],
          reporters: ['default'],
        },
      },
      {
        extends: true as const,
        plugins: [
          storybookTest({
            configDir: path.join(import.meta.dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          watch: false,
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' as const }],
          },
          reporters: ['default'],
        },
      },
    ],
  },
}));
