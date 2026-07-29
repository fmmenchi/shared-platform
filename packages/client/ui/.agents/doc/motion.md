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
  transition can run, and `@starting-style` isn't Baseline Widely available until ~2027 — so exits
  go through the `animateExit` primitive (WAAPI, token-driven, reduced-motion-aware, cancel-safe:
  always `await` it before `close()`/unmount). It is PUBLIC API (exported from the barrel, for
  consumer overlays too) with token-KEY options, never CSS var names:
  `animateExit(el, { preset: 'scale' | 'fade', duration: 'xs'|'s'|'m'|'l', ease: 'standard'|'enter'|'exit'|'linear', keyframes? })`.
  When the platform catches up, it retires (major, with a migration note).
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
