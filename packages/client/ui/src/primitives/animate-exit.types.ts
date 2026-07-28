/** Options for `animateExit`. */
export interface AnimateExitOptions {
  /** WAAPI keyframes. Default: fade + subtle scale (mirrors `fm-scale-out`). */
  keyframes?: Keyframe[];
  /** Duration token read from the element (default `--fm-duration-m`). */
  durationVar?: `--fm-duration-${string}`;
  /** Easing token read from the element (default `--fm-ease-exit`). */
  easeVar?: `--fm-ease-${string}`;
}
