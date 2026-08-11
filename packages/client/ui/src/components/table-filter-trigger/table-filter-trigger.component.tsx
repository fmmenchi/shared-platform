import { useRef, useState } from 'react';
import { useMessages } from '../../i18n/provider.js';
import { cn } from '../../util/cn.js';
import { Button } from '../button/button.component.js';
import { Input } from '../input/input.component.js';
import { Popover } from '../popover/popover.component.js';
import { PopoverContent } from '../popover-content/popover-content.component.js';
import { PopoverHeading } from '../popover-heading/popover-heading.component.js';
import { PopoverTrigger } from '../popover-trigger/popover-trigger.component.js';
import { FilterGlyph } from './filter-glyph.component.js';
import { tableFilterTriggerMessages } from './table-filter-trigger.messages.js';
import type { TableFilterTriggerProps } from './table-filter-trigger.types.js';
import styles from './table-filter-trigger.module.css';

/**
 * One column's filter: a control in the header, and an editor that exists only
 * while it is open.
 *
 * A POPOVER RATHER THAN AN INPUT IN THE HEADER, and the difference is what it
 * costs when nobody is filtering. A permanent box is a tab stop on every
 * filterable column, always, plus a row of chrome above the data; the trigger is
 * one stop, and what it opens lasts as long as the reader is editing.
 *
 * IT APPLIES, IT DOES NOT FILTER AS YOU TYPE. The draft lives here until Apply
 * — or until Enter, because the editor is a real `<form>` and that is what a
 * form does. Filtering on every keystroke deletes rows under a reader
 * continuously, which is the silent change sorting had at a higher rate, and it
 * leaves the live region nothing discrete to announce. Closing without applying
 * discards, and so does `Escape`; the draft is reseeded from the applied value
 * every time it opens, so nothing stale leaks into the next visit.
 *
 * THE STATE IS IN THE NAME. "Filter City, currently Milano" — not a tinted
 * funnel, which is a state carried by colour alone. The value drawn beside the
 * glyph is then a convenience rather than the only channel, and it may truncate
 * without anything being lost.
 */
function TableFilterTrigger({
  label,
  value,
  onApply,
  className,
  ...rest
}: TableFilterTriggerProps) {
  const t = useMessages(tableFilterTriggerMessages);
  const field = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  // Seeded WHERE IT OPENS rather than in an effect: opening is already an
  // event, and an effect keyed on `open` would also run when the applied value
  // changed under an open editor — throwing away what was being typed.
  const [draft, setDraft] = useState(value);

  const applied = value.trim() !== '';

  const commit = (next: string) => {
    onApply(next);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) return;
        setDraft(value);
        // The surface carries `autofocus`, so the platform focuses the DIALOG
        // and a reader who came here to type would have to Tab first. `toggle`
        // fires after the popover has been shown and focused, which is why this
        // can simply take the focus rather than race for it. `select()` and not
        // `focus()`: arriving on an applied filter, the first keystroke should
        // replace the value, not append to it.
        field.current?.select();
      }}
    >
      <PopoverTrigger
        {...rest}
        variant="ghost"
        size="sm"
        className={cn(styles.trigger, className)}
        // The whole state, in words. `aria-label` and not a hidden span,
        // because the visible value beside it is `aria-hidden` — one channel
        // for the eye, one for the name, never the same words twice.
        aria-label={
          applied
            ? t('activeName', { column: label, value })
            : t('name', { column: label })
        }
      >
        <FilterGlyph active={applied} />
        {applied && (
          <span className={styles.value} aria-hidden="true">
            {value}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent className={styles.surface}>
        {/* Names the surface by registering itself — the part exists for that.
            Visible, because a popover with a form in it and no title is a box
            of controls with no subject. */}
        <PopoverHeading className={styles.heading}>
          {t('heading', { column: label })}
        </PopoverHeading>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            commit(draft);
          }}
        >
          <Input
            ref={field}
            // Named by the COLUMN, not by "Filter": the heading above already
            // said the verb, and a field called "Filter" inside "Filter City"
            // says the same word twice and the useful one never.
            aria-label={label}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className={styles.actions}>
            <Button type="submit" size="sm">
              {t('apply')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              // Clearing is an APPLY OF NOTHING, not a second mode — same path,
              // same announcement, and the toolbar's "clear all" is the same
              // move at table scale.
              onClick={() => commit('')}
              disabled={!applied && draft === ''}
            >
              {t('clear')}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export { TableFilterTrigger };
