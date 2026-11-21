// Règles du jeu de l'île : brume, énergie, bâtiments.
// Comme dans calculs.ts, ce sont des fonctions pures : tout est recalculé à
// partir des faits enregistrés et de l'heure actuelle. L'île avance donc
// même quand l'app est fermée, et jamais grâce au temps passé à jouer.

import {
  CARTE,
  CATALOGUE,
  CRISTAUX_AMELIORATION,
  ENERGIE_PAR_HEURE,
  JOURS_DEGAGEMENT,
  NIVEAU_MAX,
  PALIERS_JOURS,
  type ModeleBatiment,
} from '../config'
import { JOUR_MS, cristaux, tempsCumuleMs } from './calculs'
import type { Etat } from './types'

/** Nombre de cases par côté. */
export const TAILLE = CARTE.length

/** Zone de chaque case. La case n° i est à la ligne i ÷ TAILLE, colonne i modulo TAILLE. */
export const ZONE_DE_CASE: number[] = CARTE.flatMap((ligne) => [...ligne].map(Number))

/** Cases d'une zone, dans l'ordre où la brume se lève : de la côte (en bas) vers le sommet. */
function casesDeZone(zone: number): number[] {
  return ZONE_DE_CASE.map((_, i) => i)
    .filter((i) => ZONE_DE_CASE[i] === zone)
    .reverse()
}

/** Moment où une zone s'ouvre : date d'arrêt + son palier de jours cumulés. */
export function ouvertureZone(etat: Etat, zone: number): number {
  return etat.profil.dateArret + PALIERS_JOURS[zone] * JOUR_MS
}

/**
 * Moment à partir duquel la brume d'une zone se dissipe : son ouverture, ou la
 * dernière rechute survenue pendant qu'elle était la dernière zone ouverte.
 * Renvoie null si la zone n'est pas encore ouverte.
 */
function debutDegagement(etat: Etat, zone: number, maintenant: number): number | null {
  const ouverture = ouvertureZone(etat, zone)
  if (maintenant < ouverture) return null
  // Tant que la zone suivante n'est pas ouverte, celle-ci est « la dernière zone ouverte ».
  const ouvertureSuivante = zone + 1 < PALIERS_JOURS.length ? ouvertureZone(etat, zone + 1) : Infinity
  let debut = ouverture
  for (const r of etat.rechutes) {
    if (r.date <= maintenant && r.date >= ouverture && r.date < ouvertureSuivante) {
      debut = Math.max(debut, r.date)
    }
  }
  return debut
}

/** Pour chaque case : true si la brume est levée. */
export function casesDegagees(etat: Etat, maintenant: number): boolean[] {
  const degagees: boolean[] = new Array(TAILLE * TAILLE).fill(false)
  PALIERS_JOURS.forEach((_, zone) => {
    const debut = debutDegagement(etat, zone, maintenant)
    if (debut === null) return
    // De 0 (rien de dégagé) à 1 (zone entièrement dégagée).
    const avancement = Math.min(1, (maintenant - debut) / (JOURS_DEGAGEMENT * JOUR_MS))
    const cases = casesDeZone(zone)
    cases.slice(0, Math.floor(cases.length * avancement)).forEach((c) => (degagees[c] = true))
  })
  return degagees
}

/** Retrouve un modèle du catalogue par son identifiant. */
export function modele(type: string): ModeleBatiment | undefined {
  return CATALOGUE.find((m) => m.id === type)
}

/** Une décoration (sans coût en énergie) ne s'améliore pas. */
export function estAmeliorable(m: ModeleBatiment): boolean {
  return m.energie > 0
}

/** Coût pour passer du niveau donné au niveau suivant. */
export function coutAmelioration(m: ModeleBatiment, niveau: number) {
  return { energie: m.energie * niveau, cristaux: CRISTAUX_AMELIORATION * niveau }
}

/** Tout ce qu'a coûté un bâtiment arrivé à ce niveau : sa construction et ses améliorations. */
export function coutTotal(m: ModeleBatiment, niveau: number) {
  let energieTotale = m.energie
  let cristauxTotaux = m.cristaux
  for (let n = 1; n < niveau; n++) {
    const cout = coutAmelioration(m, n)
    energieTotale += cout.energie
    cristauxTotaux += cout.cristaux
  }
  return { energie: energieTotale, cristaux: cristauxTotaux }
}

