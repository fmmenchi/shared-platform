import { cn } from '../../util/cn.js';
import type { SidePanelProps } from './side-panel.types.js';
import styles from './side-panel.module.css';

/**
 * A panel beside the work, which the work keeps working behind.
 *
 *     <div style={{ display: 'grid',
 *                   gridTemplateColumns: 'repeat(auto-fit, minmax(30rem, 1fr))' }}>
 *       <section>…the thing being edited…</section>
 *       {showing ? <SidePanel label="Preview">…</SidePanel> : null}
 *     </div>
 *
 * NOT A DRAWER, and that is the whole reason it exists (ADR-0034). `Dialog`
 * with `side` is a drawer: `showModal()` traps the focus, makes the page inert,
 * draws the backdrop and locks the scroll — and that is right for a
 * confirmation, a form that must be finished or abandoned, a navigation drawer
 * on a phone where there is no "beside" at all. It is exactly wrong for a
 * filter you tune while watching the list, an inspector, a details pane, a
 * preview: those exist to answer a question about the control you are touching,
 * and a modal takes that control away at the moment the answer arrives.
 *
 * So the line is one question — IS THE CONTENT BESIDE IT STILL USABLE? — and
 * `inert` is a boolean, so there is no third answer. Yes is this component. No
 * is the drawer we already have.
 *
 * IT IS AN ORDINARY ELEMENT IN THE PAGE, which is what the drawer cannot be.
 * No top layer, no `<dialog>`, no Popover API: those exist to escape `overflow`
 * and every stacking context (ADR-0021), and a panel wants the opposite — to
 * stay in the flow and take its share of the width, so what is beside it
 * REFLOWS instead of being covered. Everything that follows is a feature: it
 * costs no focus management at all, because focus never left.
 *
 * IT HOLDS NOTHING. No open state, no close button, no side. The app decides
 * whether a panel is there, where it sits, and what closes it — a link that
 * drops a search param does that with no JavaScript, and a `SidePanelClose`
 * could only be a button calling back into the app's own state.
 */
function SidePanel(props: SidePanelProps) {
  const { label, className, children, ...rest } = props;

  return (
    <aside
      // BEFORE the spread, the way `Nav` does it and for the same reason:
      // `label` is a NAME, and a consumer with a better one — an
      // `aria-labelledby` pointing at a heading they already show — should win.
      aria-label={label}
      // FOCUSABLE BECAUSE IT SCROLLS, and axe found this rather than a person:
      // `scrollable-region-focusable`. A panel that scrolls and holds nothing
      // focusable cannot be scrolled by a keyboard AT ALL — no tab stop to land
      // on, so no element to send the arrow keys to. Nothing about it looks
      // broken, which is why it took a rule to see: the story that caught it
      // was eight cards of plain text, and every other story passed because an
      // unbounded panel does not scroll.
      //
      // Unconditional rather than measured, because the alternative is a
      // ResizeObserver deciding it per render — a behaviour layer over a
      // question CSS already answers, and ADR-0002 refuses that. The cost is
      // one tab stop on a panel that happens not to scroll; the cost of the
      // other way round is a region a keyboard cannot reach. Before the spread,
      // so `tabIndex={-1}` is still yours to pass.
      tabIndex={0}
      {...rest}
      className={cn(styles.sidePanel, className)}
    >
      {children}
    </aside>
  );
}

export { SidePanel };
