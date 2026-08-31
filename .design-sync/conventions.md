## How to build with @fmmenchi/ui

### Wrap the app once in `UiProvider`

`UiProvider` carries the locale (which also drives text direction — `ar` renders RTL) and, when you
use the `Form*` adapters, the binding to your form library. Without it, DS micro-copy falls back to
its English defaults and every `Form*` component throws `no form binding in scope`.

```jsx
<UiProvider adapters={{ i18n: { locale: 'en' } }}>
  <App />
</UiProvider>
```

Dark mode is an attribute on the root element, not a prop: set `data-theme="dark"` on `<html>`.
Light is the default and needs nothing.

### There are no class names to write

This is a CSS-Modules design system: every component's classes are **hashed and internal**
(`_button_gdl2j_2`). Never invent, guess or copy them — they change on every build. You style a
component through its **props**, and you style _your own_ layout with the **design tokens**.

Props carry the design language. `Button` is the archetype: `variant` is
`primary | accent | destructive | secondary | ghost`, `size` is `sm | md | lg`, plus `icon` /
`iconEnd` / `isLoading`. Read each component's `.d.ts` for its own set — the values there are
exhaustive.

Most components also take `as` to render a different element or component (`<Button as="a" href>`),
so reach for that instead of wrapping a control in something that fakes it.

### For your own layout, use the tokens — never raw values

They are plain CSS custom properties, so `var(--fm-*)` works anywhere, in any styling approach.

| Family                           | Use for              | Real names                                                                                                                                                                                                                  |
| -------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--fm-space-*`                   | all spacing          | `inset-s/m/l` (padding), `stack-s/m/l` (vertical gaps), `inline-s/m/l` (horizontal gaps), `internal-xs/s/m`                                                                                                                 |
| `--fm-color-*`                   | every colour         | roles, not hues: `background`, `foreground`, `border`, `card`, `card-foreground`, and per-intent families `accent`/`destructive`/`error` each with `-hover`, `-active`, `-subtle`, `-disabled` and a matching `-foreground` |
| `--fm-text-*` + `--fm-leading-*` | type scale           | `xs sm base lg xl 2xl 3xl 4xl`, paired name for name                                                                                                                                                                        |
| `--fm-font-*`                    | families and weights | `sans`, `heading`, `mono`; `weight-light/regular/medium/semibold/bold/extrabold`                                                                                                                                            |
| `--fm-radius-*`                  | corners              | `sm md lg xl`                                                                                                                                                                                                               |

Always pair a surface with its own foreground (`--fm-color-accent` with
`--fm-color-accent-foreground`): those pairs are contrast-tested, arbitrary combinations are not.
`--fm-palette-*` is the raw ramp underneath — do not use it directly, it carries no meaning.

### The DS ships no icons

Icons are injected by the app. Pass your own node to `icon` / `iconEnd`; a component never imports
one.

### Where the truth is

`styles.css` and its imports are the whole contract: `tokens/vars.css` is every token with its real
value, `tokens/baseline.css` is the base layer (it sets `box-sizing: border-box` and the body font —
your page needs it), `tokens/presets/dark.css` is the dark theme. Each component's `.d.ts` is its
API and its `.prompt.md` is its usage guide. Read those before styling; a summary is never as
accurate as the file.

### Idiomatic

```jsx
<UiProvider adapters={{ i18n: { locale: 'en' } }}>
  <section
    style={{
      display: 'grid',
      gap: 'var(--fm-space-stack-m)',
      padding: 'var(--fm-space-inset-l)',
      background: 'var(--fm-color-card)',
      color: 'var(--fm-color-card-foreground)',
      borderRadius: 'var(--fm-radius-lg)',
    }}
  >
    <Heading level={2}>Members</Heading>
    <Button variant="primary" size="md">
      Invite
    </Button>
  </section>
</UiProvider>
```

The controls are the library's; the layout around them is yours, built from tokens.
