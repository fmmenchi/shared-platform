export { UiProvider, useUi, type UiProviderProps } from './i18n/provider.js';
export type {
  UiAdapters,
  I18n,
  Direction,
  LinkComponent,
  UseIsCurrent,
  NavigateFn,
  IconRenderer,
} from './i18n/ports.types.js';
export { Button } from './components/button/button.component.js';
export { buttonVariants } from './components/button/button.variants.js';
export type {
  ButtonProps,
  ButtonVariants,
} from './components/button/button.types.js';
export { Toggle } from './components/toggle/toggle.component.js';
export type { ToggleProps } from './components/toggle/toggle.types.js';
export { SegmentedControl } from './components/segmented-control/segmented-control.component.js';
export type { SegmentedControlProps } from './components/segmented-control/segmented-control.types.js';
export { SegmentedControlItem } from './components/segmented-control-item/segmented-control-item.component.js';
export type { SegmentedControlItemProps } from './components/segmented-control-item/segmented-control-item.types.js';
export {
  UI_SUPPORTED_LOCALES,
  UI_FALLBACK_LOCALE,
  type UiLocale,
} from './i18n/messages.js';
export { animateExit } from './primitives/animate-exit.js';
export type {
  AnimateExitOptions,
  ExitPreset,
  MotionDuration,
  MotionEase,
} from './primitives/animate-exit.types.js';
export { Badge } from './components/badge/badge.component.js';
export { badgeVariants } from './components/badge/badge.variants.js';
export type {
  BadgeProps,
  BadgeVariants,
} from './components/badge/badge.types.js';
export { Input } from './components/input/input.component.js';
export { inputVariants } from './components/input/input.variants.js';
export type {
  InputProps,
  InputVariants,
} from './components/input/input.types.js';
// One folder per component, parts included — a part is a component in its own
// right (the MUI model), so `FieldDescription`/`FieldError` belong to neither
// family: they bind to the nearest describable container, `Field` or `Fieldset`.
export { Field, useField } from './components/field/index.js';
export type { FieldProps } from './components/field/field.types.js';
export type {
  UseFieldResult,
  FieldLabelSlotProps,
} from './components/field/use-field.types.js';
export { FieldLabel } from './components/field-label/index.js';
export type { FieldLabelProps } from './components/field-label/field-label.types.js';
export { FieldDescription } from './components/field-description/index.js';
export type { FieldDescriptionProps } from './components/field-description/field-description.types.js';
export { FieldError } from './components/field-error/index.js';
export type { FieldErrorProps } from './components/field-error/field-error.types.js';
export { Fieldset } from './components/fieldset/index.js';
export type { FieldsetProps } from './components/fieldset/fieldset.types.js';
export { FieldsetLegend } from './components/fieldset-legend/index.js';
export type { FieldsetLegendProps } from './components/fieldset-legend/fieldset-legend.types.js';
export {
  FieldsetContent,
  fieldsetContentVariants,
} from './components/fieldset-content/index.js';
export type {
  FieldsetContentProps,
  FieldsetOrientation,
} from './components/fieldset-content/fieldset-content.types.js';
export { InputGroup } from './components/input-group/input-group.component.js';
export type { InputGroupProps } from './components/input-group/input-group.types.js';
export { Radio } from './components/radio/radio.component.js';
export type { RadioProps } from './components/radio/radio.types.js';
export { Checkbox } from './components/checkbox/checkbox.component.js';
export type { CheckboxProps } from './components/checkbox/checkbox.types.js';
export { Switch } from './components/switch/switch.component.js';
export type { SwitchProps } from './components/switch/switch.types.js';
export { ChoiceField } from './components/choice-field/index.js';
export type { ChoiceFieldProps } from './components/choice-field/choice-field.types.js';
export { FormInput } from './components/form-input/form-input.component.js';
export type { FormInputProps } from './components/form-input/form-input.types.js';
export { FormTextarea } from './components/form-textarea/form-textarea.component.js';
export type { FormTextareaProps } from './components/form-textarea/form-textarea.types.js';
export { FormSelect } from './components/form-select/form-select.component.js';
export type { FormSelectProps } from './components/form-select/form-select.types.js';
export { FormChoice } from './components/form-choice/form-choice.component.js';
export type { FormChoiceProps } from './components/form-choice/form-choice.types.js';
export { FormSwitch } from './components/form-switch/form-switch.component.js';
export type { FormSwitchProps } from './components/form-switch/form-switch.types.js';
export { FormSegmentedControl } from './components/form-segmented-control/form-segmented-control.component.js';
export type { FormSegmentedControlProps } from './components/form-segmented-control/form-segmented-control.types.js';
export type {
  UseFormField,
  UseFormErrors,
  BoundField,
  FieldMessages,
  BindingOwned,
  BoundFields,
  WithFieldName,
} from './form/index.js';
export { createBoundFields } from './form/index.js';
export { FormErrorSummary } from './components/form-error-summary/index.js';
export type { FormErrorSummaryProps } from './components/form-error-summary/form-error-summary.types.js';
export { Textarea } from './components/textarea/textarea.component.js';
export { textareaVariants } from './components/textarea/textarea.variants.js';
export type {
  TextareaProps,
  TextareaVariants,
} from './components/textarea/textarea.types.js';
export { Select } from './components/select/select.component.js';
export { selectVariants } from './components/select/select.variants.js';
export type {
  SelectProps,
  SelectVariants,
} from './components/select/select.types.js';
export { Tooltip } from './components/tooltip/tooltip.component.js';
export { TooltipProvider } from './components/tooltip/tooltip.context.js';
export type { TooltipProps } from './components/tooltip/tooltip.types.js';
export type { TooltipProviderProps } from './components/tooltip/tooltip.context.types.js';
export { Popover } from './components/popover/popover.component.js';
export { PopoverTrigger } from './components/popover-trigger/popover-trigger.component.js';
export { PopoverContent } from './components/popover-content/popover-content.component.js';
export { PopoverHeading } from './components/popover-heading/popover-heading.component.js';
export { PopoverClose } from './components/popover-close/popover-close.component.js';
export type { PopoverProps } from './components/popover/popover.types.js';
export type { PopoverTriggerProps } from './components/popover-trigger/popover-trigger.types.js';
export type { PopoverContentProps } from './components/popover-content/popover-content.types.js';
export type { PopoverHeadingProps } from './components/popover-heading/popover-heading.types.js';
export type { PopoverCloseProps } from './components/popover-close/popover-close.types.js';
export { Dialog } from './components/dialog/dialog.component.js';
export { DialogTrigger } from './components/dialog-trigger/dialog-trigger.component.js';
export { DialogContent } from './components/dialog-content/dialog-content.component.js';
export { DialogHeading } from './components/dialog-heading/dialog-heading.component.js';
export { DialogClose } from './components/dialog-close/dialog-close.component.js';
export type { DialogProps } from './components/dialog/dialog.types.js';
export type { DialogTriggerProps } from './components/dialog-trigger/dialog-trigger.types.js';
export type { DialogContentProps } from './components/dialog-content/dialog-content.types.js';
export type { DialogHeadingProps } from './components/dialog-heading/dialog-heading.types.js';
export type { DialogCloseProps } from './components/dialog-close/dialog-close.types.js';
export { Menu } from './components/menu/menu.component.js';
export { MenuTrigger } from './components/menu-trigger/menu-trigger.component.js';
export { MenuContent } from './components/menu-content/menu-content.component.js';
export { Nav } from './components/nav/nav.component.js';
export { NavGroup } from './components/nav-group/nav-group.component.js';
export { pathIsCurrent } from './primitives/path-is-current.js';
export { NavLink } from './components/nav-link/nav-link.component.js';
export { MenuItem } from './components/menu-item/menu-item.component.js';
export { MenuItemTrigger } from './components/menu-item-trigger/menu-item-trigger.component.js';
export type { MenuProps } from './components/menu/menu.types.js';
export type { MenuTriggerProps } from './components/menu-trigger/menu-trigger.types.js';
export type { MenuContentProps } from './components/menu-content/menu-content.types.js';
export type { NavProps } from './components/nav/nav.types.js';
export type { NavOrientation } from './components/nav/nav.context.js';
export type { NavGroupProps } from './components/nav-group/nav-group.types.js';
export type {
  NavLinkExtraProps,
  NavLinkProps,
} from './components/nav-link/nav-link.types.js';
export type { MenuItemProps } from './components/menu-item/menu-item.types.js';
export type { MenuItemTriggerProps } from './components/menu-item-trigger/menu-item-trigger.types.js';
export { Menubar } from './components/menubar/menubar.component.js';
export type { MenubarProps } from './components/menubar/menubar.types.js';
export { MenuItemCheckbox } from './components/menu-item-checkbox/menu-item-checkbox.component.js';
export type { MenuItemCheckboxProps } from './components/menu-item-checkbox/menu-item-checkbox.types.js';
export { MenuItemRadio } from './components/menu-item-radio/menu-item-radio.component.js';
export type { MenuItemRadioProps } from './components/menu-item-radio/menu-item-radio.types.js';
export { MenuGroup } from './components/menu-group/menu-group.component.js';
export type { MenuGroupProps } from './components/menu-group/menu-group.types.js';
export { MenuSeparator } from './components/menu-separator/menu-separator.component.js';
export type { MenuSeparatorProps } from './components/menu-separator/menu-separator.types.js';
export { AppLayout } from './components/app-layout/app-layout.component.js';
export type { AppLayoutProps } from './components/app-layout/app-layout.types.js';
export { AppLayoutNav } from './components/app-layout-nav/app-layout-nav.component.js';
export type { AppLayoutNavProps } from './components/app-layout-nav/app-layout-nav.types.js';
export { AppLayoutMain } from './components/app-layout-main/app-layout-main.component.js';
export type { AppLayoutMainProps } from './components/app-layout-main/app-layout-main.types.js';
export { AppLayoutNavColumn } from './components/app-layout-nav-column/app-layout-nav-column.component.js';
export type { AppLayoutNavColumnProps } from './components/app-layout-nav-column/app-layout-nav-column.types.js';
export { AppLayoutNavDrawer } from './components/app-layout-nav-drawer/app-layout-nav-drawer.component.js';
export type { AppLayoutNavDrawerProps } from './components/app-layout-nav-drawer/app-layout-nav-drawer.types.js';
export { Heading } from './components/heading/heading.component.js';
export { headingVariants } from './components/heading/heading.variants.js';
export type {
  HeadingLevel,
  HeadingProps,
  HeadingVariants,
} from './components/heading/heading.types.js';
export { Card } from './components/card/card.component.js';
export { cardVariants } from './components/card/card.variants.js';
export type { CardProps, CardVariants } from './components/card/card.types.js';
export { CardTitle } from './components/card-title/card-title.component.js';
export type { CardTitleProps } from './components/card-title/card-title.types.js';
export { CardCover } from './components/card-cover/card-cover.component.js';
export type {
  CardCoverProps,
  CardCoverElement,
} from './components/card-cover/card-cover.types.js';
export { CardActions } from './components/card-actions/card-actions.component.js';
export type { CardActionsProps } from './components/card-actions/card-actions.types.js';
export { Tabs } from './components/tabs/tabs.component.js';
export type {
  TabsProps,
  TabsOrientation,
  TabsActivation,
} from './components/tabs/tabs.types.js';
export { useTabsContext } from './components/tabs/tabs.context.js';
export type {
  TabsContextValue,
  TabData,
} from './components/tabs/tabs.context.js';
export { TabList } from './components/tab-list/tab-list.component.js';
export type { TabListProps } from './components/tab-list/tab-list.types.js';
export { Tab } from './components/tab/tab.component.js';
export type { TabProps } from './components/tab/tab.types.js';
export { TabPanel } from './components/tab-panel/tab-panel.component.js';
export type { TabPanelProps } from './components/tab-panel/tab-panel.types.js';

