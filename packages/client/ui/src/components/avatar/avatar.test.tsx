import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar } from './avatar.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

// A 1×1 PNG the browser decodes without the network — tests must not depend
// on a fetch that vitest's browser sandbox may block.
const GOOD_SRC =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const BROKEN_SRC = 'data:image/png;base64,not-an-image';

const getImg = (container: HTMLElement) => container.querySelector('img');

describe('Avatar', () => {
  it('is ONE accessible node: a span with role img named by `name`', () => {
    const { container } = render(<Avatar name="Ada Lovelace" src={GOOD_SRC} />);
    const avatar = screen.getByRole('img', { name: 'Ada Lovelace' });
    expect(avatar.tagName).toBe('SPAN');
    // The inner <img> is not a second node in the tree: alt="" removes it.
    expect(getImg(container)).toHaveAttribute('alt', '');
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  it('is decorative without a name — hidden from the a11y tree entirely', () => {
    const { container } = render(<Avatar src={GOOD_SRC} />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root).not.toHaveAttribute('role');
    // `hidden: true` searches even aria-hidden subtrees; nothing has the role.
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
  });

  it('treats a whitespace-only name as absent', () => {
    const { container } = render(<Avatar name="   " />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root).not.toHaveAttribute('role');
    // No initials to derive either: the root stays :empty (the CSS silhouette
    // hangs off exactly that fact).
    expect(root).toBeEmptyDOMElement();
  });

  it("lets a consumer's own aria-label override ours", () => {
    render(<Avatar name="Ada Lovelace" aria-label="Your profile" />);
    expect(
      screen.getByRole('img', { name: 'Your profile' }),
    ).toBeInTheDocument();
  });

  it('counts a consumer aria-label WITHOUT a name as naming it', () => {
    // Keying the role off `name` alone would ship this label on a role-less,
    // aria-hidden span — advertised as working, dead in the a11y tree.
    const { container } = render(
      <Avatar src={GOOD_SRC} aria-label="Your profile" />,
    );
    expect(
      screen.getByRole('img', { name: 'Your profile' }),
    ).toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveAttribute('aria-hidden');
  });

  it('counts a consumer aria-labelledby without a name as naming it', () => {
    render(
      <>
        <span id="who">Ada Lovelace</span>
        <Avatar aria-labelledby="who" />
      </>,
    );
    expect(
      screen.getByRole('img', { name: 'Ada Lovelace' }),
    ).toBeInTheDocument();
  });

  it('names a wrapping control: accname recurses into role="img"', () => {
    // The documented pattern for a clickable avatar — the avatar's label must
    // surface as the button's name, or the control ships nameless.
    render(
      <button type="button">
        <Avatar name="Ada Lovelace" src={GOOD_SRC} />
      </button>,
    );
    expect(
      screen.getByRole('button', { name: 'Ada Lovelace' }),
    ).toBeInTheDocument();
  });

  describe('initials fallback', () => {
    it('derives initials from first + last word when there is no src', () => {
      render(<Avatar name="Ada Lovelace" />);
      expect(screen.getByRole('img')).toHaveTextContent('AL');
    });

    it('takes two graphemes of a single word, non-Latin included', () => {
      render(<Avatar name="Plato" />);
      render(<Avatar name="李小龙" />);
      // Both mounts share the document — the name scopes each query.
      expect(screen.getByRole('img', { name: 'Plato' })).toHaveTextContent(
        'Pl',
      );
      expect(screen.getByRole('img', { name: '李小龙' })).toHaveTextContent(
        '李小',
      );
    });

    it('never renders half a surrogate pair', () => {
      render(<Avatar name="𝔄da 𝔏ovelace" />);
      expect(screen.getByRole('img')).toHaveTextContent('𝔄𝔏');
    });
  });

  describe('image failure', () => {
    it('swaps the failed image for the initials', () => {
      const { container } = render(
        <Avatar name="Ada Lovelace" src={BROKEN_SRC} />,
      );
      // The real <img> is in the HTML from the first render (no preloader).
      const img = getImg(container);
      expect(img).toHaveAttribute('src', BROKEN_SRC);
      fireEvent.error(img as HTMLImageElement);
      expect(getImg(container)).not.toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveTextContent('AL');
    });

    it('falls back on a real browser failure too, no synthetic event', async () => {
      const { container } = render(
        <Avatar name="Ada Lovelace" src={BROKEN_SRC} />,
      );
      // Chromium decodes the bad data URI and fires `error` on its own.
      await expect.poll(() => getImg(container)).toBeNull();
      expect(screen.getByRole('img')).toHaveTextContent('AL');
    });

    it('a changed src resets the failure and tries the image again', () => {
      const { container, rerender } = render(
        <Avatar name="Ada Lovelace" src={BROKEN_SRC} />,
      );
      fireEvent.error(getImg(container) as HTMLImageElement);
      expect(getImg(container)).not.toBeInTheDocument();
      rerender(<Avatar name="Ada Lovelace" src={GOOD_SRC} />);
      expect(getImg(container)).toHaveAttribute('src', GOOD_SRC);
    });
  });

  it('lands referrerPolicy/crossOrigin/loading on the real <img>, not the root', () => {
    const { container } = render(
      <Avatar
        name="Ada Lovelace"
        src={GOOD_SRC}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        loading="lazy"
      />,
    );
    const img = getImg(container);
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(img).toHaveAttribute('crossorigin', 'anonymous');
    expect(img).toHaveAttribute('loading', 'lazy');
    const root = container.firstElementChild;
    expect(root).not.toHaveAttribute('referrerpolicy');
    expect(root).not.toHaveAttribute('loading');
  });

  it('forwards ref to the underlying element (React 19 ref-as-prop)', () => {
    // Every component must be as reachable as the element it wraps — focus,
    // measurement, anchoring an overlay, a form lib's ref all depend on it. A
    // callback ref stays type-correct whatever element the component renders.
    let el: HTMLElement | null = null;
    render(
      <Avatar
        name="Ada Lovelace"
        ref={(node) => {
          el = node;
        }}
      />,
    );
    expect(el).toBeInstanceOf(HTMLSpanElement);
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Avatar name="Ada Lovelace" size="md" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  // axe in real Chromium — every size and both fallback shapes, in each theme.
  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`has no violations — all sizes / ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <Avatar key={size} size={size} name="Ada Lovelace" />
            ))}
            <Avatar name="Ada Lovelace" src={GOOD_SRC} />
            <Avatar />
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});
