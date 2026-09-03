import { describe, it, expect, vi, afterEach } from 'vitest';
import { useRef, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Tag } from './tag.component.js';
import { TagList } from '../tag-list/tag-list.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const CITIES = ['Milano', 'Torino', 'Napoli'];

/**
 * A list whose removals are REAL — the app drops the value and the tag stops
 * being rendered, which is the only way the focus question this component
 * exists to answer can be asked at all. A mock `onRemove` leaves every tag
 * standing, and every focus assertion under it would be measuring nothing.
 */
function Cities({
  initial = CITIES,
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

/** The spy has to come back, or every later test runs with warnings swallowed. */
afterEach(() => {
  vi.restoreAllMocks();
});

const spyOnWarn = () =>
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);

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

    it('says it is a list even though the markers are gone', () => {
      // WebKit drops list semantics from a `list-style: none` list, so the
      // count — the whole justification for the `<ul>`/`<li>` shape — is never
      // announced in Safari without this. Chromium keeps it either way, which
      // is precisely why the attribute cannot be left to the browser: no test
      // in this suite could see its absence. `Pagination` writes it too.
      render(<Cities />);

      expect(
        screen.getByRole('list', { name: 'Selected cities' }),
      ).toHaveAttribute('role', 'list');
    });

    it('names its remove control with the tag’s own words', () => {
      render(<Cities />);

      // NOT "Remove", three times. A screen reader user tabbing through a list
      // of identical names has only the order — which they cannot see — to tell
      // them which one they are on.
      for (const city of CITIES) {
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

    it('does not turn the ✕ into a spinner when the removal is async', async () => {
      // `Button` runs its own pending state when `onClick` RETURNS a thenable,
      // and an expression-body arrow returns whatever `onRemove` returned — so
      // the idiomatic `async () => { await api.delete(id) }` blocked the control
      // and announced "Loading" until it settled. The tag is going; there is
      // nothing to wait for.
      render(
        <TagList label="Selected cities">
          <Tag onRemove={async () => Promise.resolve()}>Milano</Tag>
        </TagList>,
      );

      const control = removeControl('Milano');
      await browser.click(control);

      expect(control).not.toHaveAttribute('aria-disabled', 'true');
      expect(control).not.toHaveAttribute('aria-busy', 'true');
    });

    it('honours `hidden`, which its own props advertise', () => {
      // The UA implements `hidden` with `display: none`, and ANY author
      // `display` beats it — including this component's `inline-flex`. It
      // matters because "show five, collapse the rest" is the canonical
      // overflow pattern for a row of tags and is implemented by setting
      // `hidden` on the ones that do not fit.
      render(
        <TagList label="Selected cities">
          <Tag hidden onRemove={() => undefined}>
            Milano
          </Tag>
        </TagList>,
      );

      const tag = screen.getByText('Milano').closest('li') as HTMLElement;
      expect(getComputedStyle(tag).display).toBe('none');
    });

    it('warns when it is used outside a list', () => {
      // An `<li>` with no list around it is markup nothing maps to a list item,
      // and the ✕ then has no `TagList` to catch the focus it destroys.
      const warn = spyOnWarn();

      render(<Tag onRemove={() => undefined}>Milano</Tag>);

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('used outside a <TagList>'),
      );
    });
  });

  describe('the name of the remove control', () => {
    it('takes `name` over the children, for children that are not words', () => {
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

    it('reads interpolated text, which is not one string', () => {
      // `{count} results` arrives as an ARRAY of a number and a string — the
      // most ordinary markup there is, and the case a `typeof === 'string'`
      // check drops into the unnamed branch while demanding a `name` for
      // children that are entirely plain text.
      const count = 2;
      render(
        <TagList>
          <Tag onRemove={() => undefined}>{count} results</Tag>
        </TagList>,
      );

      expect(removeControl('2 results')).toBeInTheDocument();
    });

    it('reads a number as the label it is', () => {
      render(
        <TagList>
          <Tag onRemove={() => undefined}>{2026}</Tag>
        </TagList>,
      );

      expect(removeControl('2026')).toBeInTheDocument();
    });

    it('treats a blank `name` as no name at all', () => {
      // A consumer's `name={value ?? ''}` would otherwise ship "Remove " — the
      // sentence trailing off that the two-message catalogue exists to prevent —
      // AND silence the warning written to catch exactly that.
      const warn = spyOnWarn();

      render(
        <TagList>
          <Tag name="  " onRemove={() => undefined}>
            <span>Ada</span>
          </Tag>
        </TagList>,
      );

      expect(
        screen.getByRole('button', { name: 'Remove' }),
      ).toBeInTheDocument();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('pass `name`'));
    });

    it('falls back to a complete sentence, and warns, when it has no words', () => {
      const warn = spyOnWarn();

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

    it('recovers even when the state lives BELOW the list', async () => {
      // A legal composition — `Tag` renders the `<li>`, so a wrapper adds no
      // DOM — and one that re-renders only the wrapper. The first version hung
      // the rescue on the list's own render and silently did nothing here.
      function Inner() {
        const [cities, setCities] = useState(CITIES);
        return (
          <>
            {cities.map((city) => (
              <Tag
                key={city}
                onRemove={() =>
                  setCities((rest) => rest.filter((c) => c !== city))
                }
              >
                {city}
              </Tag>
            ))}
          </>
        );
      }

      render(
        <TagList label="Selected cities">
          <Inner />
        </TagList>,
      );

      await browser.click(removeControl('Torino'));

      await waitFor(() =>
        expect(document.activeElement).toBe(removeControl('Napoli')),
      );
    });

    it('does not move a focus that was never inside it', async () => {
      // SAFARI, faithfully: a pressed button there does not take the focus, so
      // after a mouse click the reader's focus is still wherever they left it.
      // Reproduced by activating the control WITHOUT focusing it.
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

    it('does not drag the focus off ANOTHER tag the reader chose', async () => {
      // The same Safari case, one scope narrower: asking only whether the focus
      // was somewhere in the list let a click on one ✕ take the focus off a
      // different tag's control — one nobody was removing.
      render(<Cities />);

      removeControl('Milano').focus();
      removeControl('Napoli').click();

      await waitFor(() =>
        expect(screen.queryByText('Napoli')).not.toBeInTheDocument(),
      );
      expect(document.activeElement).toBe(removeControl('Milano'));
    });

    it('does not chase a reader who moved while the removal was in flight', async () => {
      // A deferred removal — the network round trip the page invites. Between
      // the click and the removal the reader went somewhere else, and the focus
      // there is theirs.
      let apply = () => undefined as void;
      function Deferred() {
        const [cities, setCities] = useState(CITIES);
        return (
          <TagList label="Selected cities">
            {cities.map((city) => (
              <Tag
                key={city}
                onRemove={() => {
                  apply = () =>
                    setCities((rest) => rest.filter((c) => c !== city));
                }}
              >
                {city}
              </Tag>
            ))}
          </TagList>
        );
      }

      render(
        <>
          <button type="button">Elsewhere</button>
          <Deferred />
        </>,
      );

      await browser.click(removeControl('Torino'));
      const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
      elsewhere.focus();
      apply();

      await waitFor(() =>
        expect(screen.queryByText('Torino')).not.toBeInTheDocument(),
      );
      expect(document.activeElement).toBe(elsewhere);
    });

    it('never jumps on a refusal, even after the list re-renders', async () => {
      // The app may refuse. The recovery reads the DOM rather than trusting the
      // click — and this re-renders the list afterwards, so a rescue tied to a
      // render (rather than to the tag actually going) would fire here.
      function Refusing() {
        const [, bump] = useState(0);
        return (
          <TagList label="Selected cities">
            <Tag onRemove={() => bump((n) => n + 1)}>Milano</Tag>
            <Tag onRemove={() => bump((n) => n + 1)}>Torino</Tag>
          </TagList>
        );
      }

      render(<Refusing />);
      const control = removeControl('Milano');
      await browser.click(control);

      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(document.activeElement).toBe(control);
    });

    it('leaves a nested list’s removals to the nested list', async () => {
      // Two lists, one click: the outer must not compute a position over the
      // union of both sets of controls and then act on it.
      function Nested() {
        const [sizes, setSizes] = useState(['S', 'M']);
        return (
          <TagList label="Facets">
            <Tag onRemove={() => undefined}>Colour</Tag>
            <li>
              <TagList label="Sizes">
                {sizes.map((size) => (
                  <Tag
                    key={size}
                    onRemove={() =>
                      setSizes((rest) => rest.filter((s) => s !== size))
                    }
                  >
                    {size}
                  </Tag>
                ))}
              </TagList>
            </li>
          </TagList>
        );
      }

      render(<Nested />);
      await browser.click(removeControl('S'));

      await waitFor(() =>
        expect(screen.queryByText('S')).not.toBeInTheDocument(),
      );
      // The inner list's own choice, not the outer's reading of a merged order.
      expect(document.activeElement).toBe(removeControl('M'));
    });
  });

  describe('TagList’s own contract', () => {
    it('lets a consumer outrank the name and the tab stop', () => {
      // Both are written BEFORE the spread, which is the package's rule for a
      // default a consumer must be able to beat.
      render(
        <TagList label="Ours" aria-label="Theirs" tabIndex={0}>
          <Tag onRemove={() => undefined}>Milano</Tag>
        </TagList>,
      );

      const list = screen.getByRole('list', { name: 'Theirs' });
      expect(list).toHaveAttribute('tabindex', '0');
    });

    it('keeps the consumer’s class and their ref and their click', async () => {
      const clicked = vi.fn();
      function Consumer() {
        const mine = useRef<HTMLUListElement>(null);
        return (
          <TagList
            ref={mine}
            className="mine"
            label="Selected cities"
            onClick={() => clicked(mine.current?.tagName)}
          >
            <Tag onRemove={() => undefined}>Milano</Tag>
          </TagList>
        );
      }

      render(<Consumer />);
      const list = screen.getByRole('list', { name: 'Selected cities' });
      expect(list.classList.contains('mine')).toBe(true);

      await browser.click(removeControl('Milano'));
      // The ref was populated (the merge did not drop it) and the consumer's
      // own handler still ran on a click the component also uses.
      expect(clicked).toHaveBeenCalledWith('UL');
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
