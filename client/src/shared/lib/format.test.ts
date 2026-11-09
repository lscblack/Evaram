import { formatMoney, humanize, initials } from './format'

describe('formatMoney', () => {
  it('shows RWF as whole francs with the currency code', () => {
    expect(formatMoney('150000.00', 'RWF')).toBe('150,000 RWF')
    expect(formatMoney(50000, 'RWF')).toBe('50,000 RWF')
  })

  it('shows USD with cents and a dollar sign', () => {
    expect(formatMoney('900.5', 'USD')).toBe('$900.50')
  })

  it('never throws on bad input', () => {
    expect(formatMoney(undefined, 'RWF')).toBe('0 RWF')
    expect(formatMoney('abc', 'USD')).toBe('$0.00')
  })
})

describe('text helpers', () => {
  it('humanizes enum values', () => {
    expect(humanize('partially_paid')).toBe('Partially paid')
    expect(humanize('payment.approved')).toBe('Payment approved')
  })
  it('builds initials', () => {
    expect(initials('Jean Paul Mugisha')).toBe('JP')
  })
})
