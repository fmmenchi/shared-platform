import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardCover } from './card-cover.component.js';
import { Card } from '../card/card.component.js';

const COVER =
  "data:image/svg+xml,%%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%%3E%%3Crect width='16' height='9'/%%3E%%3C/svg%%3E";

describe('CardCover', () => {
  it('IS the media element, not a box around one', () => {
    const { container } = render(<CardCover src={COVER} alt="" />);

    // The first version rendered a wrapper `<div>` holding the consumer's
    // image — two elements where the styling only ever needed one. Every
    // element is somewhere a defect can live, so the one that carries nothing
    // does not get to exist.
    expect(container.firstElementChild?.tagName).toBe('IMG');
  });

  it('reaches the card\u2019s edges while its siblings stay inset', () => {
    render(
      <Card>
        <CardCover src={COVER} alt="" />
        <p>Inset</p>
      </Card>,
    );

    const card = screen.getByText('Inset').parentElement as HTMLElement;
    const media = card.firstElementChild as HTMLElement;
    const text = screen.getByText('Inset');

    // GEOMETRY, not a class name. The media cancels exactly the card's padding
    // \u2014 it names the same token the card pads with \u2014 so it reaches the card's
    // border, while the paragraph beside it stays a whole inset away.
    const cardLeft = card.getBoundingClientRect().left;
    // The 1px is the card's border: the media fills the padding box, which is
    // what "the edges" means for a bordered box.
    expect(media.getBoundingClientRect().left - cardLeft).toBeLessThanOrEqual(
      1,
    );
    expect(text.getBoundingClientRect().left - cardLeft).toBeGreaterThan(8);
  });

  it('crops to a shape instead of letting the file set one', () => {
    const { container } = render(
      <CardCover src={COVER} alt="" ratio="1 / 1" />,
    );

    const box = (
      container.firstElementChild as HTMLElement
    ).getBoundingClientRect();
    // A grid of cards whose pictures each keep their own proportions is a grid
    // that never lines up, so the shape is the card's and the file is cropped
    // into it.
    expect(box.height).toBeCloseTo(box.width, 0);
  });

  it('wraps, when `as` asks for an element that needs to', () => {
    const { container } = render(
      <CardCover as="picture">
        <img src={COVER} alt="" />
      </CardCover>,
    );

    // `<picture>` and `<video>` are the cases a wrapper is genuinely for, and
    // the stylesheet fills the image inside them.
    expect(container.firstElementChild?.tagName).toBe('PICTURE');
    expect(container.querySelector('picture > img')).not.toBeNull();
  });
});
