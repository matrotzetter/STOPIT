// Petites fonctions d'affichage : transformer des nombres en texte lisible.

import type { Produit } from './logique/types'

/** Nom de l'unité selon le produit. */
export const NOM_UNITE: Record<Produit, string> = {
  cigarettes: 'cigarettes',
  vape: 'unités',
  snus: 'sachets',
  autre: 'unités',
}

/** 12.5 → « CHF 12.50 » */
export const chf = (montant: number) => `CHF ${montant.toFixed(2)}`

/** Ce qui manque pour une récompense : « Il manque 2 j et CHF 5.00 » (seulement ce qui manque vraiment). */
export function texteManque(joursManquants: number, chfManquants: number): string {
  const morceaux = [joursManquants > 0 && `${Math.ceil(joursManquants)} j`, chfManquants > 0 && chf(chfManquants)]
  return 'Il manque ' + morceaux.filter(Boolean).join(' et ')
}

/** Durée en millisecondes → « 3 j 04 h 12 min » (et « 05 s » si demandé). */
export function duree(ms: number, avecSecondes = false): string {
  const total = Math.floor(ms / 1000)
  const j = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const min = Math.floor((total % 3600) / 60)
  const s = total % 60
  const deuxChiffres = (n: number) => String(n).padStart(2, '0')
  let texte = `${j} j ${deuxChiffres(h)} h ${deuxChiffres(min)} min`
  if (avecSecondes) texte += ` ${deuxChiffres(s)} s`
  return texte
}
