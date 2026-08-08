import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardActions } from './card-actions.component.js';
import { Card } from '../card/card.component.js';
import { CardTitle } from '../card-title/card-title.component.js';
import { Button } from '../button/button.component.js';

describe('CardActions', () => {
  it('pins itself to the bottom, so a row of cards lines its buttons up', () => {
    render(
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <Card>
          <CardTitle level={3}>Short</CardTitle>
          <CardActions>
            <Button>A</Button>
          </CardActions>
        </Card>
        <Card>
          <CardTitle level={3}>Long</CardTitle>
          <p>
            A summary long enough to make this card taller than the one beside
            it, which is the only situation in which the rule matters at all.
          </p>
          <CardActions>
            <Button>B</Button>
          </CardActions>
        </Card>
      </div>,
    );

    const a = screen.getByRole('button', { name: 'A' }).getBoundingClientRect();
    const b = screen.getByRole('button', { name: 'B' }).getBoundingClientRect();
    // `margin-block-start: auto`. Without it the short card's button sits
    // halfway up and the row reads as broken — a defect with no failing query,
    // only a measurement.
    expect(a.bottom).toBeCloseTo(b.bottom, 0);
  });
});
