import { describe, expect, it } from 'vitest'
import { guessCategory } from '../../src/lib/guessCategory'

describe('guessCategory', () => {
  it.each([
    ['Milk', 'Dairy'],
    ['Cheddar cheese', 'Dairy'],
    ['Greek yoghurt', 'Dairy'],
    ['Chicken breast', 'Meat'],
    ['Ham', 'Meat'],
    ['Salmon fillet', 'Seafood'],
    ['Eggs', 'Eggs'],
    ['Sourdough bread', 'Bakery'],
    ['Orange juice', 'Beverages'],
    ['Tomato sauce', 'Condiments'],
    ['Potato chips', 'Snacks'],
    ['Leftover curry', 'Leftovers'],
    ['Baby spinach', 'Produce'],
  ])('reads "%s" as %s', (name, category) => {
    expect(guessCategory(name)).toBe(category)
  })

  it('checks the more specific ready-meal rule before the general Frozen one', () => {
    expect(guessCategory('frozen lasagne')).toBe('Microwave Meals')
    expect(guessCategory('Ready meal')).toBe('Microwave Meals')
    expect(guessCategory('frozen chicken')).toBe('Frozen')
    expect(guessCategory('Ice cream')).toBe('Frozen')
  })

  it('matches whole words only, so a keyword inside a longer word is not a match', () => {
    expect(guessCategory('Ham')).toBe('Meat')
    expect(guessCategory('Shampoo')).toBeNull()
  })

  it('returns null rather than a fallback category when nothing matches', () => {
    expect(guessCategory('')).toBeNull()
    expect(guessCategory('   ')).toBeNull()
    expect(guessCategory('Zzzz unknown thing')).toBeNull()
  })

  // Regression for the sweep's finding 3: the keyword table is singular,
  // and a strict word-boundary match meant 28 of the 29 single-word
  // keywords failed on the plural, which is how people actually write a
  // shopping list.
  describe('regression (sweep finding 3): plurals', () => {
    it.each([
      ['Apples', 'Produce'],
      ['Carrots', 'Produce'],
      ['Bananas', 'Produce'],
      ['Tomatoes', 'Produce'],
      ['Potatoes', 'Produce'],
      ['Onions', 'Produce'],
      ['Peaches', 'Produce'],
      ['Mushrooms', 'Produce'],
      ['Sausages', 'Meat'],
      ['Steaks', 'Meat'],
      ['Bagels', 'Bakery'],
      ['Muffins', 'Bakery'],
      ['Prawns', 'Seafood'],
      ['Oysters', 'Seafood'],
    ])('reads the plural "%s" as %s', (name, category) => {
      expect(guessCategory(name)).toBe(category)
    })

    it('handles plurals inside a longer shopping-list name', () => {
      expect(guessCategory('Cherry tomatoes')).toBe('Produce')
      expect(guessCategory('2 Bananas')).toBe('Produce')
      expect(guessCategory('Free range eggs')).toBe('Eggs')
    })

    it('still rejects a longer word that merely contains a keyword plus s', () => {
      expect(guessCategory('Shampoos')).toBeNull()
    })
  })
})
