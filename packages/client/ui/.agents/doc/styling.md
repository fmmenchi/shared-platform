# Styling (agent)

- One `<name>.module.css` per component; `@reference '@fmmenchi/tokens/styles/tailwind.css'` on top.
- **Wrap every rule in `@layer fmmenchi { … }`** (ADR-0011): the DS ships layered, so a consumer's
  unlayered css overrides it with a plain rule — no specificity war, no `!important`. `@import` and
  `@reference` stay ABOVE the layer; keyframes stay unlayered (name-scoped); tokens (`:root`) stay
  unlayered (the substrate). The generator template already opens the layer — author inside it.
- Author with `@apply` (structure) + **semantic role utilities** for colour (`bg-primary`,
  `text-foreground`, `hover:bg-primary-hover`…). The token bridge resets the default palette
  (`bg-red-500` fails the build). Variants map 1:1 to an action family
  (fill/foreground/hover/active/disabled roles) — no opacity hacks.
- **Every value in `*.module.css` goes through a token** — the `lint-css` (Stylelint,
  `.stylelintrc.json`) gate enforces it in one place: no raw colours (hex, `oklch()`/`rgb()`/…
  on any property, bare keywords like `color: red` — only `var(--fm-color-…)` or role utilities;
  `transparent`/`currentColor` are fine), and no raw motion (`0.6s`/`300ms`/`cubic-bezier` in
  `transition`/`animation` — use `var(--fm-duration-*)` / `var(--fm-ease-*)` or the
  `--fm-transition-*` composites).
- **Pair roles only as declared**: a foreground goes on a background only if the pairing is in
  `CONTRAST_PAIRS` (`tokens/src/validate.ts`); a new pairing must be added there first.
- **No utility strings in JSX** — put them in the module (won't survive precompile). Machine-
  enforced: ESLint bans arbitrary Tailwind values in `className`, and the `lint-css` gate bans them
  in `@apply` (`fmmenchi/no-tailwind-arbitrary`) — `bg-[#123]`/`w-[37px]` bypass the token contract.
- **Every component ships a `@media (forced-colors: active)` block** (Windows High Contrast): token
  fills are replaced by system colors, so restore boundaries with `ButtonText` borders, map
  pending/disabled to `GrayText`, focus to `Highlight` (see button.module.css).
- `cva` → module class names; `cn` composes; polymorphism via the **`as` prop**
  (`primitives/polymorphic.ts`) — no Radix.
- Build precompiles → `dist/index.css` = `@fmmenchi/ui/style.css`. Consumer imports CSS, no
  Tailwind. Never ship source-for-`@source` / raw utility sheet.
- **Responsive: mobile-first.** Base = mobile; enhance with the `@variant` directive (NOT
  `@apply tablet:…` — Tailwind v4 drops the query). Viewport: `@variant tablet {}` / `@variant
desktop {}`. Prefer **container queries** (`@apply @container` on the root + `@variant @sm/@md
{}`) so the component adapts to its container, not the screen.

Why: [`doc/styling.md`](../../../../apps/docusaurus/docs/styling.md).
