import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { FieldsetContent } from './fieldset-content.component.js';
import { Fieldset } from '../fieldset/fieldset.component.js';
import { FieldsetLegend } from '../fieldset-legend/fieldset-legend.component.js';
import { renderUi } from '../../test/render.js';

const inFieldset = (orientation?: 'vertical' | 'horizontal') =>
  renderUi(
    <Fieldset>
      <FieldsetLegend>Channels</FieldsetLegend>
      <FieldsetContent orientation={orientation}>
        <label>
          <input type="checkbox" name="ch" value="email" /> Email
        </label>
        <label>
          <input type="checkbox" name="ch" value="sms" /> SMS
        </label>
      </FieldsetContent>
    </Fieldset>,
  );

const contentOf = () =>
  screen.getAllByRole('checkbox')[0].closest('div') as HTMLElement;

describe('FieldsetContent', () => {
  it('stacks the controls by default', () => {
    inFieldset();
    expect(getComputedStyle(contentOf()).display).toBe('grid');
  });

  it('lays them out as a wrapping row when horizontal', () => {
    inFieldset('horizontal');
    const style = getComputedStyle(contentOf());
    expect(style.display).toBe('flex');
    expect(style.flexWrap).toBe('wrap');
  });

  it('shrinks with its container instead of stretching it', () => {
    renderUi(
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          inlineSize: '400px',
        }}
      >
        <Fieldset>
          <FieldsetLegend>Channels</FieldsetLegend>
          <FieldsetContent>
            <label>
              <span style={{ whiteSpace: 'nowrap' }}>
                A line that cannot wrap and is far wider than its track
              </span>
              <input type="checkbox" name="a" />
            </label>
          </FieldsetContent>
        </Fieldset>
        <Fieldset>
          <FieldsetLegend>Other</FieldsetLegend>
          <FieldsetContent>
            <label>
              <input type="checkbox" name="b" /> B
            </label>
          </FieldsetContent>
        </Fieldset>
      </div>,
    );
    // Each 1fr track is 200px. Without `min-inline-size: 0` the unwrappable line
    // would stretch this box past its track and paint over the neighbour.
    for (const box of screen.getAllByRole('checkbox')) {
      const content = box.closest('div') as HTMLElement;
      expect(content.getBoundingClientRect().width).toBeLessThanOrEqual(200);
    }
  });

  it('forwards ref to the wrapper element', () => {
    let el: HTMLElement | null = null;
    renderUi(
      <Fieldset>
        <FieldsetLegend>Channels</FieldsetLegend>
        <FieldsetContent
          ref={(node) => {
            el = node;
          }}
        />
      </Fieldset>,
    );
    expect(el).toBeInstanceOf(HTMLDivElement);
  });
});
