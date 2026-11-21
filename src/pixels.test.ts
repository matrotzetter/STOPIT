import { describe, expect, it } from 'vitest'
import { CATALOGUE } from './config'
import {
  BATEAU,
  BATIMENTS,
  BOUTEILLE,
  CIELS,
  COULEURS_MOTIFS,
  FEU,
  FLECHE,
  MOUETTE,
  MOUTON,
  NOTE,
  NUAGE,
  SAISONS,
  periode,
  saison,
} from './pixels'

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
    for (const motif of [...FEU, NUAGE, FLECHE, BATEAU, BOUTEILLE, NOTE, ...MOUETTE, ...MOUTON, ...Object.values(BATIMENTS)]) {
      for (const ligne of motif) {
        expect(ligne).toHaveLength(motif[0].length)
        for (const lettre of ligne) expect(lettre === '.' || lettre in COULEURS_MOTIFS).toBe(true)
      }
    }
  })
})

describe('saison', () => {
  it('suit les mois de l’hémisphère nord', () => {
    expect(saison(new Date(2026, 11, 1))).toBe('hiver') // 1er décembre
    expect(saison(new Date(2027, 1, 28))).toBe('hiver') // fin février
    expect(saison(new Date(2027, 2, 1))).toBe('printemps')
    expect(saison(new Date(2027, 5, 21))).toBe('ete')
    expect(saison(new Date(2026, 10, 21))).toBe('automne') // 21 novembre
  })

  it('chaque saison colore les 6 zones et ne remplace que des couleurs existantes', () => {
    for (const habillage of Object.values(SAISONS)) {
      expect(habillage.zones).toHaveLength(6)
      for (const lettre of Object.keys(habillage.motifs)) expect(lettre in COULEURS_MOTIFS).toBe(true)
    }
  })
})
