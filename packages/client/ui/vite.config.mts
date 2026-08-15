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

/**
 * The dist artifact is the only place this defect could be seen: the dev
 * transform the whole test suite runs under keeps `:dir()` as authored, while
 * the build's CSS minifier — LightningCSS on Vite's LEGACY default targets —
 * downlevels it into an RTL-LANGUAGE sniff (`:is(:lang(ar),:lang(he),…)`).
 * Direction and language are independent, so the shipped selector was wrong in
 * both directions: `<html dir="rtl" lang="en">` kept the LTR paint, and an LTR
 * island inside a `lang="ar"` page flipped when it must not — the exact case
 * `:dir()` was chosen over `[dir]` to solve, reintroduced by the pipeline in
 * six components. `cssTarget` above is the fix; this guard is what makes it
 * permanent, because no test imports the dist.
 */
function assertNoLanguageSniffPlugin() {
  let enabled = false;
  return {
    name: 'fm-no-language-sniff',
    // Only the LIBRARY artifact ships. Storybook's preview build shares this
    // config's plugins but overrides the `build` options, so its css can
    // still be downleveled — dev-facing only, and not this guard's business.
    configResolved(config: { build?: { lib?: unknown } }) {
      enabled = Boolean(config.build?.lib);
    },
    writeBundle(_options: { dir?: string }, bundle: Record<string, unknown>) {
      if (!enabled) return;
      for (const chunk of Object.values(bundle)) {
        const asset = chunk as {
          type?: string;
          fileName?: string;
          source?: unknown;
        };
        if (
          asset.type === 'asset' &&
          asset.fileName?.endsWith('.css') === true &&
          typeof asset.source === 'string' &&
          asset.source.includes(':lang(')
        ) {
          throw new Error(
            `${asset.fileName}: ':lang(' in the built CSS — nothing here is ` +
              `authored with it, so the minifier has downleveled ':dir()' ` +
              `into a language sniff again. Raise build.cssTarget instead of ` +
              `shipping this.`,
          );
        }
      }
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
    assertNoLanguageSniffPlugin(),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(import.meta.dirname, 'tsconfig.lib.json'),
    }),
  ],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    // The package's own browser floor (ADR-0017: Baseline Widely), stated,
    // because Vite's DEFAULT css target predates `:dir()` and the minifier
    // then "helpfully" rewrites it into a language sniff — see the guard
    // plugin above. These are the engines of early 2024, ~30 months back,
    // which is what Baseline Widely means.
    cssTarget: ['chrome120', 'firefox121', 'safari17.2'],
    // Per-entry CSS so each component subpath ships only its own styles.
    cssCodeSplit: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      // One entry per public subpath: the barrel (`.`) + each component
      // (`./button`). New components add an entry here.
      entry: {
        'form-date-range-picker':
          'src/components/form-date-range-picker/index.ts',
        'date-range-picker': 'src/components/date-range-picker/index.ts',
        skeleton: 'src/components/skeleton/index.ts',
        'form-date-picker': 'src/components/form-date-picker/index.ts',
        'date-picker': 'src/components/date-picker/index.ts',
        calendar: 'src/components/calendar/index.ts',
        'date-input': 'src/components/date-input/index.ts',
        'time-input': 'src/components/time-input/index.ts',
        numeric: 'src/components/numeric/index.ts',
        time: 'src/components/time/index.ts',
        'table-columns-menu': 'src/components/table-columns-menu/index.ts',
        'breadcrumb-link': 'src/components/breadcrumb-link/index.ts',
        breadcrumb: 'src/components/breadcrumb/index.ts',
        avatar: 'src/components/avatar/index.ts',
        slider: 'src/components/slider/index.ts',
        separator: 'src/components/separator/index.ts',
        progress: 'src/components/progress/index.ts',
        'table-header-cell': 'src/components/table-header-cell/index.ts',
        'table-cell': 'src/components/table-cell/index.ts',
        'table-row': 'src/components/table-row/index.ts',
        'table-foot': 'src/components/table-foot/index.ts',
        'table-toolbar': 'src/components/table-toolbar/index.ts',
        'table-filter-trigger': 'src/components/table-filter-trigger/index.ts',
        pagination: 'src/components/pagination/index.ts',
        'table-column-resizer': 'src/components/table-column-resizer/index.ts',
        'table-body': 'src/components/table-body/index.ts',
        'table-head': 'src/components/table-head/index.ts',
        table: 'src/components/table/index.ts',
        'form-segmented-control':
          'src/components/form-segmented-control/index.ts',
        'form-date-input': 'src/components/form-date-input/index.ts',
        'segmented-control-item':
          'src/components/segmented-control-item/index.ts',
        'segmented-control': 'src/components/segmented-control/index.ts',
        alert: 'src/components/alert/index.ts',
        'toast-region': 'src/components/toast-region/index.ts',
        toast: 'src/components/toast/index.ts',
        'form-switch': 'src/components/form-switch/index.ts',
        switch: 'src/components/switch/index.ts',
        'toolbar-separator': 'src/components/toolbar-separator/index.ts',
        'visually-hidden': 'src/components/visually-hidden/index.ts',
        'toolbar-item': 'src/components/toolbar-item/index.ts',
        toolbar: 'src/components/toolbar/index.ts',
        toggle: 'src/components/toggle/index.ts',
        'tab-panel': 'src/components/tab-panel/index.ts',
        tab: 'src/components/tab/index.ts',
        'tab-list': 'src/components/tab-list/index.ts',
        tabs: 'src/components/tabs/index.ts',
        accordion: 'src/components/accordion/index.ts',
        'accordion-item': 'src/components/accordion-item/index.ts',
        'accordion-trigger': 'src/components/accordion-trigger/index.ts',
        'accordion-content': 'src/components/accordion-content/index.ts',
        heading: 'src/components/heading/index.ts',
        'card-actions': 'src/components/card-actions/index.ts',
        'card-cover': 'src/components/card-cover/index.ts',
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
    /*
     * A BROWSER ASSERTION IS NOT A jsdom ASSERTION, and the defaults are sized
     * for the second. Vitest allows a test 5s and Testing Library allows a
     * `waitFor` 1s; here every interaction is a round trip to a real Chromium
     * over CDP, four of them run at once, and the full gate has fifteen other
     * Nx targets on the machine — a Storybook build among them.
     *
     * Measured rather than assumed: with the defaults, three consecutive full
     * gates failed on five different files, none of them twice, and Playwright
     * reported `locator.click: Timeout -24ms exceeded` — a NEGATIVE budget,
     * which is what a test being starved rather than wrong looks like.
     *
     * This is sizing the budget, not hiding a race. The tests that were racy BY
     * CONSTRUCTION — sleeping a real interval to sit inside a timing window —
     * are fixed where they are, because no timeout can rescue those.
     */
    testTimeout: 20_000,
    hookTimeout: 20_000,

    /*
     * LEAVE HALF THE MACHINE ALONE. Uncapped, the four browser projects put one
     * Chromium per core on the box — 17 of them on the 18-core machine these
     * numbers come from — so the suite owns everything and anything else on the
     * machine tips it into starvation. That is not a theory about the failure,
     * it is its shape: the tests that fell did not fail, they ran out of the
     * 20s above, and the budget above was itself the previous round of this
     * same fight.
     *
     * Measured on `nx run-many -t test build-storybook`, the trigger AGENTS.md
     * names, three runs each:
     *
     *   uncapped   12 files timed out / 1 file timed out  — 219s, 79s
     *   capped     green, green, green                    — 61s, 31s, 32s
     *
     * The cost of the cap is NEGATIVE — it is faster alone too (29s against
     * 44s), because the contention it removes was the suite's own. Per-file
     * setup is where it showed: 238s of it on a quiet machine, 1849s under the
     * gate, 360s capped. The tests were never the expensive part.
     *
     * A percentage rather than a number so a 4-core CI runner reads it as 2 and
     * this machine reads it as 9 — the rule is "half", not a count that happens
     * to suit one laptop.
     */
    maxWorkers: '50%',

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