/** Total dépensé pour tous les bâtiments posés (construction + améliorations). */
function depenses(etat: Etat) {
  let energieDepensee = 0
  let cristauxDepenses = 0
  for (const b of etat.batiments) {
    const m = modele(b.type)
    if (!m) continue
    const cout = coutTotal(m, b.niveau)
    energieDepensee += cout.energie
    cristauxDepenses += cout.cristaux
  }
  return { energie: energieDepensee, cristaux: cristauxDepenses }
}

/** Énergie disponible = heures cumulées sans nicotine × taux horaire − énergie dépensée. */
export function energie(etat: Etat, maintenant: number): number {
  const heures = tempsCumuleMs(etat, maintenant) / (JOUR_MS / 24)
  return Math.max(0, heures * ENERGIE_PAR_HEURE - depenses(etat).energie)
}

/** Cristaux disponibles = cristaux gagnés − cristaux dépensés sur l'île. */
export function soldeCristaux(etat: Etat, maintenant: number): number {
  return Math.max(0, cristaux(etat, maintenant) - depenses(etat).cristaux)
}

/** Explique pourquoi on ne peut pas construire ici, ou renvoie null si c'est possible. */
export function refusConstruction(etat: Etat, numCase: number, type: string, maintenant: number): string | null {
  const m = modele(type)
  if (!m) return 'Bâtiment inconnu'
  if (!casesDegagees(etat, maintenant)[numCase]) return 'Case encore dans la brume'
  if (etat.batiments.some((b) => b.case === numCase)) return 'Case déjà occupée'
  if (ZONE_DE_CASE[numCase] < m.zoneMin) return `Réservé à la zone ${m.zoneMin + 1} et au-delà`
  if (energie(etat, maintenant) < m.energie) return 'Pas assez d’énergie'
  if (soldeCristaux(etat, maintenant) < m.cristaux) return 'Pas assez de cristaux'
  return null
}

/** Pose un bâtiment. Ne change rien si ce n'est pas permis. */
export function construire(etat: Etat, numCase: number, type: string, maintenant: number): Etat {
  if (refusConstruction(etat, numCase, type, maintenant)) return etat
  return { ...etat, batiments: [...etat.batiments, { case: numCase, type, niveau: 1 }] }
}

/** Explique pourquoi on ne peut pas améliorer le bâtiment de cette case, ou renvoie null. */
export function refusAmelioration(etat: Etat, numCase: number, maintenant: number): string | null {
  const b = etat.batiments.find((x) => x.case === numCase)
  const m = b && modele(b.type)
  if (!b || !m) return 'Aucun bâtiment ici'
  if (!estAmeliorable(m)) return 'Une décoration ne s’améliore pas'
  if (b.niveau >= NIVEAU_MAX) return 'Niveau maximum atteint'
  if (!casesDegagees(etat, maintenant)[numCase]) return 'Case encore dans la brume'
  const cout = coutAmelioration(m, b.niveau)
  if (energie(etat, maintenant) < cout.energie) return 'Pas assez d’énergie'
  if (soldeCristaux(etat, maintenant) < cout.cristaux) return 'Pas assez de cristaux'
  return null
}

/** Monte le bâtiment d'un niveau. Ne change rien si ce n'est pas permis. */
export function ameliorer(etat: Etat, numCase: number, maintenant: number): Etat {
  if (refusAmelioration(etat, numCase, maintenant)) return etat
  return {
    ...etat,
    batiments: etat.batiments.map((b) => (b.case === numCase ? { ...b, niveau: b.niveau + 1 } : b)),
  }
}

/** Explique pourquoi on ne peut pas déconstruire le bâtiment de cette case, ou renvoie null. */
export function refusDeconstruction(etat: Etat, numCase: number, maintenant: number): string | null {
  if (!etat.batiments.some((b) => b.case === numCase)) return 'Aucun bâtiment ici'
  if (!casesDegagees(etat, maintenant)[numCase]) return 'Case encore dans la brume'
  return null
}

/**
 * Retire le bâtiment de la case. Ne change rien si ce n'est pas permis.
 * Comme les dépenses sont recalculées à partir des bâtiments posés, tout ce qu'il
 * avait coûté (construction et améliorations, voir coutTotal) redevient disponible.
 */
export function deconstruire(etat: Etat, numCase: number, maintenant: number): Etat {
  if (refusDeconstruction(etat, numCase, maintenant)) return etat
  return { ...etat, batiments: etat.batiments.filter((b) => b.case !== numCase) }
}
