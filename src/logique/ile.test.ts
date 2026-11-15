// Tests des règles de l'île. Lancer avec : npm test
import { describe, expect, it } from 'vitest'
import { JOUR_MS as J } from './calculs'
import {
  ZONE_DE_CASE,
  ameliorer,
  casesDegagees,
  construire,
  energie,
  refusAmelioration,
  refusConstruction,
  soldeCristaux,
} from './ile'
import type { Etat } from './types'

const t0 = 1_700_000_000_000

const base: Etat = {
  version: 1,
  profil: { produit: 'cigarettes', consoParJour: 10, prixParUnite: 0.5, dateArret: t0, raisons: ['a', 'b', 'c'] },
  recompenses: [],
  rechutes: [],
  envies: [],
  checkins: [],
  batiments: [],
}

/** Nombre de cases dégagées dans une zone. */
function degageesDansZone(etat: Etat, maintenant: number, zone: number): number {
  return casesDegagees(etat, maintenant).filter((ok, i) => ok && ZONE_DE_CASE[i] === zone).length
}

describe('brume', () => {
  it('la carte contient 64 cases réparties en 6 zones', () => {
    expect(ZONE_DE_CASE).toHaveLength(64)
    expect(new Set(ZONE_DE_CASE).size).toBe(6)
  })

  it('tout est sous la brume avant le premier palier (3 jours)', () => {
    expect(casesDegagees(base, t0 + 2.9 * J).some(Boolean)).toBe(false)
  })

  it('une zone ouverte se dégage case par case en 3 jours', () => {
    // La zone 0 (8 cases) s'ouvre au jour 3.
    expect(degageesDansZone(base, t0 + 3 * J, 0)).toBe(0)
    expect(degageesDansZone(base, t0 + 4 * J, 0)).toBe(2)
    expect(degageesDansZone(base, t0 + 6 * J, 0)).toBe(8)
    // La zone 1 ne s'ouvre qu'au jour 7.
    expect(degageesDansZone(base, t0 + 6.9 * J, 1)).toBe(0)
  })

  it('l’île avance avec le temps réel, sans aucune action dans l’app', () => {
    // Même état enregistré, heure différente : plus de cases dégagées.
    const avant = casesDegagees(base, t0 + 8 * J).filter(Boolean).length
    const apres = casesDegagees(base, t0 + 30 * J).filter(Boolean).length
    expect(apres).toBeGreaterThan(avant)
  })

  it('une rechute recouvre la dernière zone ouverte, qui se redégage en 3 jours', () => {
    // Jour 8 : les zones 0 et 1 sont ouvertes ; la zone 1 (10 cases) est la dernière.
    const etat: Etat = { ...base, rechutes: [{ date: t0 + 8 * J, unites: 1 }] }
    expect(degageesDansZone(base, t0 + 8 * J, 1)).toBe(3) // sans rechute
    expect(degageesDansZone(etat, t0 + 8 * J, 1)).toBe(0) // recouverte
    expect(degageesDansZone(etat, t0 + 8 * J, 0)).toBe(8) // les autres zones ne bougent pas
    expect(degageesDansZone(etat, t0 + 11 * J, 1)).toBe(10) // redégagée 3 jours plus tard
  })

  it('une rechute avant toute ouverture de zone ne change rien à l’île', () => {
    const etat: Etat = { ...base, rechutes: [{ date: t0 + 1 * J, unites: 1 }] }
    expect(degageesDansZone(etat, t0 + 6 * J, 0)).toBe(8)
  })
})

describe('énergie et bâtiments', () => {
  const jour4 = t0 + 4 * J
  const caseDegagee = 62 // première case dégagée de la zone 0
  const caseBrume = 0

  it('l’énergie vaut 10 par heure sans nicotine', () => {
    expect(energie(base, jour4)).toBeCloseTo(960)
    expect(energie(base, t0 - J)).toBe(0)
  })

  it('construire dépense de l’énergie', () => {
    const etat = construire(base, caseDegagee, 'cabane', jour4)
    expect(etat.batiments).toEqual([{ case: caseDegagee, type: 'cabane', niveau: 1 }])
    expect(energie(etat, jour4)).toBeCloseTo(960 - 150)
  })

  it('on ne construit ni dans la brume, ni sur une case occupée, ni hors zone, ni sans énergie', () => {
    expect(refusConstruction(base, caseBrume, 'cabane', jour4)).toMatch(/brume/)
    const occupee = construire(base, caseDegagee, 'cabane', jour4)
    expect(refusConstruction(occupee, caseDegagee, 'feu', jour4)).toMatch(/occupée/)
    expect(refusConstruction(base, caseDegagee, 'phare', jour4)).toMatch(/zone 4/)
    // Un état où toute l'énergie a déjà été dépensée (cabane niveau 3 = 600, feu niveau 3 = 400).
    const fauche: Etat = {
      ...base,
      batiments: [
        { case: 61, type: 'cabane', niveau: 3 },
        { case: 60, type: 'feu', niveau: 3 },
      ],
    }
    expect(energie(fauche, jour4)).toBe(0)
    expect(refusConstruction(fauche, caseDegagee, 'cabane', jour4)).toMatch(/énergie/)
    // Un refus ne modifie pas l'état.
    expect(construire(base, caseBrume, 'cabane', jour4)).toBe(base)
  })

  it('améliorer coûte de l’énergie et des cristaux', () => {
    // Jour 4 : 50 cristaux (palier des 3 jours atteint).
    const niveau1 = construire(base, caseDegagee, 'cabane', jour4)
    const niveau2 = ameliorer(niveau1, caseDegagee, jour4)
    expect(niveau2.batiments[0].niveau).toBe(2)
    expect(energie(niveau2, jour4)).toBeCloseTo(960 - 150 - 150)
    expect(soldeCristaux(niveau2, jour4)).toBe(50 - 20)
    // Niveau 3 : il faudrait 40 cristaux, il n'en reste que 30.
    expect(refusAmelioration(niveau2, caseDegagee, jour4)).toMatch(/cristaux/)
  })

  it('une décoration coûte des cristaux et ne s’améliore pas', () => {
    const etat = construire(base, caseDegagee, 'fleurs', jour4)
    expect(soldeCristaux(etat, jour4)).toBe(30)
    expect(energie(etat, jour4)).toBeCloseTo(960)
    expect(refusAmelioration(etat, caseDegagee, jour4)).toMatch(/décoration/)
  })

  it('une rechute ne retire ni énergie, ni cristaux, ni bâtiments', () => {
    const avant = construire(base, caseDegagee, 'cabane', jour4)
    const apres: Etat = { ...avant, rechutes: [{ date: jour4, unites: 5 }] }
    expect(energie(apres, jour4)).toBe(energie(avant, jour4))
    expect(soldeCristaux(apres, jour4)).toBe(soldeCristaux(avant, jour4))
    expect(apres.batiments).toEqual(avant.batiments)
  })
})
