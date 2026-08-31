import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { parseTheme } from '@fmmenchi/theme';

import type { SerializedDeclarations } from './declarations';

/**
 * THE DESIGN SYSTEM'S OWN DECLARATIONS, READ FROM THE STYLESHEET.
 *
 * `generateTheme` takes these plus the brand's seven bases plus a ramp, and does the
 * rest itself. Two things in here that the wizard cannot derive and must be told,
 * and it no longer has to know that they are two:
 *
 *   - WHICH RUNG EACH ROLE POINTS AT. `--fm-color-primary` is
 *     `--fm-palette-primary-700`, and that is a design decision, not a formula.
 *   - THE RUNGS NO BRAND SUPPLIES. The greys are STATED rather than derived
 *     (ADR-0032) — no single base spans 1.00 to 0.05 and still resolves the pale end
 *     — and 34 of the 84 roles point at them.
 *
 * WHY IT IS READ HERE AND NOT SHIPPED AS A FILE. The first attempt emitted
 * `placements.json` and `rungs.json` into `@fmmenchi/tokens` and imported them. That
 * was wrong twice over: tokens is an ARTEFACT package and the emitters had no
 * business in it, and the artefacts themselves were a round trip — contract written
 * in TypeScript, transcribed into CSS, parsed back out, serialised to JSON, loaded
 * back into TypeScript. The disk write existed only because `vars.css?raw` returns
 * an empty string under Vite (the CSS plugin claims a `.css` import before the query
 * is honoured), which is a fact about the bundler and not a reason to ship a file.
 *
 * A `.server` module sidesteps all of it: this runs in Node, where reading a file is
 * just reading a file, and the parser is the ONE parser — `@fmmenchi/theme`'s, the
 * same one the contract suites use. Nothing is transcribed and nothing is stored.
 *
 * The cost is that the declarations travel as loader data, about 6KB on the wizard
 * routes. That is the honest price and it is paid on the pages that use it.
 *
 * NOT A VITE PLUGIN, which was the other candidate: `vite.config.mts` is loaded by
 * Node OUTSIDE the app's module graph, where the `@fmmenchi/source` export condition
 * does not apply — so importing `@fmmenchi/theme` there resolves its `dist` and the
 * wizard would silently depend on that package having been built first.
 */
const require = createRequire(import.meta.url);

export function readDeclarations(): SerializedDeclarations {
  // Resolved through the package's own `exports` rather than by walking up the
  // tree: the app must not know where in the workspace tokens happens to live.
  const varsPath = require.resolve('@fmmenchi/tokens/styles/vars.css');
  const declared = parseTheme(readFileSync(varsPath, 'utf8'));

  // A stylesheet that parsed to nothing is a broken build, not an empty theme. Left
  // alone it surfaces as `generateTheme` producing no roles and the validator
  // reporting all 84 missing — which says nothing about the actual mistake, and is
  // exactly how the `?raw` dead end wasted an afternoon.
  if (declared.size === 0) {
    throw new Error(
      `No --fm-* declarations found in ${varsPath}. The theme-builder cannot generate anything without them.`,
    );
  }

  return [...declared];
}
