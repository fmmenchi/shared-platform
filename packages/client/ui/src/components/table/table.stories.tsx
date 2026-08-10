import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table } from './table.component.js';
import { TableBody } from '../table-body/table-body.component.js';
import { TableCell } from '../table-cell/table-cell.component.js';
import { TableHead } from '../table-head/table-head.component.js';
import { TableHeaderCell } from '../table-header-cell/table-header-cell.component.js';
import { TableRow } from '../table-row/table-row.component.js';
import { TableFoot } from '../table-foot/table-foot.component.js';
import { useTableSort } from './use-table-sort.js';
import { useRowSelection } from './use-row-selection.js';
import { TableSelectionBar } from '../table-selection-bar/table-selection-bar.component.js';
import { ToolbarItem } from '../toolbar-item/toolbar-item.component.js';
import { Button } from '../button/button.component.js';
import type { Column } from './table.types.js';

interface Person {
  id: string;
  name: string;
  city: string;
  age: number;
}

const people: Person[] = [
  { id: '1', name: 'Àlice Rossi', city: 'Aosta', age: 34 },
  { id: '2', name: 'Bruno Conti', city: 'Milano', age: 9 },
  { id: '3', name: 'Carla Neri', city: 'Zurigo', age: 41 },
];

const columns: Column<Person>[] = [
  { key: 'name', header: 'Nome', rowHeader: true },
  { key: 'city', header: 'Città' },
  { key: 'age', header: 'Età', align: 'end' },
];

