// Tests automatiques des règles de calcul. Lancer avec : npm test
import { describe, expect, it } from 'vitest'
import {
  prixUnitaire,
  avancementRecompense,
  soldeCagnotte,
  JOUR_MS as J,
  cagnotte,
  cristaux,
  etatRecompense,
  meilleureSerieMs,
  prochaineRecompense,
  serieMs,
  tempsCumuleMs,
  unitesNonConsommees,
} from './calculs'
import type { Etat } from './types'

/** Date d'arrêt fictive. */
const t0 = 1_700_000_000_000

/** Exemple : 10 cigarettes par jour à 0.50 CHF = 5 CHF économisés par jour. */
const base: Etat = {
  version: 1,
  profil: { produit: 'cigarettes', consoParJour: 10, prixParUnite: 0.5, dateArret: t0, raisons: ['a', 'b', 'c'] },
  recompenses: [],
  rechutes: [],
  envies: [],
  checkins: [],
  batiments: [],
}

describe('sans rechute', () => {
  it('la cagnotte grandit de 5 CHF par jour', () => {
    expect(cagnotte(base, t0 + 4 * J)).toBeCloseTo(20)
    expect(unitesNonConsommees(base, t0 + 4 * J)).toBeCloseTo(40)
  })

  it('la série et la meilleure série valent le temps écoulé', () => {
    expect(serieMs(base, t0 + 4 * J)).toBe(4 * J)
    expect(meilleureSerieMs(base, t0 + 4 * J)).toBe(4 * J)
  })

  it('tout vaut zéro si la date d’arrêt est dans le futur', () => {
    const avant = t0 - 2 * J
    expect(tempsCumuleMs(base, avant)).toBe(0)
    expect(serieMs(base, avant)).toBe(0)
    expect(meilleureSerieMs(base, avant)).toBe(0)
    expect(cagnotte(base, avant)).toBe(0)
  })
})

describe('avec une rechute de 3 unités au jour 2', () => {
  const etat: Etat = { ...base, rechutes: [{ date: t0 + 2 * J, unites: 3 }] }
  const jour5 = t0 + 5 * J

  it('la série repart de zéro, la meilleure série est conservée', () => {
    expect(serieMs(etat, t0 + 2 * J)).toBe(0)
    expect(serieMs(etat, jour5)).toBe(3 * J)
    expect(meilleureSerieMs(etat, t0 + 3 * J)).toBe(2 * J)
  })

  it('les jours cumulés ne sont pas effacés', () => {
    expect(tempsCumuleMs(etat, jour5)).toBe(5 * J)
  })

  it('seul le coût des unités consommées est retiré de la cagnotte', () => {
    expect(cagnotte(etat, jour5)).toBeCloseTo(25 - 1.5)
    expect(unitesNonConsommees(etat, jour5)).toBeCloseTo(47)
  })

  it('une rechute notée avant la date d’arrêt ne compte ni pour la série ni pour la cagnotte', () => {
    const avant: Etat = { ...base, rechutes: [{ date: t0 - J, unites: 10 }] }
    expect(serieMs(avant, t0 + 2 * J)).toBe(2 * J)
    expect(cagnotte(avant, t0 + 2 * J)).toBeCloseTo(10)
    expect(unitesNonConsommees(avant, t0 + 2 * J)).toBeCloseTo(20)
  })

  it('la cagnotte n’est jamais négative', () => {
    const grosse: Etat = { ...base, rechutes: [{ date: t0 + J, unites: 1000 }] }
    expect(cagnotte(grosse, t0 + 2 * J)).toBe(0)
    // Le retard reste connu : 2 jours × CHF 5 d'économies − 1000 unités × CHF 0.50.
    expect(soldeCagnotte(grosse, t0 + 2 * J)).toBeCloseTo(10 - 500)
  })
})

describe('récompenses', () => {
  const velo = { id: '1', nom: 'Vélo', prix: 10, palierJours: 3 }
  const etat: Etat = { ...base, recompenses: [velo] }

  it('verrouillée si le palier n’est pas atteint, même avec assez d’argent', () => {
    // Jour 2.5 : cagnotte 12.50 CHF ≥ 10, mais série < 3 jours.
    expect(etatRecompense(velo, etat, t0 + 2.5 * J)).toBe('verrouillee')
  })

  it('verrouillée si la cagnotte ne couvre pas le prix, même avec le palier', () => {
    const chere = { ...velo, prix: 100 }
    expect(etatRecompense(chere, { ...base, recompenses: [chere] }, t0 + 3 * J)).toBe('verrouillee')
  })

  it('débloquée quand palier ET prix sont atteints', () => {
    expect(etatRecompense(velo, etat, t0 + 3 * J)).toBe('debloquee')
  })

  it('une rechute reverrouille (la série repart), sans vider la cagnotte', () => {
    const rechute: Etat = { ...etat, rechutes: [{ date: t0 + 3 * J, unites: 1 }] }
    expect(etatRecompense(velo, rechute, t0 + 4 * J)).toBe('verrouillee')
    expect(cagnotte(rechute, t0 + 4 * J)).toBeCloseTo(19.5)
  })

  it('encaisser retire le prix de la cagnotte', () => {
    const encaissee = { ...velo, encaisseeLe: t0 + 3 * J }
    const apres: Etat = { ...base, recompenses: [encaissee] }
    expect(etatRecompense(encaissee, apres, t0 + 4 * J)).toBe('encaissee')
    expect(cagnotte(apres, t0 + 4 * J)).toBeCloseTo(10)
  })

  it('la prochaine récompense indique ce qui manque', () => {
    const p = prochaineRecompense(etat, t0 + 1 * J)!
    expect(p.recompense.nom).toBe('Vélo')
    expect(p.joursManquants).toBeCloseTo(2)
    expect(p.chfManquants).toBeCloseTo(5)
    expect(p.progression).toBeCloseTo(1 / 3)
    expect(prochaineRecompense(base, t0)).toBeNull()
  })

  it('une récompense à palier ou prix nul (fichier importé) ne casse pas la barre', () => {
    const gratuite = { id: 'g', nom: 'g', prix: 0, palierJours: 0 }
    expect(avancementRecompense(gratuite, base, t0)).toBe(1)
  })
})

describe('cristaux', () => {
  it('check-ins, envies surmontées et paliers atteints rapportent un gain fixe', () => {
    const etat: Etat = {
      ...base,
      checkins: ['2023-11-15', '2023-11-16'],
      envies: [
        { date: t0 + J, surmontee: true, mode: 'respirer' },
        { date: t0 + J, surmontee: false, mode: 'jouer' },
      ],
    }
    // Jour 4 : 2 check-ins (10) + 1 envie surmontée (10) + palier 3 jours (50).
    expect(cristaux(etat, t0 + 4 * J)).toBe(70)
  })
})

describe('prix par unité', () => {
  it('divise le prix du paquet par le nombre d’unités, ou garde le prix unitaire', () => {
    expect(prixUnitaire(9, 20)).toBeCloseTo(0.45) // paquet de 20 à CHF 9
    expect(prixUnitaire(0.5)).toBe(0.5) // prix déjà par unité
  })
})
