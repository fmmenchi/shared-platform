import { Heading } from '@fmmenchi/ui/heading';
import { useLoaderData } from 'react-router';

import {
  DeclarationsProvider,
  type SerializedDeclarations,
} from '../declarations';
import { readDeclarations } from '../declarations.server';
import { ThemePreview } from '../theme-preview';

/**
 * THE DEMO APP — the design system under the theme being built, in either scheme.
 *
 * ONE SECTION PER ROLE GROUP, in the same order and with the same titles as step
 * three, which is what makes this page evidence rather than a gallery. `ROLE_GROUPS`
 * is built from the contract's own partition, so the sections here cannot drift from
 * the roles they are showing: add a family to the contract and a section appears.
 *
 * WHAT EACH SECTION SHOWS IS CHOSEN FOR THE PAIRS IT EXERCISES. The four ACTION
 * families carry hover and active, so they get a real button — the thing you press.
 * The four STATUS families do not, so they get an Alert and a Badge — the thing you
 * read, on its wash, inside its border. Then the greys, the surfaces with the focus
 * ring that has to clear 3:1 on every one of them, and a field at rest, invalid and
 * disabled.
 *
 * IT RENDERS THE DRAFT NOW, WHICH IT DID NOT BEFORE. The page said "No draft yet" for
 * every possible set of bases, because the draft was a CSS string and nothing in the
 * app ever produced one — see `theme-scope.tsx` for the whole story. The theme is
 * derived here from the same three inputs the export uses, so what is on screen and
 * what is in the file cannot disagree.
 *
 * THE HEADING AND THE CONTROLS STAY OUTSIDE THE SCOPE. They are chrome: a theme whose
 * contrast fails must not take down the toggle that would switch away from it.
 */
/**
 * THE PREVIEW LOADS THE DECLARATIONS ITSELF, and it has to.
 *
 * `/preview` sits OUTSIDE the wizard layout on purpose — a theme whose contrast pair
 * is below its floor must not take down the controls that would fix it — and the
 * layout is where the declarations were loaded. So this route could not reach them:
 * `useDeclarations` threw, and that is the architectural reason the page was a stub
 * for as long as it was. Measured after wiring it up: a 500 saying
 * "useDeclarations must be used inside the wizard layout".
 *
 * Reading them twice costs nothing worth naming — it is one file read on the server,
 * and both routes need the same answer. Sharing a loader would mean sharing a layout,
 * which is the thing being deliberately avoided.
 */
export function loader() {
  return readDeclarations();
}

export default function Preview() {
  const declarations = useLoaderData<SerializedDeclarations>();

  return (
    <DeclarationsProvider declarations={declarations}>
      <div
        style={{
          display: 'grid',
          gap: 'var(--fm-space-stack-l)',
          padding: 'var(--fm-space-inset-l)',
        }}
      >
        <Heading level={1}>Preview</Heading>
        <ThemePreview sectionLevel={2} />
      </div>
    </DeclarationsProvider>
  );
}
