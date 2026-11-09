import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { StatusBadge } from './Badge'
import { DataView } from './DataView'
import { Field, Input, Select } from './Form'
import { CurrencyAmounts } from './Misc'

describe('Field', () => {
  it('associates its label with the control automatically', () => {
    render(
      <>
        <Field label="Monthly rent" hint="Whole francs">
          <Input />
        </Field>
        <Field label="Currency">
          <Select>
            <option>RWF</option>
          </Select>
        </Field>
      </>,
    )
    expect(screen.getByLabelText('Monthly rent')).toHaveAccessibleDescription('Whole francs')
    expect(screen.getByLabelText('Currency').tagName).toBe('SELECT')
  })
})

describe('CurrencyAmounts', () => {
  it('lists each currency separately and never sums them', () => {
    render(<CurrencyAmounts items={[{ currency: 'RWF', amount: '50000.00' }, { currency: 'USD', amount: '800.00' }]} />)
    expect(screen.getByText('50,000 RWF')).toBeInTheDocument()
    expect(screen.getByText('$800.00')).toBeInTheDocument()
  })
  it('hides zero amounts', () => {
    render(<CurrencyAmounts items={[{ currency: 'USD', amount: '0.00' }]} empty="Nothing owed" />)
    expect(screen.getByText('Nothing owed')).toBeInTheDocument()
  })
})

describe('StatusBadge', () => {
  it('renders readable labels', () => {
    render(<StatusBadge status="partially_paid" />)
    expect(screen.getByText('Partially paid')).toBeInTheDocument()
  })
})

describe('DataView', () => {
  const rows = [{ id: 1, name: 'R101' }]
  it('renders both the mobile list and the desktop table, and handles row taps', async () => {
    const onRowClick = vi.fn()
    render(
      <MemoryRouter>
        <DataView
          rows={rows}
          rowKey={(r) => r.id}
          onRowClick={onRowClick}
          columns={[{ key: 'n', header: 'Code', cell: (r) => r.name }]}
          mobile={(r) => <span>mobile {r.name}</span>}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
    await userEvent.click(screen.getByText('mobile R101'))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })
  it('shows the empty state', () => {
    render(
      <MemoryRouter>
        <DataView rows={[]} rowKey={() => 1} columns={[]} mobile={() => null} empty={<p>No units yet</p>} />
      </MemoryRouter>,
    )
    expect(screen.getByText('No units yet')).toBeInTheDocument()
  })
})
