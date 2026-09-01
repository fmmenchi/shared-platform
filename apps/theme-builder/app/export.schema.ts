import { z } from 'zod';

/**
 * WHAT THE EXPORT STEP ASKS, AND WHY IT IS A FORM AT ALL.
 *
 * Two questions, and both of them are real — which is the test a step has to pass
 * before it gets a form here. Step two has none: a palette is derived from step one,
 * so a form there would be ceremony.
 *
 * THE NAME IS THE ONE RULE WORTH ENFORCING, and it is enforced because the generator
 * enforces it: `themeGenerator` refuses anything outside `^[a-z][a-z0-9-]*$`. Asking
 * the same question here means a person finds out while they can still fix it,
 * rather than after downloading a file and running a command that then fails.
 *
 * It is not politeness, either. The name lands inside `[data-theme='…']`, a CSS
 * attribute selector — so a capital letter or a space does not error, it writes a
 * stylesheet that silently matches nothing and applies not one of its 84 roles. A
 * validation whose absence produces a working file that does nothing is worth having.
 *
 * THE SCHEME IS THE OTHER, and it is not cosmetic: `color-scheme` is what the
 * BROWSER paints its own controls from — a select's popup, a native checkbox — and it
 * reads nothing from the roles. A dark theme that claims `light` ships white native
 * lists on Safari and Firefox, which is a recorded defect of hand-written presets.
 * Nothing can derive the answer, because "is this theme dark" is a judgement about
 * the surfaces a person chose.
 *
 * NOTHING ELSE IS ASKED. The bases came from step one and the theme is generated,
 * not configured: an option here that changed the OUTPUT would be a decision made in
 * the wrong step, where the person cannot see its effect.
 */
export const exportSchema = z.object({
  name: z
    .string()
    .min(1, 'The theme needs a name — it becomes the data-theme value.')
    .regex(
      /^[a-z][a-z0-9-]*$/,
      'Lowercase letters, digits and dashes, starting with a letter. It goes inside [data-theme=…], where anything else silently matches nothing.',
    ),
});

/*
 * `scheme` USED TO BE HERE AND WAS A FALSE CHOICE. The wizard read `vars.css` only,
 * so both settings produced the same light-derived colours — and the generator emits
 * `--scheme` as nothing but the `color-scheme` line, so picking "dark" shipped light
 * colours with dark native controls: a select's popup and a native checkbox inverted
 * against everything around them. A control that changes the label and not the thing
 * is worse than no control.
 *
 * The wizard builds BOTH themes now, so there is nothing to choose: the scheme of
 * each file is a fact about which one it is.
 */

export type ExportValues = z.infer<typeof exportSchema>;
