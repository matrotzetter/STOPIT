// Enregistrement des données sur l'appareil, dans le « localStorage » du
// navigateur : un petit espace de stockage propre à ce site, sans serveur.

import type { Etat } from './logique/types'

const CLE = 'cagnotte-etat'

/** Lit les données enregistrées. Renvoie null au tout premier lancement. */
export function charger(): Etat | null {
  try {
    const texte = localStorage.getItem(CLE)
    if (!texte) return null
    // « batiments: [] » d'abord : les données enregistrées avant l'arrivée de l'île n'ont pas ce champ.
    return { batiments: [], ...JSON.parse(texte) } as Etat
  } catch {
    // Stockage indisponible ou données illisibles : on repart du premier lancement.
    return null
  }
}

/** Enregistre toutes les données. */
export function sauvegarder(etat: Etat): void {
  localStorage.setItem(CLE, JSON.stringify(etat))
}
