import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Tag } from './tag.component.js';
import { TagList } from '../tag-list/tag-list.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * A list whose removals are REAL — the app drops the value and the tag stops
 * being rendered, which is the only way the focus question this component
 * exists to answer can be asked at all. A mock `onRemove` leaves every tag
 * standing, and every focus assertion under it would be measuring nothing.
 */
function Cities({
  initial = ['Milano', 'Torino', 'Napoli'],
  label = 'Selected cities',
}: {
  initial?: string[];
  label?: string;
}) {
  const [cities, setCities] = useState(initial);
  return (
    <TagList label={label}>
      {cities.map((city) => (
        <Tag
          key={city}
          onRemove={() => setCities((rest) => rest.filter((c) => c !== city))}
        >
          {city}
        </Tag>
      ))}
    </TagList>
  );
}

const removeControl = (name: string) =>
  screen.getByRole('button', { name: `Remove ${name}` });

describe('Tag', () => {
  describe('what it is', () => {
    it('is an item of a named list, not a loose row of pills', () => {
      render(<Cities />);

      // The set first: how many tags there are is what a reader needs before
      // walking them, and it is the reason this is a list rather than a div.
      const list = screen.getByRole('list', { name: 'Selected cities' });
      expect(list.tagName).toBe('UL');
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
      expect(list.contains(screen.getAllByRole('listitem')[0])).toBe(true);
    });

    it('names its remove control with the tag’s own words', () => {
      render(<Cities />);

      // NOT "Remove", three times. A screen reader user tabbing through a list
      // of identical names has only the order — which they cannot see — to tell
      // them which one they are on.
      for (const city of ['Milano', 'Torino', 'Napoli']) {
        expect(removeControl(city)).toBeInTheDocument();
      }
    });

    it('takes the value back on a click and on Enter', async () => {
      render(<Cities />);

      await browser.click(removeControl('Torino'));
      await waitFor(() =>
        expect(screen.queryByText('Torino')).not.toBeInTheDocument(),
      );

      // The remove control is a real `<button>`, so the keyboard is the
      // platform's — this asserts we have not taken that away.
      removeControl('Milano').focus();
      await browser.keyboard('{Enter}');
      await waitFor(() =>
        expect(screen.queryByText('Milano')).not.toBeInTheDocument(),
      );
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });
  });

  describe('the name of the remove control', () => {
    it('takes `name` over the children, for children that are not a string', () => {
      render(
        <TagList label="Reviewers">
          <Tag name="Ada Lovelace" onRemove={() => undefined}>
            <span aria-hidden="true">👤</span>
            Ada Lovelace
          </Tag>
        </TagList>,
      );

      expect(removeControl('Ada Lovelace')).toBeInTheDocument();
    });

    it('reads a number as the label it is', () => {
      // A count or a year is a real label, and `String()` is what the DOM would
      // have rendered anyway — this is the case a `typeof === 'string'` check
      // alone silently drops into the unnamed branch.
      render(
        <TagList>
          <Tag onRemove={() => undefined}>{2026}</Tag>
        </TagList>,
      );

      expect(removeControl('2026')).toBeInTheDocument();
    });

    it('falls back to a complete sentence, and warns, when it has no words', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      render(
        <TagList>
          <Tag onRemove={() => undefined}>
            <span>Ada</span>
          </Tag>
        </TagList>,
      );

      // "Remove", not "Remove " with the sentence trailing off — and a warning,
      // because axe cannot see this: every button HERE has a name.
      expect(
        screen.getByRole('button', { name: 'Remove' }),
      ).toBeInTheDocument();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('pass `name`'));
    });
  });

  describe('the focus a removal destroys', () => {
    it('lands on the tag that took the departing one’s place', async () => {
      render(<Cities />);

      await browser.click(removeControl('Torino'));

      // The NEXT one, so clearing a list is Enter, Enter, Enter — what a mouse
      // user does by clicking the same spot. Without this the browser drops the
      // focus to <body> and the next Tab starts the page again from the top.
      await waitFor(() =>
        expect(document.activeElement).toBe(removeControl('Napoli')),
      );
    });

    it('falls back to the new last one when the last is removed', async () => {
      render(<Cities />);

      await browser.click(removeControl('Napoli'));

      await waitFor(() =>
        expect(document.activeElement).toBe(removeControl('Torino')),
      );
    });

    it('keeps the focus in the list when the last tag goes', async () => {
      render(<Cities initial={['Milano']} />);

      await browser.click(removeControl('Milano'));

      // The list itself, not `<body>`: the reader stays where they were. A
      // consumer who unmounts the whole list on the last removal is choosing
      // where focus goes themselves, which is theirs to choose.
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole('list', { name: 'Selected cities' }),
        ),
      );
    });

    it('does not move a focus that was never inside it', async () => {
      // SAFARI, faithfully: a pressed button there does not take the focus, so
      // after a mouse click the reader's focus is still wherever they left it.
      // Moving it into this list would be stealing it. Reproduced by activating
      // the control WITHOUT focusing it, which is exactly what that engine does.
      render(
        <>
          <button type="button">Outside</button>
          <Cities />
        </>,
      );

      const outside = screen.getByRole('button', { name: 'Outside' });
      outside.focus();
      removeControl('Torino').click();

      await waitFor(() =>
        expect(screen.queryByText('Torino')).not.toBeInTheDocument(),
      );
      expect(document.activeElement).toBe(outside);
    });

    it('waits for the tag to actually go, and never jumps on a refusal', async () => {
      // An app may refuse a removal, or take a network round trip over it. The
      // recovery reads the DOM rather than trusting the click — so nothing
      // moves while the tag is still standing.
      render(
        <TagList label="Selected cities">
          <Tag onRemove={() => undefined}>Milano</Tag>
          <Tag onRemove={() => undefined}>Torino</Tag>
        </TagList>,
      );

      await browser.click(removeControl('Milano'));

      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(document.activeElement).toBe(removeControl('Milano'));
    });
  });

  describe('accessibility (axe)', () => {
    for (const { name, theme } of [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const) {
      it(`has no violations — ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <Cities />
          </div>,
          { theme },
        );

        await expectNoA11yViolations(container);
      });
    }
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(
      <TagList label="Selected cities">
        <Tag onRemove={() => undefined}>Milano</Tag>
      </TagList>,
    );

    expect(container.firstChild).toMatchSnapshot();
  });
});
