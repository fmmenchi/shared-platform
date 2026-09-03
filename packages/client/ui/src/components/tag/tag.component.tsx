import { cn } from '../../util/cn.js';
import { useMessages } from '../../i18n/provider.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { Button } from '../button/button.component.js';
import { RemoveGlyph } from './remove-glyph.component.js';
import { tagMessages } from './tag.messages.js';
import type { TagProps } from './tag.types.js';
import styles from './tag.module.css';

/**
 * A value the reader put there, and can take back.
 *
 *     <TagList label="Active filters">
 *       <Tag onRemove={() => drop('milano')}>Milano</Tag>
 *       <Tag onRemove={() => drop('torino')}>Torino</Tag>
 *     </TagList>
 *
 * NOT A BADGE, and `onRemove` being required is where that line is drawn rather
 * than described. A `Badge` is presentational — a `<span>` whose text is its
 * accessible name, no role, nothing to press — and its own page has said since
 * it shipped that "a clickable or removable badge is a Tag/Chip (a real
 * `<button>` with its own focus and label), not this component". This is that
 * component. Remove the removal and there is nothing left that a Badge does not
 * already do, which is why the prop cannot be optional: an optional one would
 * make this a Badge with extra steps on half its call sites.
 *
 * NOT A FILTER CHIP EITHER, and that is the other half of the boundary. Material
 * gathers four unrelated things under "chip" — assist, filter, input,
 * suggestion — and three of them already exist here: an assist or suggestion
 * chip is a `Button`, a filter you switch on and off is a `Toggle` (a pressed
 * state), and one-of-many is a `ChoiceField` or a `SegmentedControl`
 * (ADR-0025). What was missing is only the fourth: a value that is IN the set
 * until you take it out. The name says that, and refuses the other three.
 *
 * THE REMOVE CONTROL IS OUR `Button`, not a hand-rolled one. The package's own
 * rule, and the reason for it is on the record: `NavGroup` hand-rolled a button
 * with `border: 0; background: none` — the first two lines of what
 * `button.module.css` does — and shipped with no focus ring at all, invisible
 * to every test because the test page has no Preflight (ADR-0022). Composing it
 * also buys the 44px target under a coarse pointer, which the package holds in
 * one cross-cutting test rather than in each control.
 *
 * IT IS AN `<li>`. A tag belongs to a set, and the set is what a reader needs
 * announced first: "list, 3 items" says how many filters are on before you walk
 * them. The same shape `BreadcrumbLink` and `StepperItem` already have — the
 * part renders the item, the family renders the list.
 */
function Tag(props: TagProps) {
  const { className, children, onRemove, name, ...rest } = props;
  const t = useMessages(tagMessages);

  // THE LABEL AS A SENTENCE CAN HOLD IT. A string is the ordinary case and
  // needs nothing from the consumer; a number is a real label too (a count, a
  // year), and `String()` is what the DOM would have rendered anyway.
  const text =
    name ??
    (typeof children === 'string' || typeof children === 'number'
      ? String(children)
      : undefined);

  // A LIST OF BUTTONS ALL CALLED "REMOVE" is a list nobody can navigate: a
  // screen reader user tabbing through eight of them is told the same word
  // eight times, and the one they want is identified only by the order they
  // cannot see. axe cannot flag it — every button HAS a name — so this warning
  // is the only protection, the same shape as `Badge`'s icon-only guard.
  useDevWarning(
    text === undefined,
    'Tag: the remove control is named from the tag’s text, and these children are not a string — pass `name` so it reads "Remove <value>" rather than "Remove".',
  );

  return (
    <li className={cn(styles.tag, className)} {...rest}>
      {children}
      <Button
        variant="ghost"
        size="sm"
        // THE GLYPH THROUGH `icon` AND NO CHILDREN, which is how this Button
        // recognises an icon-only control: it goes square (`aspect-square`,
        // no horizontal padding) and stops hiding the icon from the
        // accessibility tree, since with no text the icon is all there is.
        icon={<RemoveGlyph />}
        aria-label={
          text === undefined ? t('removeUnnamed') : t('remove', { name: text })
        }
        onClick={() => onRemove()}
        className={styles.remove}
        // The hook `TagList` reads to put the focus somewhere when this button
        // destroys itself. An attribute rather than a context: the list has to
        // find these in DOM ORDER after one of them is gone, which is a
        // question about the document, not about React's tree.
        data-tag-remove=""
      />
    </li>
  );
}

export { Tag };