const meta: Meta<typeof Table<Person>> = {
  title: 'Components/Data display/Table',
  component: Table,
  // The Props table is CURATED here (react-docgen can't derive it).
  argTypes: {
    caption: {
      control: 'text',
      description:
        'What the table is, as a real `<caption>`. Required: assistive technology lists the tables on a page, and without a name they are identical entries.',
      table: { type: { summary: 'ReactNode' } },
    },
    density: {
      control: 'inline-radio',
      options: ['comfortable', 'compact'],
      description: 'How much air a row gets.',
      table: { type: { summary: "'comfortable' | 'compact'" } },
    },
    busy: {
      control: 'boolean',
      description:
        'Something is arriving. Describes the element, not where the data comes from — a background refetch is busy while the old rows are still on screen.',
      table: { type: { summary: 'boolean' } },
    },
    columns: { control: false, table: { type: { summary: 'Column<T>[]' } } },
    rows: { control: false, table: { type: { summary: 'readonly T[]' } } },
    getRowId: {
      control: false,
      description:
        "The row's identity — and the same value you would use as a React `key`. An array index makes React reuse the wrong nodes after a sort, and the focus and selection that follow them look like the table's bug.",
      table: { type: { summary: '(row: T) => string' } },
    },
    empty: {
      control: 'text',
      description:
        'Shown in place of the body when there are no rows. Defaults to the design system’s own wording rather than being absent, because an empty `<tbody>` reads as "still loading" on screen and says nothing at all to a screen reader.',
      table: { type: { summary: 'ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Table<Person>>;

/**
 * The columns are declared, not written as markup — which is what makes the
 * header and the body impossible to disagree with each other.
 *
 * Free here: `scope="col"` on every header, `scope="row"` on the name column
 * (it is `rowHeader`), the caption as the table's accessible name, and the
 * numeric column right-aligned with tabular figures — declared once, not
 * repeated on every cell.
 */
export const Default: Story = {
  args: {
    caption: 'Persone',
    rows: people,
    columns,
    getRowId: (p: Person) => p.id,
  },
};

/**
 * Sorting, and the four lines that buy it. Click a header: ascending,
 * descending, then back to the order the data arrived in — the third stop
 * matters, because a two-state toggle leaves no way back.
 *
 * What arrives without a comparator being written: "Àosta" before "Zurigo"
 * (`<` would put every accented word after `z`), 9 before 10 rather than "10"
 * before "9", `aria-sort` on exactly the column in force, a real `Button` in
 * the header with the focus ring that comes with it, and the change announced
 * in the reader's language.
 */
export const Sortable: Story = {
  render: function Render() {
    const sort = useTableSort(people, { defaultSortKey: 'name' });

    return (
      <Table
        caption="Persone"
        rows={sort.rows}
        getRowId={(p) => p.id}
        columns={[
          { key: 'name', header: 'Nome', rowHeader: true, sortable: true },
          { key: 'city', header: 'Città', sortable: true },
          { key: 'age', header: 'Età', align: 'end', sortable: true },
        ]}
        {...sort.props}
      />
    );
  },
};

/**
 * Selectable rows. The checkbox column is drawn by the table rather than
 * written as a `cell`, because the part that goes wrong is not the box — it is
 * what the box is CALLED: each one is labelled by its own row's header, so a
 * screen reader hears "Select Zurigo" instead of the fifth of five identical
 * "Select row".
 *
 * The header box carries three states, and the mixed one is the interesting
 * one: the DOM has no attribute for it, only a property, which is why it is our
 * `Checkbox` and not a bare `<input>`.
 *
 * Note what is deliberately absent: `aria-selected`. It belongs to `grid` and
 * `treegrid`, so a row in a `table` cannot announce that it is selected — the
 * checkbox carries the state for everybody, which is also why it is not
 * optional.
 */
export const Selectable: Story = {
  render: function Render() {
    const selection = useRowSelection();

    return (
      <Table
        caption="Persone"
        rows={people}
        getRowId={(p) => p.id}
        columns={columns}
        {...selection.props}
      />
    );
  },
};

/**
 * The bar that says what is picked — and offers the one thing the table cannot.
 *
 * `Table` announces a change once and falls silent, which is right for an
 * announcement and useless as a state: nothing on screen answers "how many?" a
 * minute later. This does, for everybody, and it is deliberately NOT a live
 * region — two of them over one fact would say it twice.
 *
 * Tick the header box with `total` set and the escalation appears: three rows
 * are on screen, two thousand matched the query, and only the consumer knows
 * that. Taking it produces the `exclude` rule — "everything except these" —
 * which until this bar existed nothing in the package could reach.
 *
 * The actions are a `Toolbar`, so six bulk actions cost ONE tab stop rather
 * than six, and clearing gives focus back to the checkbox it came from instead
 * of dropping it on `<body>`.
 */
export const BulkActions: Story = {
  render: function Render() {
    const selection = useRowSelection({ total: 2450 });

    return (
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <TableSelectionBar {...selection.barProps}>
          <ToolbarItem>
            <Button variant="ghost" size="sm">
              Esporta
            </Button>
          </ToolbarItem>
          <ToolbarItem>
            <Button variant="ghost" size="sm">
              Elimina
            </Button>
          </ToolbarItem>
        </TableSelectionBar>
        <Table
          caption="Persone"
          rows={people}
          getRowId={(p) => p.id}
          columns={columns}
          {...selection.props}
        />
      </div>
    );
  },
};

/** Same table, tighter rows. */
export const Compact: Story = {
  args: {
    caption: 'Persone',
    rows: people,
    columns,
    getRowId: (p: Person) => p.id,
    density: 'compact',
  },
};

/**
 * With no rows the body carries one cell spanning the whole table — and the
 * `colSpan` is counted from the column list, not typed by hand, so it cannot be
 * wrong the day a column is added.
 */
export const Empty: Story = {
  args: {
    caption: 'Persone',
    rows: [],
    columns,
    getRowId: (p: Person) => p.id,
    empty: 'Nessuna persona trovata.',
  },
};

/**
 * `busy` while something is arriving. The rows stay on screen — which is the
 * point: it says "there is more coming", not "there is nothing yet".
 */
export const Busy: Story = {
  args: {
    caption: 'Persone',
    rows: people,
    columns,
    getRowId: (p: Person) => p.id,
    busy: true,
  },
};

/**
 * The parts, for a layout the column model cannot express. Dropping to them is
 * decomposition, not a second component: the same relationship `Field` has to
 * `FormInput`.
 *
 * Note what the parts give up: inside a section, `scope` is still derived — but
 * a header cell composed OUTSIDE `TableHead` or `TableBody` cannot be worked
 * out, so none is written and a development warning says so.
 */
export const Composed: Story = {
  render: () => (
    <Table caption="Persone">
      <TableFoot>
        <TableRow>
          <TableHeaderCell>Totale</TableHeaderCell>
          <TableCell align="end">
            {people.reduce((sum, p) => sum + p.age, 0)}
          </TableCell>
        </TableRow>
      </TableFoot>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Nome</TableHeaderCell>
          <TableHeaderCell align="end">Età</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {people.map((p) => (
          <TableRow key={p.id}>
            <TableHeaderCell>{p.name}</TableHeaderCell>
            <TableCell align="end">{p.age}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};
