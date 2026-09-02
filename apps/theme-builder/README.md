# @fmmenchi/theme-builder

Seven brand colours in, one theme file out.

**Internal, not published.** It runs locally, produces a JSON file, and the Nx generator installs
that file into a consumer's repo. Nothing depends on this app.

```bash
pnpm nx dev @fmmenchi/theme-builder     # http://localhost:4201
```

## Why it exists

So that **our theme and your theme cannot differ in kind.** The design system's own colours are not
hand-picked: they come out of `generatePalette` and `generateTheme` in
[`@fmmenchi/theme`](../../packages/shared/theme). This app is an invocation of that same code with
different bases — and `tests/ramp.spec.ts` proves it, by asserting that the palette it builds from
the reference bases is the palette
[`@fmmenchi/tokens`](../../packages/client/tokens) actually ships.

A theme built here is therefore the same KIND of object as the reference one, not a lookalike.

## The four steps

1. **Brand colours** — the seven a brand hands over, as one form, with the dark seven in a tab
   beside them. Every edit is live: the dark seven follow the light ones as you change them (until
   you edit a dark one by hand), and the preview rail shows the change as you make it. The set is
   checked when you continue, because half of what can be wrong with seven colours is a fact about
   the set: a base whose ramp cannot carry its own button label. The greys are not asked for — the
   design system states them, since no single base spans white to near-black and still resolves
   the pale end.

2. **Palette** — the eleven rungs each colour produces, and the two ends of the ramp you may move.
   The darkest rung is offered because it decides how much contrast the ramp can reach; the pale end
   because it is the shape of the scale. **Every option is checked against the real validator for
   your colours before it is offered** — a choice that would produce a theme the contract refuses is
   disabled with the reason. The design system itself ships a dark end of 0.26 because it must
   survive brands it has never seen; your seven colours usually allow more, and this is where you
   find out.

3. **Semantic roles** — all 84, each re-pointable at any rung, grouped the way the contract groups
   them. Every declared pair shows its real sample and its measured contrast ratio beside the floor
   it has to clear.

4. **Review and export** — the validator's verdict on the whole theme, then the download and the
   command that installs it:

   ```bash
   npx nx g @fmmenchi/nx-theme-generator:theme acme --from=./acme.theme.json
   ```

## What is in the file

Declarations at **every layer**, which is what keeps a rebrand seven numbers:

| layer               |                                                                  |
| :------------------ | :--------------------------------------------------------------- |
| the seven **bases** | the brand's own colours, as `oklch()` literals                   |
| every **rung**      | relative colour off its base — change the base, the rung follows |
| every **role**      | `var(--fm-palette-…)`, so re-pointing one afterwards still works |

A file carrying only the 84 finished colours would be a photograph of a theme: same pixels, nothing
left to recompute.

## Both themes

It builds **two**, and exports two files:

```bash
npx nx g @fmmenchi/nx-theme-generator:theme acme      --from=./acme.theme.json      --scheme=light
npx nx g @fmmenchi/nx-theme-generator:theme acme-dark --from=./acme-dark.theme.json --scheme=dark
```

A dark theme is not the light one inverted. It restates its bases at lightness 0.75, takes
seventeen rungs of 0.05 where light takes eleven, and points `-subtle` at a dark rung where light
points at a pale one. The dark seven are **suggested** from your light seven — same hue, keeping
each one's share of the chroma sRGB allows at that lightness — and then editable in their own tab on
step 1, because a brand with a real dark palette has colours of its own. They follow the light seven
until you edit one; "Re-derive from the light seven" puts them back to following.

## Limitations

- **Step 3's role overrides are per theme.** A role re-pointed under the light tab is not carried
  into dark: the two themes point their roles at different rungs, so the same choice would mean a
  different colour there.
- **The 25 (light) and the 1500 (dark) have no role pointing at them yet** — deliberate headroom.
