// Enregistrement des données sur l'appareil, dans le « localStorage » du
// navigateur : un petit espace de stockage propre à ce site, sans serveur.

import { migrerCarte } from './logique/ile'
import type { Etat } from './logique/types'

const CLE = 'cagnotte-etat'

/** Les listes que doit contenir un état. */
const LISTES = ['recompenses', 'rechutes', 'envies', 'checkins', 'batiments'] as const

/**
 * Transforme un texte JSON (enregistré ou importé) en état, ou renvoie null
 * s'il est illisible ou incomplet. Les listes absentes sont créées vides.
 */
export function lireEtat(texte: string): Etat | null {
  try {
    const donnees = JSON.parse(texte)
    const profil = donnees?.profil
    const estNombre = (x: unknown) => typeof x === 'number' && Number.isFinite(x)
    if (
      !profil ||
      !estNombre(profil.consoParJour) ||
      !estNombre(profil.prixParUnite) ||
      !estNombre(profil.dateArret) ||
      !Array.isArray(profil.raisons)
    ) {
      return null
    }
    for (const liste of LISTES) {
      if (liste in donnees && !Array.isArray(donnees[liste])) return null
    }
    // shortcut: le contenu de chaque liste n'est pas vérifié élément par élément ;
    // à renforcer si l'on importe un jour des fichiers venant d'ailleurs que de l'export de l'app.
    // Les données d'une ancienne version (carte 8 × 8) sont mises à jour au passage.
    return migrerCarte({ version: 1, recompenses: [], rechutes: [], envies: [], checkins: [], batiments: [], ...donnees })
  } catch {
    return null
  }
}

/** Lit les données enregistrées. Renvoie null au tout premier lancement. */
export function charger(): Etat | null {
  try {
    const texte = localStorage.getItem(CLE)
    const etat = texte ? lireEtat(texte) : null
    // Données d'une ancienne version, mises à jour par lireEtat : on enregistre tout de suite la version à jour.
    if (etat && JSON.parse(texte!).carte !== etat.carte) sauvegarder(etat)
    return etat
  } catch {
    // Stockage indisponible : on repart du premier lancement.
    return null
  }
}

/** Enregistre toutes les données. Renvoie false si l'enregistrement a échoué. */
export function sauvegarder(etat: Etat): boolean {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat))
    return true
  } catch {
    // Stockage plein ou bloqué par le navigateur.
    return false
  }
}

/** Efface toutes les données de l'appareil. */
export function effacer(): void {
  try {
    localStorage.removeItem(CLE)
  } catch {
    // Stockage indisponible : il n'y a rien à effacer.
  }
}

/** Propose le téléchargement d'un fichier JSON contenant toutes les données (jeu compris). */
export function exporter(etat: Etat): void {
  const fichier = new Blob([JSON.stringify(etat, null, 2)], { type: 'application/json' })
  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(fichier)
  lien.download = `cagnotte-${new Date().toLocaleDateString('sv')}.json`
  lien.click()
  URL.revokeObjectURL(lien.href)
}

/**
 * Un identifiant unique pour une nouvelle récompense. crypto.randomUUID n'existe que sur une
 * page sécurisée (https ou localhost) : en test sur le Wi-Fi (http), on en fabrique un autrement.
 */
export function nouvelId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
