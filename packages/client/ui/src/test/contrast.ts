/*
 * Non-text contrast measurement for the controls WE draw, shared because two
 * components now assert it (Switch's knob-against-track, Slider's
 * fill-against-groove) and the workspace rule is that two consumers is when a
 * copy moves. Nothing else in the package can see this contrast: a knob or a
 * fill is neither text nor a border, so axe passes a control whose two parts
 * are indistinguishable — for a drawn control, that contrast IS the state.
 */

/**
 * Every colour function in a computed value, in order — whatever notation it
 * is in. The tokens are authored in `oklch()` and Chromium serialises them
 * back as `oklch()`, so a regex looking for `rgb(` finds a gradient's
 * transparent stop instead and every number after that is fiction. Measured:
 * it made a Switch assertion read 2.46 for a pair that is actually well clear
 * of the bar.
 */
export function colours(value: string): string[] {
  return (
    value.match(/(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)/g) ?? []
  );
}

/** The first of them — the one a single-colour assertion wants. */
export function firstColour(value: string): string | undefined {
  return colours(value)[0];
}

/**
 * CSS colour → sRGB, by painting it. Anything else means reimplementing
 * `oklch()` conversion in the test, which is how a test starts asserting its
 * own arithmetic instead of the browser's; this asks the same engine that
 * renders the control what it actually drew.
 */
function toRgb(colour: string): [number, number, number] {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('no 2d context');
  ctx.fillStyle = '#000';
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** WCAG relative luminance, then the 1.4.11 ratio. Sorted, so order is free. */
export function contrast(a: string, b: string): number {
  const luminance = (colour: string) => {
    const channel = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const [r, g, b] = toRgb(colour);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const [light = 0, dark = 0] = [luminance(a), luminance(b)].sort(
    (x, y) => y - x,
  );
  return (light + 0.05) / (dark + 0.05);
}
