import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  emitProperties,
  parseCssVars,
  REGISTERED_SECTIONS,
} from '@fmmenchi/theme';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(here, path), 'utf8');
const values = parseCssVars(read('./styles/vars.css'));

/**
 * THE COMMITTED ARTEFACT IS WHAT THE CONTRACT WOULD WRITE.
 *
 * The emitter lives in `@fmmenchi/theme` — it is knowledge about the contract, and
 * this package is an ARTEFACT: it ships values and stylesheets. What stays here is
 * this test, and it stays for a reason rather than by preference: it reads
 * `styles/vars.css`, and `scope:shared` may not depend on `scope:client`, so the
 * check can only be made from this side of the boundary.
 *
 * `properties.css` has to be committed — the package exposes `src/` through the
 * `@fmmenchi/source` condition, so consumers read it directly — and a committed
 * generated file is one somebody can edit by hand. That is the whole failure mode
 * of generating anything: the single source quietly becomes two again, and the
 * second one wins because it is the one on disk.
 *
 * `toMatchFileSnapshot` closes it with no new machinery: the snapshot IS the
 * shipped file, so an edit by hand fails the ordinary test run, and a legitimate
 * change is `vitest -u`.
 */
describe('generated artifacts', () => {
  it('writes properties.css from the contract', async () => {
    // ASKED SEPARATELY, because `toMatchFileSnapshot` WRITES a missing file and
    // reports a pass — measured, outside CI. So a deleted artifact would leave
    // the local suite green and the package shipping nothing.
    expect(existsSync(join(here, './styles/properties.css'))).toBe(true);

    await expect(emitProperties(values)).toMatchFileSnapshot(
      './styles/properties.css',
    );
  });

  it('registers nothing this stylesheet does not define', () => {
    // The half of the emitter's correctness that only THIS package can ask,
    // because it is the one that has the values. The sections are the same
    // partition `COLOR_ROLES` is assembled from, so this is really asking
    // whether that partition still covers the stylesheet — the question the
    // hand-written headings answered wrongly for as long as `error` had been a
    // status family.
    for (const name of REGISTERED_SECTIONS.flatMap((s) => s.vars)) {
      expect(values.has(name), `${name} is registered but never defined`).toBe(
        true,
      );
    }
  });
});
