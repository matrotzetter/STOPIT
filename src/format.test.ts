import { describe, expect, it } from 'vitest'
import { dureeCourte } from './format'

describe('dureeCourte', () => {
  it('donne jours et heures dès un jour, heures et minutes avant', () => {
    const H = 3600000
    expect(dureeCourte(20 * 24 * H + 4 * H + 59 * 60000)).toBe('20 j 4 h')
    expect(dureeCourte(4 * H + 12 * 60000)).toBe('4 h 12 min')
    expect(dureeCourte(0)).toBe('0 h 0 min')
  })
})