export { Accordion } from './components/accordion/accordion.component.js';
export type { AccordionProps } from './components/accordion/accordion.types.js';
export { AccordionItem } from './components/accordion-item/accordion-item.component.js';
export type { AccordionItemProps } from './components/accordion-item/accordion-item.types.js';
export { AccordionTrigger } from './components/accordion-trigger/accordion-trigger.component.js';
export type { AccordionTriggerProps } from './components/accordion-trigger/accordion-trigger.types.js';
export { AccordionContent } from './components/accordion-content/accordion-content.component.js';
export type { AccordionContentProps } from './components/accordion-content/accordion-content.types.js';
export { VisuallyHidden } from './components/visually-hidden/visually-hidden.component.js';
export type { VisuallyHiddenProps } from './components/visually-hidden/visually-hidden.types.js';
export { Toolbar } from './components/toolbar/toolbar.component.js';
export type {
  ToolbarProps,
  ToolbarOrientation,
} from './components/toolbar/toolbar.types.js';
export { ToolbarItem } from './components/toolbar-item/toolbar-item.component.js';
export type { ToolbarItemProps } from './components/toolbar-item/toolbar-item.types.js';
export { ToolbarSeparator } from './components/toolbar-separator/toolbar-separator.component.js';
export type { ToolbarSeparatorProps } from './components/toolbar-separator/toolbar-separator.types.js';
// `Alert` was SHIPPED AND UNREACHABLE: a full folder, a doc page, stories, a
// test suite, a line in the roadmap's Shipped table — and no export here, no
// vite entry, no `exports` subpath. Nothing could see it, because every gate
// looked at the component and none looked at the way out. Found by
// `src/test/subpath-exports.test.ts` on the day that check was written.
export { Alert } from './components/alert/alert.component.js';
export { alertVariants } from './components/alert/alert.variants.js';
export type {
  AlertProps,
  AlertVariants,
} from './components/alert/alert.types.js';
export type {
  ToastOptions,
  ToastEntry,
} from './components/toast/toast.types.js';
export { ToastRegion } from './components/toast-region/toast-region.component.js';
export { useToast } from './components/toast-region/toast-region.context.js';
export type {
  ToastRegionProps,
  ToastPlacement,
  ToastContextValue,
} from './components/toast-region/toast-region.types.js';
export { Progress } from './components/progress/progress.component.js';
export type { ProgressProps } from './components/progress/progress.types.js';
export { Table } from './components/table/table.component.js';
export type {
  TableProps,
  Column,
  TableAlign,
  TableDensity,
} from './components/table/table.types.js';
// The view state and the engine, as two hooks rather than one: a consumer whose
// server does the ordering takes `useSortState` and never pulls the collation
// engine into their bundle.
export { useSortState, nextSort } from './components/table/use-sort-state.js';
export type {
  UseSortStateOptions,
  UseSortStateResult,
} from './components/table/use-sort-state.types.js';
export { useTableSort } from './components/table/use-table-sort.js';
export type {
  UseTableSortOptions,
  UseTableSortResult,
} from './components/table/use-table-sort.types.js';
// `Comparator` alongside them because the docs tell you to hoist your `compare`
// map out of the render, and hoisting it is what forces you to name its type.
export type {
  SortState,
  SortDirection,
  Comparator,
} from './sorting/compare.types.js';
// Selection is not a projection parameter: it derives no rows, it ends in an
// action. Which is why it is its own hook, and why the rule it produces —
// "these" or "everything except these" — is what a bulk request body wants.
export { useRowSelection } from './components/table/use-row-selection.js';
export type {
  UseRowSelectionOptions,
  UseRowSelectionResult,
} from './components/table/use-row-selection.types.js';
// The algebra is public for the reason `nextSort` is: `Table` reports selection
// intents, so a consumer holding the state writes the transition — and the
// two-mode reading is the one thing the engine says nobody should redo by hand.
export {
  NOTHING_SELECTED,
  EVERYTHING_SELECTED,
  isRowSelected,
  countSelected,
  coverageOf,
  toggleRow,
  toggleRows,
} from './selection/selection.js';
export type {
  Selection,
  SelectionCoverage,
} from './selection/selection.types.js';
// The parts are the substrate `Table` is built on, exported for the layouts a
// flat column list cannot express. Dropping to them is decomposition, not a
// second product — the relationship `Field` has to `FormInput`.
export { TableHead } from './components/table-head/table-head.component.js';
export type { TableHeadProps } from './components/table-head/table-head.types.js';
export { TableBody } from './components/table-body/table-body.component.js';
export type { TableBodyProps } from './components/table-body/table-body.types.js';
export { TableFoot } from './components/table-foot/table-foot.component.js';
export type { TableFootProps } from './components/table-foot/table-foot.types.js';
// What is selected, said on the screen and not only announced — and the one
// affordance the table itself cannot offer, since only the bar knows there is
// anything beyond the page.
// Filters are a PROJECTION PARAMETER, like the sort and unlike the selection:
// they decide which rows exist, so they belong in a query key and in a URL. Two
// hooks for the same reason sorting has two — a consumer whose server filters
// takes the state one and the matching never enters their bundle.
export { useFilterState } from './components/table/use-filter-state.js';
export type {
  UseFilterStateOptions,
  UseFilterStateResult,
} from './components/table/use-filter-state.types.js';
export { useTableFilters } from './components/table/use-table-filters.js';
export { useColumnWidths } from './components/table/use-column-widths.js';
export type {
  ColumnWidths,
  UseColumnWidthsOptions,
  UseColumnWidthsResult,
} from './components/table/use-column-widths.types.js';
export { useRowExpansion } from './components/table/use-row-expansion.js';
export type {
  ExpandedRows,
  UseRowExpansionOptions,
  UseRowExpansionResult,
} from './components/table/use-row-expansion.types.js';
export type {
  UseTableFiltersOptions,
  UseTableFiltersResult,
} from './components/table/use-table-filters.types.js';
// ONLY `foldForSearch`, and the sibling engine is the control: `sorting/` puts
// none of its functions in this barrel. A consumer writing a `RowFilter` needs
// the same notion of "contains" the default uses — folding it themselves is how
// one column starts disagreeing with the others — and that is the second
// consumer the rule asks for. The rest are reachable through the hooks.
export { foldForSearch } from './filtering/filter.js';
export type { FilterState, RowFilter } from './filtering/filter.types.js';
export { TableFilterTrigger } from './components/table-filter-trigger/table-filter-trigger.component.js';
export { TableColumnResizer } from './components/table-column-resizer/table-column-resizer.component.js';
export type { TableColumnResizerProps } from './components/table-column-resizer/table-column-resizer.types.js';
export type { TableFilterTriggerProps } from './components/table-filter-trigger/table-filter-trigger.types.js';
export { TableToolbar } from './components/table-toolbar/table-toolbar.component.js';
export type { TableToolbarProps } from './components/table-toolbar/table-toolbar.types.js';
export { TableRow } from './components/table-row/table-row.component.js';
export type { TableRowProps } from './components/table-row/table-row.types.js';
export { TableCell } from './components/table-cell/table-cell.component.js';
export type { TableCellProps } from './components/table-cell/table-cell.types.js';
export { TableHeaderCell } from './components/table-header-cell/table-header-cell.component.js';
export type { TableHeaderCellProps } from './components/table-header-cell/table-header-cell.types.js';
export { Separator } from './components/separator/separator.component.js';
export type { SeparatorProps } from './components/separator/separator.types.js';
