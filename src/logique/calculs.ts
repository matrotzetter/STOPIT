// Règles de calcul de l'app.
// Ce sont des fonctions « pures » : elles reçoivent les données et l'heure
// actuelle, et renvoient un résultat, sans rien modifier ni afficher.
// C'est ce qui permet de les tester automatiquement (calculs.test.ts).

import { CRISTAUX_PAR_CHECKIN, CRISTAUX_PAR_ENVIE, CRISTAUX_PAR_PALIER, PALIERS_JOURS } from '../config'
import type { Etat, Profil, Rechute, Recompense } from './types'

/** Nombre de millisecondes dans un jour. */
export const JOUR_MS = 24 * 60 * 60 * 1000

/** Additionne une liste de nombres. */
const somme = (nombres: number[]) => nombres.reduce((total, n) => total + n, 0)

/**
 * Les rechutes qui comptent : après l'arrêt, pas dans le futur, triées par date.
 * Tous les calculs passent par ici, pour que série et cagnotte suivent la même règle.
 */
function rechutesComptees(etat: Etat, maintenant: number): Rechute[] {
  return etat.rechutes
    .filter((r) => r.date >= etat.profil.dateArret && r.date <= maintenant)
    .sort((a, b) => a.date - b.date)
}

/** Dates des rechutes qui comptent. */
function datesRechutes(etat: Etat, maintenant: number): number[] {
  return rechutesComptees(etat, maintenant).map((r) => r.date)
}

/** Prix d'une unité : le prix saisi, divisé par le nombre d'unités s'il s'agit d'un paquet. */
export function prixUnitaire(prix: number, unitesParPaquet?: number): number {
  return unitesParPaquet ? prix / unitesParPaquet : prix
}

/** Économie par jour = consommation par jour × prix par unité. */
export function economieParJour(profil: Profil): number {
  return profil.consoParJour * profil.prixParUnite
}

/**
 * Temps cumulé sans nicotine, toutes périodes confondues.
 * Une rechute est un instant : elle ne retire pas de temps, mais son coût
 * est retiré de la cagnotte et elle remet la série à zéro.
 * Vaut 0 tant que la date d'arrêt est dans le futur.
 */
export function tempsCumuleMs(etat: Etat, maintenant: number): number {
  return Math.max(0, maintenant - etat.profil.dateArret)
}

/** Série en cours = temps écoulé depuis l'arrêt ou depuis la dernière rechute. */
export function serieMs(etat: Etat, maintenant: number): number {
  const debut = Math.max(etat.profil.dateArret, ...datesRechutes(etat, maintenant))
  return Math.max(0, maintenant - debut)
}

/** Meilleure série = plus long intervalle entre l'arrêt, les rechutes et maintenant. */
export function meilleureSerieMs(etat: Etat, maintenant: number): number {
  const points = [etat.profil.dateArret, ...datesRechutes(etat, maintenant), maintenant]
  let meilleure = 0
  for (let i = 1; i < points.length; i++) {
    meilleure = Math.max(meilleure, points[i] - points[i - 1])
  }
  return meilleure
}

/** Total des unités consommées lors des rechutes. */
function unitesRechutes(etat: Etat, maintenant: number): number {
  return somme(rechutesComptees(etat, maintenant).map((r) => r.unites))
}

/**
 * Solde = économies cumulées − coût des rechutes − récompenses encaissées.
 * Il peut être négatif : après une rechute plus chère que ce qui était en cagnotte,
 * il reste un retard à rattraper avant que la cagnotte ne remonte.
 */
export function soldeCagnotte(etat: Etat, maintenant: number): number {
  const economies = economieParJour(etat.profil) * (tempsCumuleMs(etat, maintenant) / JOUR_MS)
  const coutRechutes = unitesRechutes(etat, maintenant) * etat.profil.prixParUnite
  const encaisse = somme(etat.recompenses.filter((r) => r.encaisseeLe).map((r) => r.prix))
  return economies - coutRechutes - encaisse
}

/** Cagnotte = le solde, mais jamais négative : un retard s'affiche comme 0. */
export function cagnotte(etat: Etat, maintenant: number): number {
  return Math.max(0, soldeCagnotte(etat, maintenant))
}

/** Unités non consommées depuis l'arrêt (rechutes déduites). */
export function unitesNonConsommees(etat: Etat, maintenant: number): number {
  const evitees = etat.profil.consoParJour * (tempsCumuleMs(etat, maintenant) / JOUR_MS)
  return Math.max(0, evitees - unitesRechutes(etat, maintenant))
}

export type EtatRecompense = 'verrouillee' | 'debloquee' | 'encaissee'

/** Une récompense est débloquée si série ≥ palier ET cagnotte ≥ prix. */
export function etatRecompense(r: Recompense, etat: Etat, maintenant: number): EtatRecompense {
  if (r.encaisseeLe) return 'encaissee'
  const serieOk = serieMs(etat, maintenant) >= r.palierJours * JOUR_MS
  const cagnotteOk = cagnotte(etat, maintenant) >= r.prix
  return serieOk && cagnotteOk ? 'debloquee' : 'verrouillee'
}

export interface Prochaine {
  recompense: Recompense
  joursManquants: number
  chfManquants: number
  /** De 0 à 1 : avancement du critère le plus en retard (jours ou CHF). */
  progression: number
}

/**
 * Avancement vers une récompense, de 0 à 1 : celui du critère le plus en retard
 * (jours de série ou argent en cagnotte). Un palier ou un prix nul compte comme atteint.
 */
export function avancementRecompense(r: Recompense, etat: Etat, maintenant: number): number {
  const jours = r.palierJours > 0 ? serieMs(etat, maintenant) / JOUR_MS / r.palierJours : 1
  const argent = r.prix > 0 ? cagnotte(etat, maintenant) / r.prix : 1
  return Math.min(1, jours, argent)
}

/** La prochaine récompense à viser : la non encaissée au plus petit palier. */
export function prochaineRecompense(etat: Etat, maintenant: number): Prochaine | null {
  const candidates = etat.recompenses
    .filter((r) => !r.encaisseeLe)
    .sort((a, b) => a.palierJours - b.palierJours || a.prix - b.prix)
  const recompense = candidates[0]
  if (!recompense) return null

  const serieJours = serieMs(etat, maintenant) / JOUR_MS
  const argent = cagnotte(etat, maintenant)
  return {
    recompense,
    joursManquants: Math.max(0, recompense.palierJours - serieJours),
    chfManquants: Math.max(0, recompense.prix - argent),
    progression: avancementRecompense(recompense, etat, maintenant),
  }
}

/** Cristaux = gains fixes par check-in, par envie surmontée et par palier atteint. */
export function cristaux(etat: Etat, maintenant: number): number {
  const joursCumules = tempsCumuleMs(etat, maintenant) / JOUR_MS
  const paliersAtteints = PALIERS_JOURS.filter((p) => joursCumules >= p).length
  return (
    etat.checkins.length * CRISTAUX_PAR_CHECKIN +
    etat.envies.filter((e) => e.surmontee).length * CRISTAUX_PAR_ENVIE +
    paliersAtteints * CRISTAUX_PAR_PALIER
  )
}

/** Clé du jour au format « 2026-11-15 », dans le fuseau horaire de l'appareil. */
export function cleJour(date: number): string {
  // La locale suédoise ('sv') écrit les dates dans ce format.
  return new Date(date).toLocaleDateString('sv')
}
