import { createContext, useContext, useMemo, useRef } from 'react';
import type {
  TooltipCoordination,
  TooltipProviderProps,
} from './tooltip.context.types.js';

/**
 * Alone, a tooltip knows nothing of its neighbours: it waits its full delay
 * every time and closes only when it is told to. That is the correct default
 * and the reason this context exists rather than a module-level singleton — two
 * independent toolbars on a page are not one another's business.
 */
const TooltipContext = createContext<TooltipCoordination>({
  skipsDelay: () => false,
  claim: () => undefined,
  release: () => undefined,
});

/**
 * Makes the tooltips inside it behave as one set.
 *
 *     <TooltipProvider>
 *       <Tooltip content="Bold"><Button>B</Button></Tooltip>
 *       <Tooltip content="Italic"><Button>I</Button></Tooltip>
 *     </TooltipProvider>
 *
 * Two things, and they are the same thing seen twice — a tooltip is a reading
 * of ONE control:
 *
 * - **the second one is instant.** Having waited out `openDelay` once, the user
 *   has said they are reading labels; making them wait again for the button next
 *   door is the delay outliving its reason. `skipDelay` is how long that lasts.
 * - **only one is open at a time.** Without this, moving quickly along a row
 *   opens the next tooltip while the previous is still inside its `closeDelay`,
 *   and two labels sit on screen describing different buttons.
 *
 * It holds refs and no state, so a tooltip opening never re-renders the others.
 */
function TooltipProvider(props: TooltipProviderProps) {
  const { children, skipDelay = 300 } = props;

  const openTooltip = useRef<(() => void) | null>(null);
  const closedAt = useRef(0);

  const coordination = useMemo<TooltipCoordination>(
    () => ({
      // Two ways to be inside the window, and the first is the one that makes a
      // toolbar feel right: while a tooltip in this set is STILL OPEN, the
      // pointer moving to the next button is not a new decision to read labels
      // — it is the same one. The second covers the gap left by `closeDelay`,
      // and by the moment of hesitation between two buttons.
      skipsDelay: () =>
        skipDelay > 0 &&
        (openTooltip.current !== null ||
          Date.now() - closedAt.current <= skipDelay),

      claim: (close) => {
        if (openTooltip.current && openTooltip.current !== close) {
          openTooltip.current();
        }
        openTooltip.current = close;
      },

      // Only the tooltip that actually held the slot starts the window —
      // otherwise every tooltip on the page would stamp it while mounting, and
      // the first one you hovered would open with no delay at all.
      release: (close) => {
        if (openTooltip.current !== close) return;
        openTooltip.current = null;
        closedAt.current = Date.now();
      },
    }),
    [skipDelay],
  );

  return (
    <TooltipContext.Provider value={coordination}>
      {children}
    </TooltipContext.Provider>
  );
}

/** What this tooltip owes, and is owed by, the others in its provider. */
function useTooltipCoordination(): TooltipCoordination {
  return useContext(TooltipContext);
}

export { TooltipProvider, useTooltipCoordination };
