// Tests des statistiques. Lancer avec : npm test
import { describe, expect, it } from 'vitest'
import { declencheursFrequents, enviesParHeure, enviesParJour } from './stats'
import type { Envie } from './types'

/** Fabrique une envie à une date et une heure locales données (mois : 10 = novembre). */
function envie(jour: number, heure: number, declencheur?: string, surmontee = true): Envie {
  return { date: new Date(2026, 10, jour, heure, 30).getTime(), surmontee, mode: 'jouer', declencheur }
}

const envies = [
  envie(13, 8, 'Café'),
  envie(15, 8, 'Café'),
  envie(15, 14, 'Stress'),
  envie(15, 22, undefined, false),
]
const maintenant = new Date(2026, 10, 15, 23, 0).getTime()

describe('statistiques', () => {
  it('compte les envies par jour, jours vides compris', () => {
    const jours = enviesParJour(envies, maintenant, 3)
    expect(jours).toEqual([
      { jour: '2026-11-13', total: 1 },
      { jour: '2026-11-14', total: 0 },
      { jour: '2026-11-15', total: 3 },
    ])
  })

  it('classe les déclencheurs du plus fréquent au moins fréquent, sans compter les envies sans déclencheur', () => {
    expect(declencheursFrequents(envies)).toEqual([
      { nom: 'Café', total: 2 },
      { nom: 'Stress', total: 1 },
    ])
  })

  it('compte les envies par heure de la journée', () => {
    const heures = enviesParHeure(envies)
    expect(heures).toHaveLength(24)
    expect(heures[8]).toBe(2)
    expect(heures[14]).toBe(1)
    expect(heures[22]).toBe(1)
    expect(heures[3]).toBe(0)
  })

  it('aucune envie : tout est à zéro', () => {
    expect(enviesParJour([], maintenant, 2).map((j) => j.total)).toEqual([0, 0])
    expect(declencheursFrequents([])).toEqual([])
  })
})
