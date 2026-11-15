// Tests des règles du mini-jeu. Lancer avec : npm test
import { describe, expect, it } from 'vitest'
import { PUZZLE_TAILLE as N } from '../config'
import { cristaux } from './calculs'
import { energie, soldeCristaux } from './ile'
import { FORMES, formesEnJeu, estBloquee, jouerCoup, nouvellePartie, peutPoser, type Forme, type Partie } from './puzzle'
import type { Etat } from './types'

const point = FORMES[0] // une seule case
const barre4 = FORMES.find((f) => f.largeur === 4)! // ####
const carre = FORMES.find((f) => f.largeur === 2 && f.cases.length === 4)! // 2 × 2

/** Fabrique une partie avec une grille et une main choisies. */
function partie(pleines: number[], main: (Forme | null)[]): Partie {
  const grille = new Array(N * N).fill(0)
  for (const i of pleines) grille[i] = 1
  return { grille, main, score: 0 }
}

describe('poser une forme', () => {
  it('refuse de sortir de la grille ou de recouvrir une case pleine', () => {
    const vide = new Array(N * N).fill(0)
    expect(peutPoser(vide, barre4, 0, 0)).toBe(true)
    expect(peutPoser(vide, barre4, N - 3, 0)).toBe(false) // dépasse à droite
    expect(peutPoser(vide, point, -1, 0)).toBe(false)
    expect(peutPoser(partie([1], []).grille, barre4, 0, 0)).toBe(false) // case occupée
  })

  it('un coup interdit ne change rien', () => {
    const p = partie([0], [point, point, point])
    expect(jouerCoup(p, 0, 0, 0)).toBeNull()
  })

  it('poser rapporte 1 point par case et retire la forme de la main', () => {
    const resultat = jouerCoup(partie([], [carre, point, point]), 0, 0, 0)!
    expect(resultat.partie.score).toBe(4)
    expect(resultat.partie.main[0]).toBeNull()
    expect(resultat.effacees).toEqual([])
  })
})

describe('lignes complétées', () => {
  it('une ligne pleine s’efface et rapporte 10 points', () => {
    // Ligne du haut remplie sauf les 4 dernières cases, complétée par la barre de 4.
    const p = partie([0, 1, 2, 3], [barre4, point, point])
    const resultat = jouerCoup(p, 0, 4, 0)!
    expect(resultat.effacees).toHaveLength(N)
    expect(resultat.partie.grille.every((c) => c === 0)).toBe(true)
    expect(resultat.partie.score).toBe(4 + 10)
  })

  it('une ligne et une colonne complétées en même temps s’effacent toutes les deux', () => {
    // Tout le haut et toute la gauche sont remplis, sauf le coin.
    const haut = [1, 2, 3, 4, 5, 6, 7]
    const gauche = [1, 2, 3, 4, 5, 6, 7].map((l) => l * N)
    const resultat = jouerCoup(partie([...haut, ...gauche], [point, point, point]), 0, 0, 0)!
    expect(resultat.effacees).toHaveLength(2 * N - 1)
    expect(resultat.partie.score).toBe(1 + 20)
  })
})

describe('déroulement', () => {
  it('trois nouvelles formes arrivent quand la main est vide', () => {
    const resultat = jouerCoup(partie([], [null, null, point]), 2, 0, 0, () => 0)!
    expect(resultat.partie.main).toEqual([FORMES[0], FORMES[0], FORMES[0]])
  })

  it('la partie est bloquée quand aucune forme restante ne rentre', () => {
    expect(estBloquee(nouvellePartie())).toBe(false)
    // Grille en damier : seule une forme d'une case peut encore être posée.
    const damier = [...Array(N * N).keys()].filter((i) => (i + Math.floor(i / N)) % 2 === 0)
    expect(estBloquee(partie(damier, [carre, barre4, null]))).toBe(true)
    expect(estBloquee(partie(damier, [carre, point, null]))).toBe(false)
  })
})

describe('difficulté', () => {
  it('au début, seules les formes les plus faciles sont proposées', () => {
    expect(formesEnJeu(0)).toEqual(FORMES.slice(0, 10))
    expect(formesEnJeu(0).every((f) => f.cases.length <= 4)).toBe(true)
  })

  it('les formes avancent d’un cran tous les 25 points, jusqu’aux plus difficiles', () => {
    expect(formesEnJeu(24)[0]).toBe(FORMES[0])
    expect(formesEnJeu(25)[0]).toBe(FORMES[1])
    expect(formesEnJeu(1_000_000)).toEqual(FORMES.slice(-10))
  })

  it('la nouvelle main dépend du score atteint', () => {
    const p = { ...partie([], [null, null, point]), score: 1_000_000 }
    const resultat = jouerCoup(p, 2, 0, 0, () => 0)!
    expect(resultat.partie.main[0]).toBe(FORMES[FORMES.length - 10])
  })
})

describe('le jeu ne rapporte rien', () => {
  it('un record au mini-jeu ne donne ni énergie ni cristaux', () => {
    const t0 = 1_700_000_000_000
    const maintenant = t0 + 5 * 24 * 3600 * 1000
    const sansRecord: Etat = {
      version: 1,
      profil: { produit: 'cigarettes', consoParJour: 10, prixParUnite: 0.5, dateArret: t0, raisons: ['a', 'b', 'c'] },
      recompenses: [],
      rechutes: [],
      envies: [],
      checkins: [],
      batiments: [],
    }
    const avecRecord: Etat = { ...sansRecord, recordPuzzle: 99999 }
    expect(energie(avecRecord, maintenant)).toBe(energie(sansRecord, maintenant))
    expect(cristaux(avecRecord, maintenant)).toBe(cristaux(sansRecord, maintenant))
    expect(soldeCristaux(avecRecord, maintenant)).toBe(soldeCristaux(sansRecord, maintenant))
  })
})
