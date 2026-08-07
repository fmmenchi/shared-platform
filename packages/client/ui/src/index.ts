export { UiProvider, useUi, type UiProviderProps } from './i18n/provider.js';
export type {
  UiAdapters,
  I18n,
  Direction,
  LinkComponent,
  NavigateFn,
  IconRenderer,
} from './i18n/ports.types.js';
export { Button } from './components/button/button.component.js';
export { buttonVariants } from './components/button/button.variants.js';
export type {
  ButtonProps,
  ButtonVariants,
} from './components/button/button.types.js';
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
export { NavLink } from './components/nav-link/nav-link.component.js';
export { MenuItem } from './components/menu-item/menu-item.component.js';
export { MenuItemTrigger } from './components/menu-item-trigger/menu-item-trigger.component.js';
export type { MenuProps } from './components/menu/menu.types.js';
export type { MenuTriggerProps } from './components/menu-trigger/menu-trigger.types.js';
export type { MenuContentProps } from './components/menu-content/menu-content.types.js';
export type { NavProps } from './components/nav/nav.types.js';
export type { NavOrientation } from './components/nav/nav.context.js';
export type { NavGroupProps } from './components/nav-group/nav-group.types.js';
export type { NavLinkProps } from './components/nav-link/nav-link.types.js';
export type { MenuItemProps } from './components/menu-item/menu-item.types.js';
export type { MenuItemTriggerProps } from './components/menu-item-trigger/menu-item-trigger.types.js';
