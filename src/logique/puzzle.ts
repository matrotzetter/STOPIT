// Règles du mini-jeu : on pose des formes sur une grille ; une ligne ou une
// colonne entièrement remplie s'efface. Fonctions pures, sans affichage.

import { DESSINS_FORMES, POINTS_PAR_CASE, POINTS_PAR_LIGNE, PUZZLE_TAILLE as N } from '../config'

export interface Forme {
  /** Positions [colonne, ligne] des cases pleines, à partir du coin haut gauche. */
  cases: [number, number][]
  largeur: number
  hauteur: number
  /** Numéro de couleur, de 1 à 4. */
  couleur: number
}

/** Les formes de config.ts, converties du dessin en texte vers des positions. */
export const FORMES: Forme[] = DESSINS_FORMES.map((lignes, i) => ({
  cases: lignes.flatMap((ligne, y) => [...ligne].flatMap((c, x) => (c === '#' ? [[x, y] as [number, number]] : []))),
  largeur: lignes[0].length,
  hauteur: lignes.length,
  couleur: 1 + (i % 4),
}))

export interface Partie {
  /** N × N cases : 0 = vide, sinon le numéro de couleur de la forme posée. */
  grille: number[]
  /** Les 3 formes proposées ; null = déjà posée. */
  main: (Forme | null)[]
  score: number
}

/** Tire 3 formes au hasard. « hasard » renvoie un nombre entre 0 et 1 (remplaçable dans les tests). */
function tirerMain(hasard: () => number): Forme[] {
  return [0, 1, 2].map(() => FORMES[Math.floor(hasard() * FORMES.length)])
}

export function nouvellePartie(hasard: () => number = Math.random): Partie {
  return { grille: new Array(N * N).fill(0), main: tirerMain(hasard), score: 0 }
}

/** La forme tient-elle à cet endroit (coin haut gauche en colonne x, ligne y) ? */
export function peutPoser(grille: number[], forme: Forme, x: number, y: number): boolean {
  return forme.cases.every(([dx, dy]) => {
    const cx = x + dx
    const cy = y + dy
    return cx >= 0 && cx < N && cy >= 0 && cy < N && grille[cy * N + cx] === 0
  })
}

/** Vrai si plus aucune des formes restantes ne peut être posée : la partie est finie. */
export function estBloquee(partie: Partie): boolean {
  return !partie.main.some(
    (forme) => forme && partie.grille.some((_, i) => peutPoser(partie.grille, forme, i % N, Math.floor(i / N))),
  )
}

/**
 * Pose la forme n° indexMain en (x, y). Renvoie la nouvelle partie et les
 * cases effacées, ou null si le coup n'est pas permis.
 */
export function jouerCoup(
  partie: Partie,
  indexMain: number,
  x: number,
  y: number,
  hasard: () => number = Math.random,
): { partie: Partie; effacees: number[] } | null {
  const forme = partie.main[indexMain]
  if (!forme || !peutPoser(partie.grille, forme, x, y)) return null

  const grille = [...partie.grille]
  for (const [dx, dy] of forme.cases) grille[(y + dy) * N + (x + dx)] = forme.couleur

  // Cherche les lignes et les colonnes entièrement remplies.
  const indices = [...Array(N).keys()] // 0, 1, …, N − 1
  const lignesPleines = indices.filter((l) => indices.every((c) => grille[l * N + c] !== 0))
  const colonnesPleines = indices.filter((c) => indices.every((l) => grille[l * N + c] !== 0))
  const effacees = [
    ...new Set([
      ...lignesPleines.flatMap((l) => indices.map((c) => l * N + c)),
      ...colonnesPleines.flatMap((c) => indices.map((l) => l * N + c)),
    ]),
  ]
  for (const i of effacees) grille[i] = 0

  let main = partie.main.map((f, i) => (i === indexMain ? null : f))
  // Les 3 formes sont posées : on en tire 3 nouvelles.
  if (main.every((f) => f === null)) main = tirerMain(hasard)

  const score =
    partie.score +
    forme.cases.length * POINTS_PAR_CASE +
    (lignesPleines.length + colonnesPleines.length) * POINTS_PAR_LIGNE
  return { partie: { grille, main, score }, effacees }
}
