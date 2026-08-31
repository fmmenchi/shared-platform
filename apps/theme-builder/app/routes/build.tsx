import { PALETTE_FAMILIES } from '@fmmenchi/theme';
import { Card } from '@fmmenchi/ui/card';
import { CardTitle } from '@fmmenchi/ui/card-title';
import { Heading } from '@fmmenchi/ui/heading';

/**
 * THE WIZARD — where a person chooses, on the reference theme.
 *
 * A shell for now: the eight families a brand hands over, listed from the
 * contract rather than typed out, so this page cannot fall behind
 * `PALETTE_FAMILIES` the way a hand-written list would. The controls, the
 * generation and the export land on top of it.
 *
 * It renders under `:root` deliberately — see `root.tsx`. Nothing on this page is
 * wrapped in the draft.
 */
export default function Build() {
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-l)',
        padding: 'var(--fm-space-inset-l)',
      }}
    >
      <Heading level={1}>Build a theme</Heading>

      <p style={{ maxWidth: 'var(--fm-size-prose)' }}>
        Eight colours become a whole theme: a base per family, the ramp derived
        from it, and every semantic role pointed at a rung. The preview renders
        the design system under what you build; these controls never do, so a
        theme that fails its own contrast floors cannot take them down with it.
      </p>

      <div
        style={{
          display: 'grid',
          gap: 'var(--fm-space-inline-m)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
        }}
      >
        {PALETTE_FAMILIES.map((family) => (
          <Card key={family}>
            <CardTitle level={2}>{family}</CardTitle>
            <p style={{ color: 'var(--fm-color-muted-foreground)' }}>
              Base not chosen yet.
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
