// Grapheme-aware, because `name[0]` is not a character: it is half a surrogate
// pair for anything outside the BMP ("𝔄da" would yield a lone "\uD835" box) and
// a fragment of a cluster for a ZWJ emoji or a combining mark. Segmentation is
// locale-independent at grapheme granularity, so one instance serves every
// name; `Intl` is environment-global — module scope is SSR-safe.
const graphemeSegmenter =
  'Segmenter' in Intl
    ? // eslint-disable-next-line baseline-js/use-baseline -- progressive: feature-detected; without it `firstGraphemes` iterates by CODE POINT (surrogate-safe, only ZWJ/combining clusters may split); widely ~2026-10
      new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : undefined;

function* graphemesOf(word: string): Generator<string> {
  if (graphemeSegmenter) {
    for (const { segment } of graphemeSegmenter.segment(word)) yield segment;
  } else {
    // String iteration walks code points, never splitting a surrogate pair —
    // the one failure mode this module exists to prevent.
    yield* word;
  }
}

function firstGraphemes(word: string, count: number): string {
  let out = '';
  let taken = 0;
  for (const segment of graphemesOf(word)) {
    out += segment;
    if (++taken === count) break;
  }
  return out;
}

/**
 * Initials for an avatar fallback: first grapheme of the first and last words
 * ("Ada King Lovelace" → "AL"), first two graphemes of a single word
 * ("Plato" → "Pl"), `''` for a blank name — the caller decides what an empty
 * result looks like, this function never invents a glyph.
 */
export function initialsFromName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const first = words[0];
  if (first === undefined) return '';
  const last = words[words.length - 1];
  if (words.length === 1 || last === undefined) return firstGraphemes(first, 2);
  return firstGraphemes(first, 1) + firstGraphemes(last, 1);
}
