process.env.TZ = 'Australia/Sydney'

import { describe, expect, it, vi, afterEach } from 'vitest'
import { validateItemForm, checkStorageSafety, todayLocal } from '../../src/lib/validateItem'

const valid = {
  name: 'Milk',
  expiry_date: '2026-09-10',
  quantity: '2',
  is_opened: false,
  date_opened: '',
}

describe('validateItemForm', () => {
  it('accepts a well-formed item', () => {
    expect(validateItemForm(valid)).toBeNull()
  })

  it('requires a name that is not just whitespace', () => {
    expect(validateItemForm({ ...valid, name: '' })).toMatch(/name is required/i)
    expect(validateItemForm({ ...valid, name: '   ' })).toMatch(/name is required/i)
  })

  it('requires a date', () => {
    expect(validateItemForm({ ...valid, expiry_date: '' })).toMatch(/date is required/i)
  })

  it.each(['0', '1000', '-5', '2.5', 'abc', ''])('rejects quantity %s', quantity => {
    expect(validateItemForm({ ...valid, quantity })).toMatch(/whole number between 1 and 999/i)
  })

  it.each(['1', '999', '500'])('accepts quantity %s', quantity => {
    expect(validateItemForm({ ...valid, quantity })).toBeNull()
  })

  it('requires a date opened once the item is marked opened', () => {
    expect(validateItemForm({ ...valid, is_opened: true, date_opened: '' }))
      .toMatch(/date opened is required/i)
  })

  afterEach(() => vi.useRealTimers())

  it('rejects a date opened in the future', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-27T03:00:00Z'))
    expect(validateItemForm({ ...valid, is_opened: true, date_opened: '2026-08-29' }))
      .toMatch(/cannot be in the future/i)
  })

  // Regression for the Feedback Sprint 2 bug: comparing against the UTC
  // date made today's own date read as a future date for the first ten
  // hours of every Sydney day.
  it("accepts today's own date during the early-morning window", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-26T22:00:00Z')) // 08:00 on 27 Aug in Sydney
    expect(todayLocal()).toBe('2026-08-27')
    expect(validateItemForm({ ...valid, is_opened: true, date_opened: '2026-08-27' })).toBeNull()
  })
})

describe('checkStorageSafety', () => {
  it('returns null for a safe combination', () => {
    expect(checkStorageSafety({
      category: 'Dairy', storage_location: 'Fridge',
      expiry_date: '2026-09-10', is_opened: false, date_opened: null,
    })).toBeNull()
  })

  it('blocks raw meat in the pantry and says where it belongs', () => {
    const message = checkStorageSafety({
      category: 'Meat', storage_location: 'Pantry',
      expiry_date: '2026-09-10', is_opened: false, date_opened: null,
    })
    expect(message).toMatch(/pantry/i)
    expect(message).toMatch(/fridge or freezer/i)
  })

  it('blocks eggs in the freezer', () => {
    expect(checkStorageSafety({
      category: 'Eggs', storage_location: 'Freezer',
      expiry_date: '2026-09-10', is_opened: false, date_opened: null,
    })).toMatch(/fridge/i)
  })

  it('blocks an opened ready meal going back into the freezer', () => {
    expect(checkStorageSafety({
      category: 'Microwave Meals', storage_location: 'Freezer',
      expiry_date: '2026-09-10', is_opened: true, date_opened: '2026-08-20',
    })).toMatch(/fridge/i)
  })

  it('allows the same ready meal in the freezer while still sealed', () => {
    expect(checkStorageSafety({
      category: 'Microwave Meals', storage_location: 'Freezer',
      expiry_date: '2026-09-10', is_opened: false, date_opened: null,
    })).toBeNull()
  })
})
