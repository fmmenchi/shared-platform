export { UiProvider, useUi, type UiProviderProps } from './i18n/provider.js';
export type {
  UiAdapters,
  I18n,
  Direction,
  LinkComponent,
  NavigateFn,
  IconRenderer,
  PortalContainer,
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
