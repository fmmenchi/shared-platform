import {
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react';

/**
 * Read token VALUES the only way a page is allowed to: from the DOM, in the
 * theme that is on screen.
 *
 * The alternative is importing values from TypeScript, and the contract does
 * not offer that on purpose — `@fmmenchi/tokens` exports the ROLES, while the
 * values live in `styles/vars.css` where a preset can override them. A page
 * holding its own copy would document the reference theme and quietly keep
 * showing it after a rebrand.
 */

const THEME_ATTRIBUTE = 'data-theme';

function subscribeToTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [THEME_ATTRIBUTE],
  });
  return () => observer.disconnect();
}

const readTheme = (): string =>
  document.documentElement.getAttribute(THEME_ATTRIBUTE) ?? 'light';

/**
 * The active preset name, as an attribute on the preview root.
 *
 * Storybook's Theme toolbar sets it there (see `.storybook/preview.tsx`), so
 * observing the attribute is what makes these pages follow the toggle instead
 * of freezing on whichever theme happened to be up when they mounted.
 */
export function useThemeName(): string {
  return useSyncExternalStore(subscribeToTheme, readTheme, () => 'light');
}

/**
 * The computed value of each custom property, resolved against a real element.
 *
 * Against an ELEMENT rather than `document.documentElement`, so a specimen
 * placed inside a themed subtree reads that subtree's values — the root is
 * merely where Storybook happens to put the attribute today.
 *
 * `properties` must be a stable reference (module scope, or memoised): it is an
 * effect dependency, and a fresh array each render would re-read forever.
 */
export function useTokenValues(properties: readonly string[]): {
  ref: RefObject<HTMLDivElement | null>;
  values: Record<string, string>;
} {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeName();
  const [values, setValues] = useState<Record<string, string>>({});

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const computed = getComputedStyle(element);
    setValues(
      Object.fromEntries(
        properties.map((property) => [
          property,
          computed.getPropertyValue(property).trim(),
        ]),
      ),
    );
    // `theme` is not read in here, and that is the point: it is what tells the
    // effect the values it read a moment ago are now the wrong theme's.
  }, [properties, theme]);

  return { ref, values };
}
