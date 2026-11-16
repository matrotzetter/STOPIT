// La forme des données enregistrées sur l'appareil.
// On n'enregistre que des FAITS datés. Tout le reste (cagnotte, série…)
// est recalculé à partir de ces faits : voir calculs.ts.
// Toutes les dates sont des nombres : millisecondes depuis 1970 (comme Date.now()).

export type Produit = 'cigarettes' | 'vape' | 'snus' | 'autre'

export interface Profil {
  produit: Produit
  /** Consommation moyenne, en unités par jour. */
  consoParJour: number
  /** Prix d'une unité, en CHF. */
  prixParUnite: number
  /** Date et heure d'arrêt (peut être dans le futur). */
  dateArret: number
  raisons: string[]
}

export interface Recompense {
  id: string
  nom: string
  /** Prix en CHF. */
  prix: number
  /** Nombre de jours de série nécessaires. */
  palierJours: number
  /** Rempli quand la récompense a été encaissée. */
  encaisseeLe?: number
}

export interface Rechute {
  date: number
  unites: number
  declencheur?: string
  note?: string
}

export interface Envie {
  date: number
  surmontee: boolean
  mode: 'jouer' | 'respirer'
  /** De 1 à 5. */
  intensite?: number
  declencheur?: string
}

/** Un bâtiment ou une décoration posé sur l'île. */
export interface Batiment {
  /** Numéro de la case, de 0 (en haut à gauche) à 63 (en bas à droite). */
  case: number
  /** Identifiant dans le CATALOGUE de config.ts. */
  type: string
  niveau: number
}

/** L'apparence d'un petit personnage du mini-jeu. Purement décoratif. */
export interface Avatar {
  nom: string
  /** Couleurs au format « #rrggbb ». */
  peau: string
  cheveux: string
  pull: string
  /** Une des COIFFURES de config.ts. */
  coiffure: string
  lunettes?: boolean
  barbe?: boolean
  saxophone?: boolean
  /** true : il fait un « dab » de temps en temps. */
  dab?: boolean
}

export interface Etat {
  version: 1
  profil: Profil
  recompenses: Recompense[]
  rechutes: Rechute[]
  envies: Envie[]
  /** Jours où le check-in a été fait, au format « 2026-11-15 ». */
  checkins: string[]
  batiments: Batiment[]
  /** Meilleur score au mini-jeu. Ne sert qu'à l'affichage : il ne rapporte rien. */
  recordPuzzle?: number
  /** false = sons coupés. Absent = sons activés. */
  sons?: boolean
  /** Les deux personnages du mini-jeu. Absent = ceux par défaut (AVATARS_DEFAUT). */
  avatars?: Avatar[]
}
