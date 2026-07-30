import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldsetLegend } from './fieldset-legend.component.js';
import { Fieldset } from '../fieldset/fieldset.component.js';
import { Field } from '../field/field.component.js';
import { renderUi } from '../../test/render.js';

describe('FieldsetLegend', () => {
  afterEach(() => vi.restoreAllMocks());

  it('names the group it is in', () => {
    render(
      <Fieldset>
        <FieldsetLegend>Favourite colour</FieldsetLegend>
      </Fieldset>,
    );
    expect(
      screen.getByRole('group', { name: 'Favourite colour' }),
    ).toBeTruthy();
  });

  // The one part that fits a SINGLE container: a <legend> names a group, never a
  // field, so unlike the text parts it must reject a Field too.
  it.each([
    ['no container', <FieldsetLegend key="a">Orphan</FieldsetLegend>],
    [
      'a Field',
      <Field key="b">
        <FieldsetLegend>Orphan</FieldsetLegend>
      </Field>,
    ],
  ])('warns when used in %s', (_label, element) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(element);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('FieldsetLegend: used outside a <Fieldset>'),
    );
  });

  // The rendered legend sits over the block-start border, OUTSIDE the fieldset's
  // anonymous box, so the container's `gap` cannot reach it and its spacing is a
  // margin. Pin the two to the same number, or a rhythm change moves one only.
  it('is separated from the content by exactly the container’s gap', () => {
    renderUi(
      <Fieldset>
        <FieldsetLegend>Favourite colour</FieldsetLegend>
        <p>Content</p>
      </Fieldset>,
    );
    const group = screen.getByRole('group', { name: 'Favourite colour' });
    const legend = screen.getByText('Favourite colour');
    const content = screen.getByText('Content');
    const gap =
      content.getBoundingClientRect().top -
      legend.getBoundingClientRect().bottom;
    expect(gap).toBeCloseTo(
      Number.parseFloat(getComputedStyle(group).rowGap),
      1,
    );
  });

  it('forwards ref to the legend element', () => {
    let el: HTMLElement | null = null;
    render(
      <Fieldset>
        <FieldsetLegend
          ref={(node) => {
            el = node;
          }}
        >
          Favourite colour
        </FieldsetLegend>
      </Fieldset>,
    );
    expect(el).toBeInstanceOf(HTMLLegendElement);
  });
});
