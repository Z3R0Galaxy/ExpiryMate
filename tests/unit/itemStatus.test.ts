import { describe, expect, it, vi, afterEach } from 'vitest'
import { STATUS_LABEL, computeStatusInfo, weeksNote } from '../../src/lib/itemStatus'
import type { Item } from '../../src/hooks/useItems'

const baseItem: Item = {
  id: '1',
  name: 'Milk',
  category: 'Dairy',
  storage_location: 'Fridge',
  expiry_date: '2026-09-10',
  quantity: 1,
  is_opened: false,
  date_opened: null,
}

describe('weeksNote', () => {
  it('says nothing below a full seven days', () => {
    for (const days of [0, 1, 5, 6]) {
      expect(weeksNote(days)).toBe('')
      expect(weeksNote(days, true)).toBe('')
    }
  })

  it('treats seven days as a hard threshold rather than rounding up', () => {
    expect(weeksNote(6)).toBe('')
    expect(weeksNote(7)).toBe(' (1 week)')
  })

  it('floors rather than rounding', () => {
    expect(weeksNote(13)).toBe(' (1 week)')
    expect(weeksNote(14)).toBe(' (2 weeks)')
  })

  it('has an abbreviated form for the table column', () => {
    expect(weeksNote(14, true)).toBe(' (2w)')
    expect(weeksNote(7, true)).toBe(' (1w)')
  })
})

describe('computeStatusInfo', () => {
  afterEach(() => vi.useRealTimers())

  it('derives status from the adjusted date, not the printed one', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-01T03:00:00Z'))
    // Opened dairy in the fridge: earlier of the printed date or
    // date opened + 7. Opened 2026-08-28, so the adjusted date is
    // 2026-09-04, well before the printed 2026-09-10.
    const info = computeStatusInfo({ ...baseItem, is_opened: true, date_opened: '2026-08-28' })
    expect(info.result.safe && info.result.adjustedDate).toBe('2026-09-04')
    expect(info.daysRemaining).toBe(3)
    expect(info.badgeStatus).toBe('soon')
  })

  it('reports an unsafe combination with no countdown at all', () => {
    const info = computeStatusInfo({ ...baseItem, storage_location: 'Pantry' })
    expect(info.badgeStatus).toBe('warning')
    expect(info.daysRemaining).toBeNull()
    expect(info.countdownValue).toBeNull()
    expect(info.countdownLabel).toBeNull()
    expect(info.result.safe).toBe(false)
  })

  it('builds a singular label for exactly one day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-09T03:00:00Z'))
    expect(computeStatusInfo(baseItem).countdownLabel).toBe('day left')
  })

  it('says "ago" once the date has passed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-13T03:00:00Z'))
    const info = computeStatusInfo(baseItem)
    expect(info.badgeStatus).toBe('expired')
    expect(info.countdownValue).toBe(3)
    expect(info.countdownLabel).toBe('days ago')
  })

  it('folds the weeks note into the countdown label', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-27T03:00:00Z'))
    expect(computeStatusInfo(baseItem).countdownLabel).toBe('days (2 weeks) left')
  })
})

describe('STATUS_LABEL', () => {
  it('labels all four badge states', () => {
    expect(STATUS_LABEL).toEqual({
      fresh: 'Fresh',
      soon: 'Expiring soon',
      expired: 'Expired',
      warning: 'Unsafe',
    })
  })
})
