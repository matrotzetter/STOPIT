import { describe, expect, it } from 'vitest'
import { CATALOGUE } from './config'
import { BATIMENTS, CIELS, COULEURS_MOTIFS, FEU, FLECHE, NUAGE, periode } from './pixels'

describe('periode', () => {
  it('découpe la journée en nuit, aube, jour et soir', () => {
    expect([0, 4, 5, 7, 8, 16, 17, 20, 21, 23].map(periode)).toEqual([
      'nuit', 'nuit', 'aube', 'aube', 'jour', 'jour', 'soir', 'soir', 'nuit', 'nuit',
    ])
  })

  it('chaque période a un ciel de 6 bandes', () => {
    for (const ciel of Object.values(CIELS)) expect(ciel).toHaveLength(6)
  })
})

describe('motifs', () => {
  it('chaque élément du catalogue a son dessin (le feu de camp utilise FEU)', () => {
    for (const m of CATALOGUE) expect(m.id === 'feu' || m.id in BATIMENTS).toBe(true)
  })

  it('chaque motif est rectangulaire et n’utilise que des lettres qui ont une couleur', () => {
    for (const motif of [...FEU, NUAGE, FLECHE, ...Object.values(BATIMENTS)]) {
      for (const ligne of motif) {
        expect(ligne).toHaveLength(motif[0].length)
        for (const lettre of ligne) expect(lettre === '.' || lettre in COULEURS_MOTIFS).toBe(true)
      }
    }
  })
})
