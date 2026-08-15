---
title: 'Bundle size'
---

# Bundle size

What `@fmmenchi/ui` costs a consumer, per component and against the alternatives. Every number on
this page was measured, not estimated — see [How this was measured](#how-this-was-measured) for the
commands, and re-run them before trusting a figure older than the build it describes.

**Measured on `main` at `222ef3b`, 14 August 2026.**

|                                        | gzip                              |
| -------------------------------------- | --------------------------------- |
| The whole library, everything imported | **103.3 kB** (91.2 JS + 12.1 CSS) |
| The median component                   | **2.2 kB** JS                     |
| The stylesheet, indivisible            | **12.1 kB**                       |
| The heaviest entry (`table`)           | **36.0 kB** JS                    |

## The stylesheet is the entry cost

There is one `@fmmenchi/ui/style.css` and it cannot be split —
[ADR-0023](../../adr/0023-one-stylesheet.md) settled that,
because 16 of the entries render other components and a per-component sheet could not carry what its
component needs. The consequence for size is the thing to internalise:

**every consumer pays 12.1 kB gzip of CSS no matter how little they import.**

A page with a single `Button` costs 3.0 kB of JS and 12.1 kB of CSS. The JS only overtakes the
stylesheet somewhere around the sixth component imported. This is the right trade for an
application — which is what the library is for — and the wrong one for a landing page that wants one
button.

## Per component

JS after real tree-shaking, isolating each entry. The CSS column is the share that component
contributes to the shared sheet — informative, not billable, since the sheet ships whole. The last
column is the same closure with no tree-shaking at all: the gap between the two is how much work the
consumer's bundler is doing for you.

### The ten to watch

| Entry                  | JS gzip | CSS gzip | No shaking |
| ---------------------- | ------- | -------- | ---------- |
| `table`                | 36.0    | 3.69     | 44.5       |
| `form-date-picker`     | 27.5    | 2.97     | 33.8       |
| `date-picker`          | 24.2    | 2.86     | 29.4       |
| `table-columns-menu`   | 18.1    | 2.42     | 23.2       |
| `table-filter-trigger` | 14.7    | 2.41     | 18.6       |
| `table-toolbar`        | 11.9    | 1.74     | 16.1       |
| `tooltip`              | 11.6    | 0.89     | 13.7       |
| `form-date-input`      | 11.4    | 1.16     | 15.4       |
| `menu-content`         | 11.4    | 1.10     | 14.9       |
| `popover-content`      | 9.46    | 0.85     | 11.2       |

Two families own the top of the table, and for different reasons.

**`table` is 40% of the library's JS in one entry.** It exports `Table` plus ten hooks
(`useTableSort`, `useRowSelection`, `useColumnOrder` and seven more) from a single 46 kB chunk, and
the component itself mounts pagination, filters and the column resizer — so it pulls in
`floating-ui` and `popover-content` whether or not you use them. Importing only `Table` costs
30.7 kB; importing everything the entry offers costs 36.0 kB. Tree-shaking recovers 5.3 kB of that
and no more.

**The date family is not one component, it is four.** `date-picker` stacks an anchored popover
surface (`floating-ui`, 7.72 kB) around a `calendar` (4.48 kB) around a `date-input` (5.21 kB), plus
the shared formatter. Nothing is duplicated — every layer is genuinely there, which is why 24.2 kB
is the honest price of the feature rather than a packaging mistake.

<details>
<summary>All 101 entries, heaviest first</summary>

| Entry                    | JS gzip | CSS gzip | No shaking |
| ------------------------ | ------- | -------- | ---------- |
| `table`                  | 36.0    | 3.69     | 44.5       |
| `form-date-picker`       | 27.5    | 2.97     | 33.8       |
| `date-picker`            | 24.2    | 2.86     | 29.4       |
| `table-columns-menu`     | 18.1    | 2.42     | 23.2       |
| `table-filter-trigger`   | 14.7    | 2.41     | 18.6       |
| `table-toolbar`          | 11.9    | 1.74     | 16.1       |
| `tooltip`                | 11.6    | 0.89     | 13.7       |
| `form-date-input`        | 11.4    | 1.16     | 15.4       |
| `menu-content`           | 11.4    | 1.10     | 14.9       |
| `popover-content`        | 9.46    | 0.85     | 11.2       |
| `nav-group`              | 9.31    | 1.27     | 11.2       |
| `calendar`               | 8.47    | 1.84     | 11.4       |
| `pagination`             | 8.46    | 1.78     | 11.4       |
| `date-input`             | 8.12    | 1.00     | 11.0       |
| `app-layout-nav`         | 8.05    | 2.71     | 11.1       |
| `toast-region`           | 6.72    | 2.42     | 9.49       |
| `table-column-resizer`   | 5.29    | 0.60     | 7.41       |
| `form-select`            | 4.99    | 1.76     | 8.20       |
| `form-segmented-control` | 4.95    | 0.71     | 8.09       |
| `form-input`             | 4.92    | 1.07     | 8.09       |
| `toast`                  | 4.82    | 2.24     | 7.16       |
| `form-textarea`          | 4.76    | 1.15     | 7.92       |
| `form-choice`            | 4.75    | 0.82     | 7.92       |
| `form-switch`            | 4.37    | 1.14     | 7.38       |
| `tabs`                   | 4.11    | 0.87     | 5.41       |
| `menu-trigger`           | 3.85    | 1.48     | 6.02       |
| `dialog-content`         | 3.72    | 1.11     | 4.72       |
| `toggle`                 | 3.71    | 1.54     | 5.85       |
| `dialog-trigger`         | 3.69    | 1.48     | 5.91       |
| `popover-trigger`        | 3.64    | 1.48     | 5.83       |
| `toolbar`                | 3.57    | 0.47     | 5.07       |
| `field`                  | 3.55    | 0.51     | 5.11       |
| `menubar`                | 3.53    | 0.50     | 6.24       |
| `dialog-close`           | 3.53    | 1.48     | 5.68       |
| `popover-close`          | 3.35    | 1.48     | 5.44       |
| `menu-item-checkbox`     | 3.22    | 0.94     | 4.98       |
| `choice-field`           | 3.15    | 0.65     | 4.78       |
| `button`                 | 3.07    | 1.48     | 5.05       |
| `card-title`             | 2.98    | 0.60     | 5.33       |
| `menu-item-trigger`      | 2.95    | —        | 5.90       |
| `form-error-summary`     | 2.87    | 0.63     | 4.90       |
| `menu-item-radio`        | 2.80    | 0.64     | 4.49       |
| `toolbar-item`           | 2.80    | 0.47     | 4.16       |
| `numeric`                | 2.73    | —        | 4.78       |
| `time`                   | 2.72    | —        | 4.73       |
| `tab`                    | 2.37    | 0.87     | 3.77       |
| `menu-item`              | 2.33    | 0.82     | 3.80       |
| `alert`                  | 2.25    | 0.76     | 4.03       |
| `accordion-item`         | 2.22    | 0.62     | 3.08       |
| `breadcrumb-link`        | 2.22    | 0.63     | 4.38       |
| `nav-link`               | 2.21    | 0.74     | 4.34       |
| `tab-list`               | 2.10    | 0.37     | 2.97       |
| `avatar`                 | 2.08    | 0.76     | 2.82       |
| `slider`                 | 2.06    | 0.81     | 3.02       |
| `fieldset`               | 2.06    | 0.18     | 3.13       |
| `select`                 | 1.99    | 1.61     | 2.88       |
| `menu`                   | 1.97    | 0.50     | 4.42       |
| `card`                   | 1.93    | 0.38     | 2.78       |
| `app-layout`             | 1.89    | 1.17     | 3.70       |
| `input`                  | 1.88    | 0.91     | 2.71       |
| `badge`                  | 1.87    | 0.82     | 2.68       |
| `heading`                | 1.81    | 0.45     | 2.56       |
| `checkbox`               | 1.78    | 0.49     | 2.76       |
| `visually-hidden`        | 1.74    | 0.21     | 2.48       |
| `tab-panel`              | 1.68    | 0.32     | 2.48       |
| `segmented-control`      | 1.67    | 0.39     | 2.47       |
| `textarea`               | 1.65    | 0.98     | 2.56       |
| `field-description`      | 1.55    | 0.21     | 2.35       |
| `field-error`            | 1.54    | 0.26     | 2.34       |
| `segmented-control-item` | 1.48    | 1.05     | 2.19       |
| `popover-heading`        | 1.45    | 0.36     | 2.19       |
| `dialog-heading`         | 1.45    | 0.35     | 2.18       |
| `nav`                    | 1.39    | 0.29     | 2.12       |
| `popover`                | 1.33    | —        | 1.93       |
| `accordion`              | 1.31    | 0.17     | 2.02       |
| `fieldset-content`       | 1.31    | 0.20     | 1.92       |
| `dialog`                 | 1.29    | —        | 1.87       |
| `card-cover`             | 1.29    | 0.31     | 1.94       |
| `breadcrumb`             | 1.26    | 0.24     | 2.75       |
| `toolbar-separator`      | 1.25    | 0.63     | 1.94       |
| `app-layout-main`        | 1.24    | 1.21     | 1.94       |
| `table-header-cell`      | 1.22    | —        | 1.80       |
| `switch`                 | 1.22    | 0.83     | 2.03       |
| `radio`                  | 1.21    | 0.48     | 2.02       |
| `fieldset-legend`        | 1.15    | 0.37     | 1.82       |
| `field-label`            | 1.14    | 0.39     | 2.04       |
| `separator`              | 1.08    | 0.29     | 1.59       |
| `progress`               | 1.01    | 0.59     | 1.52       |
| `accordion-trigger`      | 0.96    | 0.90     | 1.47       |
| `accordion-content`      | 0.96    | 0.23     | 1.47       |
| `card-actions`           | 0.96    | 0.20     | 1.46       |
| `table-body`             | 0.95    | —        | 1.49       |
| `table-head`             | 0.95    | —        | 1.48       |
| `table-foot`             | 0.95    | —        | 1.48       |
| `menu-separator`         | 0.93    | 0.23     | 1.42       |
| `input-group`            | 0.93    | 0.96     | 1.42       |
| `menu-group`             | 0.88    | 0.42     | 1.29       |
| `app-layout-nav-drawer`  | 0.80    | —        | 1.27       |
| `app-layout-nav-column`  | 0.80    | —        | 1.27       |
| `table-cell`             | 0.74    | —        | 1.12       |
| `table-row`              | 0.70    | —        | 1.08       |

</details>

The distribution behind those two families is healthy: 76 of 101 entries are under 4 kB, only 9 are
over 10 kB, and the baseline every single component shares is one 827 B chunk — the React Compiler
runtime.

## What the third parties cost

At runtime the only external imports left in `dist` are `react` and `react/jsx-runtime`. Everything
else is bundled in, which makes the third-party cost real but invisible:

|                            | gzip    | Reaches                            |
| -------------------------- | ------- | ---------------------------------- |
| `@floating-ui/dom`         | 7.72 kB | 9 entries — every anchored surface |
| `class-variance-authority` | 523 B   | all                                |
| `clsx` (with `cn`)         | 355 B   | all                                |

`floating-ui` is the single largest third-party cost in the library; on `tooltip` it is 66% of the
component. The nine entries that carry it are `tooltip`, `popover-content`, `menu-content`,
`nav-group`, `table`, `table-filter-trigger`, `table-columns-menu`, `date-picker` and
`form-date-picker`.

The `dependencies` entries for these are correct rather than redundant — the emitted `.d.ts` files
import types from `@floating-ui/dom`, `class-variance-authority` and `clsx`, so a consumer needs
them resolvable. `tslib` is the exception: it appears in no `dist` file, JS or declaration.

## Against the alternatives

Ten well-known React libraries, installed and measured on the same machine with the same command.
Not taken from bundlephobia — figures published there are usually without tree-shaking or without
`NODE_ENV=production`, and both inflate every row.

### A real application kit — 12 components

`Button`, `Input`, `Select`, `Checkbox`, `Radio`, `Switch`, `Dialog`, `Tooltip`, `Tabs`, `Table`,
`Alert`, `Badge`. This is the scenario that decides, because almost no application imports one
component.

| Library                      | Total gzip  |                                      |
| ---------------------------- | ----------- | ------------------------------------ |
| **`@fmmenchi/ui`**           | **52.7 kB** | styles included                      |
| `radix-ui`                   | 49.7 kB     | headless, and only 7 of the 12 exist |
| `react-aria-components`      | 70.6 kB     | headless — you still write the CSS   |
| `@chakra-ui/react`           | 70.7 kB     |                                      |
| `@fluentui/react-components` | 75.8 kB     |                                      |
| `@mui/material`              | 88.3 kB     |                                      |
| `@mantine/core`              | 108.7 kB    | includes its 38.2 kB stylesheet      |
| `@heroui/react`              | 115.5 kB    | plus the consumer's Tailwind         |
| `antd`                       | 236.0 kB    |                                      |

Lightest of the set, by a real margin: MUI costs 1.7× and Ant Design 4.5×. Radix appears to undercut
it, but covers 7 of the 12 and is headless — `Button`, `Input`, `Table`, `Alert` and `Badge` are
yours to write, CSS included.

### A single Button

| Library                      | Total gzip         |
| ---------------------------- | ------------------ |
| `@headlessui/react`          | 7.10 kB (headless) |
| `@fluentui/react-components` | 12.4 kB            |
| `react-aria-components`      | 13.1 kB (headless) |
| `@chakra-ui/react`           | 13.6 kB            |
| **`@fmmenchi/ui`**           | **15.1 kB**        |
| `@heroui/react`              | 26.7 kB            |
| `@mui/material`              | 37.6 kB            |
| `@mantine/core`              | 50.7 kB            |
| `antd`                       | 57.6 kB            |

**This is the scenario the library loses**, and it is worth stating plainly: the indivisible
stylesheet is paid in full for one component, while a CSS-in-JS library emits only the styles for
what you actually render. The ordering inverts as the component count grows — by twelve components
the same libraries cost 1.3× to 4.5× more.

### Everything imported

`@headlessui/react` 68.2 · `radix-ui` 100.6 · **`@fmmenchi/ui` 103.5** · `@mui/material` 169.5 ·
`@mantine/core` 223.2 · `react-aria-components` 281.8 · `@ark-ui/react` 286.9 ·
`@chakra-ui/react` 313.7 · `@fluentui/react-components` 333.6 · `@heroui/react` 359.5 ·
`antd` 484.1 (kB gzip).

The least fair of the three comparisons, because breadth differs: `antd` bundles a full data grid,
DatePicker, Upload, Cascader and dozens of locales, and the headless libraries bundle no styles at
all. Read the 12-component kit above instead — it is the only one of the three that holds the scope
constant.

## How this was measured

Every figure is reproducible. Build first, because the numbers describe `dist`, not `src`:

```bash
pnpm nx run @fmmenchi/ui:build
```

- **JS gzip** — each entry bundled on its own with esbuild
  (`--bundle --minify --format=esm --platform=browser`), `react`/`react-dom` external,
  `--define:process.env.NODE_ENV='"production"'`, then gzip level 9. That is what a consumer's
  bundler actually emits, not the sum of the files on disk.
- **No shaking** — gzip of the entry's full transitive chunk closure. An upper bound.
- **Do not add the JS column up.** It sums to 416 kB, but entries share chunks; imported together
  they are 91.2 kB. Each row answers "what does this component cost _on its own_".
- **Comparison** — the other libraries installed at MUI 9.3.1, antd 6.6.0, Mantine 9.5.1,
  Chakra 3.36.1, HeroUI 3.2.4, Fluent 9.74.6, react-aria-components 1.20.0, radix-ui 1.6.7,
  Headless UI 2.2.10, Ark 5.38.1 — same esbuild command, same gzip level. Without the `NODE_ENV`
  define MUI and antd ship their development warnings and every comparison is wrong.

:::warning These numbers date
Nothing in the build fails when this page drifts. The stylesheet figure in the agent-facing build
notes sat at 4.5 kB from when the library had 32 entries until it was re-measured here at 101 and
found to be 12.1 kB — a 2.7× drift nobody could see, because the file grows a hundred bytes at a
time. Re-run the commands above before quoting anything on this page, and update it in the same
commit as whatever moved it.
:::
