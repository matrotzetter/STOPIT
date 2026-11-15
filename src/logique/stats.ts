// Statistiques sur les envies. Fonctions pures : elles ne font que compter.

import { cleJour } from './calculs'
import type { Envie } from './types'

/** Nombre d'envies pour chacun des derniers jours, du plus ancien à aujourd'hui. */
export function enviesParJour(envies: Envie[], maintenant: number, nbJours = 14): { jour: string; total: number }[] {
  const resultat = []
  for (let i = nbJours - 1; i >= 0; i--) {
    // setDate recule d'un jour de calendrier (plus sûr que de retirer 24 h, à cause des changements d'heure).
    const date = new Date(maintenant)
    date.setDate(date.getDate() - i)
    const jour = cleJour(date.getTime())
    resultat.push({ jour, total: envies.filter((e) => cleJour(e.date) === jour).length })
  }
  return resultat
}

/** Déclencheurs notés, du plus fréquent au moins fréquent. */
export function declencheursFrequents(envies: Envie[]): { nom: string; total: number }[] {
  const compteur = new Map<string, number>()
  for (const e of envies) {
    if (e.declencheur) compteur.set(e.declencheur, (compteur.get(e.declencheur) ?? 0) + 1)
  }
  return [...compteur].map(([nom, total]) => ({ nom, total })).sort((a, b) => b.total - a.total)
}

/** Nombre d'envies pour chaque heure de la journée : 24 valeurs, de 0 h à 23 h. */
export function enviesParHeure(envies: Envie[]): number[] {
  const heures: number[] = new Array(24).fill(0)
  for (const e of envies) heures[new Date(e.date).getHours()]++
  return heures
}
