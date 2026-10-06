const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes a value for interpolation into a template's markup, in element content and in a
 * quoted attribute alike.
 *
 * A template is a function returning a string, so nothing downstream can tell a user's
 * name from markup: a name of `<mj-image src="…">` would be compiled as one. Every value
 * that did not come from the template's author goes through here.
 */
export function escape(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ENTITIES[character]);
}
