# Motion — agent rules

The doctrine behind every animation in the DS (decision: ADR-0009 — CSS-first, no motion runtime).

- **CSS first, tokens always.** Animations are CSS transitions/keyframes paired with the motion
  tokens: duration by SURFACE SIZE (`--fm-duration-xs` micro-feedback → `l` large surfaces), ease by
  DIRECTION (`--fm-ease-enter` decelerates in, `exit` accelerates out, `standard` between visible
  points, `linear` continuous), or a `--fm-transition-*` composite. Raw values are lint-banned
  (declarations AND `@apply duration-<n>`/`delay-<n>`; Tailwind's stock `animate-*` presets are
  reset in the bridge).
- **Shared keyframes come from `@fmmenchi/tokens/styles/motion.css`** (`fm-fade-in/out`,
  `fm-scale-in/out`, `fm-slide-up-in`, `fm-spin`) — `@import` it FIRST in the component's
  `.module.css` (Vite inlines it per subpath, the component stays self-contained). Don't redeclare
  local keyframes for a shape that exists there.
- **Reduced motion: kill the movement, keep the change.** `prefers-reduced-motion` disables the
  TRANSFORM-bearing animations (movement is the vestibular trigger); pure opacity fades may stay.
  Every transform animation ships its `@media (prefers-reduced-motion: reduce)` override.
- **Exits are the one JS case.** A closing `<dialog>`/popover hits `display: none` before a CSS
  transition can run. Measured in all three engines: `transition-behavior: allow-discrete` reports
  as supported everywhere and actually runs the exit in **Chromium alone** — Gecko and WebKit jump
  straight to `0/none`, no frames. So exits go through the `animateExit` primitive (WAAPI,
  token-driven, reduced-motion-aware, cancel-safe: always `await` it before `close()`/unmount). It
  is PUBLIC API (exported from the barrel, for consumer overlays too) with token-KEY options, never
  CSS var names:
  `animateExit(el, { preset: 'scale' | 'fade', duration: 'xs'|'s'|'m'|'l', ease: 'standard'|'enter'|'exit'|'linear', keyframes?, pseudoElement? })`.
  `pseudoElement: '::backdrop'` fades a modal's scrim with it — animatable in all three engines, and
  a modal that fades while its scrim vanishes on the first frame reads as broken.
  When the platform catches up, it retires (major, with a migration note).
- **Only the Dialog can have an exit, and that is the platform's decision.** An exit has to DELAY the
  close, which means intercepting it. Measured in all three engines: a `<dialog>`'s `cancel` is
  cancelable and covers `Escape` and the `closedby="any"` backdrop click, and the invoker `command`
  event is cancelable too — so `DialogClose` keeps working declaratively before hydration and simply
  closes at once there. A popover's `beforetoggle` in the CLOSING direction is **`cancelable: false`**
  and vetoing it does nothing, so `Menu` and `Popover` cannot animate their way out at all. Do not
  try; measure again when the engines change.
- **Springs exist — in CSS.** `--fm-ease-spring` (subtle overshoot, the workhorse) and
  `--fm-ease-bounce` (playful — success moments only) are real damped-spring physics via
  `linear()` (Baseline Widely). Pair them with `--fm-duration-m`/`-l`; never bounce a
  micro-interaction.
- **`@starting-style` + `allow-discrete` are APPROVED as progressive enhancement** (ADR-0010):
  entry/exit in pure CSS where supported, instant otherwise — mark the usage with the justified
  `use-baseline` disable comment. First consumer: the Dialog. `animateExit` remains the
  guaranteed-everywhere exit until Widely (~2027).
- **No motion runtime — ever.** framer-motion & co. are app concerns: the DS ships zero animation
  JS beyond `animateExit`. View Transitions / scroll-driven animations are watchlisted (not
  Baseline Widely).
