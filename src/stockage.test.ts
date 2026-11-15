// Tests de la lecture des données enregistrées ou importées. Lancer avec : npm test
import { describe, expect, it } from 'vitest'
import { lireEtat } from './stockage'

const profil = { produit: 'cigarettes', consoParJour: 10, prixParUnite: 0.5, dateArret: 1_700_000_000_000, raisons: ['a'] }

describe('lireEtat', () => {
  it('relit un export complet à l’identique', () => {
    const etat = {
      version: 1,
      profil,
      recompenses: [{ id: '1', nom: 'Vélo', prix: 10, palierJours: 3 }],
      rechutes: [],
      envies: [],
      checkins: ['2026-11-15'],
      batiments: [{ case: 62, type: 'cabane', niveau: 2 }],
      recordPuzzle: 42,
      sons: false,
    }
    expect(lireEtat(JSON.stringify(etat))).toEqual(etat)
  })

  it('complète les listes absentes (données d’une ancienne version)', () => {
    const etat = lireEtat(JSON.stringify({ profil }))!
    expect(etat.batiments).toEqual([])
    expect(etat.envies).toEqual([])
  })

  it('refuse un fichier illisible, vide, sans profil ou mal formé', () => {
    expect(lireEtat('pas du json')).toBeNull()
    expect(lireEtat('{}')).toBeNull()
    expect(lireEtat('null')).toBeNull()
    expect(lireEtat(JSON.stringify({ profil: { ...profil, consoParJour: 'dix' } }))).toBeNull()
    expect(lireEtat(JSON.stringify({ profil, rechutes: 'aucune' }))).toBeNull()
  })
})
