// Tests des règles de l'île. Lancer avec : npm test
import { describe, expect, it } from 'vitest'
import { JOUR_MS as J } from './calculs'
import {
  EST_EAU,
  ZONE_DE_CASE,
  ameliorer,
  casesDegagees,
  construire,
  coutTotal,
  deconstruire,
  energie,
  refusAmelioration,
  refusConstruction,
  refusDeconstruction,
  migrerCarte,
  modele,
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
  it('la carte contient 100 cases : 83 de terre en 6 zones, dont 6 d’eau', () => {
    expect(ZONE_DE_CASE).toHaveLength(100)
    expect(ZONE_DE_CASE.filter((z) => z >= 0)).toHaveLength(83)
    expect(new Set(ZONE_DE_CASE.filter((z) => z >= 0)).size).toBe(6)
    expect(EST_EAU.filter(Boolean)).toHaveLength(6)
    // L'eau est toujours sur de la terre.
    EST_EAU.forEach((eau, i) => eau && expect(ZONE_DE_CASE[i]).toBeGreaterThanOrEqual(0))
  })

  it('tout est sous la brume avant le premier palier (3 jours)', () => {
    expect(casesDegagees(base, t0 + 2.9 * J).some(Boolean)).toBe(false)
  })

  it('une zone ouverte se dégage case par case en 3 jours', () => {
    // La zone 0 (15 cases) s'ouvre au jour 3.
    expect(degageesDansZone(base, t0 + 3 * J, 0)).toBe(0)
    expect(degageesDansZone(base, t0 + 4 * J, 0)).toBe(5)
    expect(degageesDansZone(base, t0 + 6 * J, 0)).toBe(15)
    // La zone 1 ne s'ouvre qu'au jour 7.
    expect(degageesDansZone(base, t0 + 6.9 * J, 1)).toBe(0)
  })

  it('l’île avance avec le temps réel, sans aucune action dans l’app', () => {
    // Même état enregistré, heure différente : plus de cases dégagées.
    const avant = casesDegagees(base, t0 + 8 * J).filter(Boolean).length
    const apres = casesDegagees(base, t0 + 30 * J).filter(Boolean).length
    expect(apres).toBeGreaterThan(avant)
  })

  it('une rechute recouvre toute l’île, qui se redégage en 3 jours', () => {
    // Jour 8 : les zones 0 (15 cases) et 1 (16 cases) sont ouvertes.
    const etat: Etat = { ...base, rechutes: [{ date: t0 + 8 * J, unites: 1 }] }
    expect(degageesDansZone(base, t0 + 8 * J, 0)).toBe(15) // sans rechute
    expect(casesDegagees(etat, t0 + 8 * J).some(Boolean)).toBe(false) // tout est recouvert
    expect(degageesDansZone(etat, t0 + 11 * J, 0)).toBe(15) // 3 jours plus tard,
    expect(degageesDansZone(etat, t0 + 11 * J, 1)).toBe(16) // tout est redégagé
  })

  it('une rechute avant toute ouverture de zone ne change rien à l’île', () => {
    const etat: Etat = { ...base, rechutes: [{ date: t0 + 1 * J, unites: 1 }] }
    expect(degageesDansZone(etat, t0 + 6 * J, 0)).toBe(15)
  })
})

describe('énergie et bâtiments', () => {
  const jour4 = t0 + 4 * J
  const caseDegagee = 97 // première case dégagée de la zone 0
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
    expect(refusConstruction(base, caseBrume, 'cabane', jour4)).toMatch(/terre/) // case 0 : hors de l'île
    expect(refusConstruction(base, 2, 'cabane', jour4)).toMatch(/brume/)
    expect(refusConstruction(base, 91, 'cabane', t0 + 30 * J)).toMatch(/eau/)
    const occupee = construire(base, caseDegagee, 'cabane', jour4)
    expect(refusConstruction(occupee, caseDegagee, 'feu', jour4)).toMatch(/occupée/)
    expect(refusConstruction(base, caseDegagee, 'phare', jour4)).toMatch(/zone 4/)
    // Un état où toute l'énergie a déjà été dépensée (cabane niveau 3 = 600, feu niveau 3 = 400).
    const fauche: Etat = {
      ...base,
      batiments: [
        { case: 96, type: 'cabane', niveau: 3 },
        { case: 95, type: 'feu', niveau: 3 },
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

describe('déconstruire', () => {
  const jour4 = t0 + 4 * J
  const caseDegagee = 97

  it('rend tout ce que le bâtiment avait coûté, améliorations comprises', () => {
    const niveau2 = ameliorer(construire(base, caseDegagee, 'cabane', jour4), caseDegagee, jour4)
    expect(coutTotal(modele('cabane')!, 2)).toEqual({ energie: 300, cristaux: 20 })
    const vide = deconstruire(niveau2, caseDegagee, jour4)
    expect(vide.batiments).toEqual([])
    expect(energie(vide, jour4)).toBeCloseTo(energie(base, jour4))
    expect(soldeCristaux(vide, jour4)).toBe(soldeCristaux(base, jour4))
  })

  it('ne touche ni une case vide, ni une case dans la brume', () => {
    expect(refusDeconstruction(base, caseDegagee, jour4)).toMatch(/Aucun/)
    expect(deconstruire(base, caseDegagee, jour4)).toBe(base)
    // Un bâtiment posé, puis recouvert par la brume après une rechute.
    const cache: Etat = { ...construire(base, caseDegagee, 'cabane', jour4), rechutes: [{ date: jour4, unites: 1 }] }
    expect(refusDeconstruction(cache, caseDegagee, jour4)).toMatch(/brume/)
    expect(deconstruire(cache, caseDegagee, jour4)).toBe(cache)
  })
})

describe('passage à la carte 10 × 10', () => {
  it('garde la place de chaque bâtiment par rapport à la côte', () => {
    const ancien: Etat = { ...base, batiments: [{ case: 62, type: 'cabane', niveau: 2 }] }
    expect(migrerCarte(ancien).batiments).toEqual([{ case: 97, type: 'cabane', niveau: 2 }])
  })

  it('déplace sur la case libre la plus proche un bâtiment tombé sur l’eau ou hors de l’île', () => {
    // Ancienne case 56 (ligne 7, colonne 0) → case 91, qui est de l'eau.
    // Ancienne case 63 (ligne 7, colonne 7) → case 98, qui est hors de l'île.
    const ancien: Etat = {
      ...base,
      batiments: [
        { case: 56, type: 'feu', niveau: 1 },
        { case: 63, type: 'arbre', niveau: 1 },
      ],
    }
    const cases = migrerCarte(ancien).batiments.map((b) => b.case)
    expect(cases).toEqual([92, 88]) // 88 et 97 sont à égale distance de 98 : la plus petite gagne
  })

  it('ne touche pas des données déjà à la nouvelle carte', () => {
    const recent: Etat = { ...base, carte: 2, batiments: [{ case: 62, type: 'cabane', niveau: 1 }] }
    expect(migrerCarte(recent)).toBe(recent)
  })
})
