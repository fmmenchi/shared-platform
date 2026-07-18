# Styling (agent)

- One `<name>.module.css` per component; `@reference '@fmmenchi/tokens/styles/tailwind.css'` on top.
- Author with `@apply` (structure) + `var(--fm-*)` (themeable colors). No hardcoded colors.
- **No utility strings in JSX** — put them in the module (won't survive precompile).
- `cva` → module class names; `cn` composes; polymorphism via the **`as` prop**
  (`primitives/polymorphic.ts`) — no Radix.
- Build precompiles → `dist/index.css` = `@fmmenchi/ui/style.css`. Consumer imports CSS, no
  Tailwind. Never ship source-for-`@source` / raw utility sheet.

Why: [`doc/styling.md`](../../../../doc/styling.md).
