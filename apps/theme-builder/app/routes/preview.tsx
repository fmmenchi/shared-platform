import { Heading } from '@fmmenchi/ui/heading';

import { ThemePreview } from '../theme-preview';

/**
 * THE PREVIEW AT FULL WIDTH — the same component the docked rail renders, given the
 * whole page.
 *
 * The rail is for choosing: it sits beside the step so a colour and its consequence
 * are on screen together. This is for READING — eleven sections of real components,
 * where an Alert gets its own line and three fields sit in a row, which a 18rem rail
 * cannot give them. One component, two widths; nothing is rendered twice.
 *
 * IT LOADS NOTHING, and it used to load the declarations itself.
 *
 * The old reason was real: `/preview` sits outside the wizard layout on purpose, so
 * it could not reach the declarations that layout loaded — measured as a 500 saying
 * "useDeclarations must be used inside the wizard layout", which is why this page was
 * a stub for as long as it was. The answer then was a second loader here.
 *
 * The rail removed the need for it. A region of `AppLayout` has to be a direct child
 * of the shell, so the declarations moved to the ROOT loader to reach it — and the
 * root is above this route as well. Two copies of one loader became none, and no
 * layout is shared to get there.
 */
export default function Preview() {
  return (
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
  );
}
