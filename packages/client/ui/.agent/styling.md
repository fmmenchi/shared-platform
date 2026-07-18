# Styling (agent)

- One `<name>.module.css` per component; `@reference '@fmmenchi/tokens/styles/tailwind.css'` on top.
- Author with `@apply` (structure) + **semantic role utilities** for colour (`bg-primary`,
  `text-foreground`, `hover:bg-primary-hover`…). The token bridge resets the default palette:
  `bg-red-500` or a hex literal does not compile. Variants map 1:1 to an action family
  (fill/foreground/hover/active/disabled roles) — no opacity hacks.
- **No utility strings in JSX** — put them in the module (won't survive precompile).
- `cva` → module class names; `cn` composes; polymorphism via the **`as` prop**
  (`primitives/polymorphic.ts`) — no Radix.
- Build precompiles → `dist/index.css` = `@fmmenchi/ui/style.css`. Consumer imports CSS, no
  Tailwind. Never ship source-for-`@source` / raw utility sheet.
- **Responsive: mobile-first.** Base = mobile; enhance with the `@variant` directive (NOT
  `@apply tablet:…` — Tailwind v4 drops the query). Viewport: `@variant tablet {}` / `@variant
desktop {}`. Prefer **container queries** (`@apply @container` on the root + `@variant @sm/@md
{}`) so the component adapts to its container, not the screen.

Why: [`doc/styling.md`](../../../../doc/styling.md).
