// Toutes les constantes d'équilibrage sont ici.
// Pour ajuster le jeu, on ne modifie que ce fichier.

/** Paliers (en jours) proposés pour les récompenses, et qui ouvriront les zones de l'île. */
export const PALIERS_JOURS = [3, 7, 14, 30, 60, 90]

/** Durée du minuteur du mode Envie, en millisecondes (5 minutes). */
export const DUREE_ENVIE_MS = 5 * 60 * 1000

/** Rythme de la respiration guidée, en secondes. */
export const INSPIRATION_S = 4
export const EXPIRATION_S = 6

/** Déclencheurs proposés pour une envie ou une rechute. */
export const DECLENCHEURS = ['Stress', 'Café', 'Soirée', 'Ennui', 'Après un repas', 'Révisions', 'Autre']

// ---------- L'île ----------

/**
 * Carte de l'île : 8 lignes de 8 cases, le nord en haut.
 * Chaque chiffre est le numéro de zone de la case (0 = première zone, sur la côte).
 * La zone n° i s'ouvre au palier PALIERS_JOURS[i] de jours cumulés.
 */
export const CARTE = [
  '55555555',
  '55444455',
  '44433444',
  '43333334',
  '22311322',
  '22111122',
  '21100112',
  '20000002',
]

/** Énergie produite par heure sans nicotine. */
export const ENERGIE_PAR_HEURE = 10

/** Jours nécessaires pour dégager entièrement une zone ouverte (ou recouverte après une rechute). */
export const JOURS_DEGAGEMENT = 3

/** Niveau maximum d'un bâtiment. */
export const NIVEAU_MAX = 3

/** Cristaux pour améliorer un bâtiment : cette valeur × son niveau actuel. */
export const CRISTAUX_AMELIORATION = 20

export interface ModeleBatiment {
  id: string
  nom: string
  emoji: string
  /** Coût de construction en énergie. Une amélioration coûte ce montant × le niveau actuel. */
  energie: number
  /** Coût de construction en cristaux (les décorations ne coûtent que des cristaux). */
  cristaux: number
  /** Première zone (à partir de 0) où l'on peut le poser. */
  zoneMin: number
}

/** Tout ce qu'on peut poser sur l'île. */
export const CATALOGUE: ModeleBatiment[] = [
  // Bâtiments : coûtent de l'énergie, améliorables.
  { id: 'feu', nom: 'Feu de camp', emoji: '🔥', energie: 100, cristaux: 0, zoneMin: 0 },
  { id: 'cabane', nom: 'Cabane', emoji: '🛖', energie: 150, cristaux: 0, zoneMin: 0 },
  { id: 'potager', nom: 'Potager', emoji: '🌱', energie: 400, cristaux: 0, zoneMin: 1 },
  { id: 'puits', nom: 'Puits', emoji: '🪣', energie: 500, cristaux: 0, zoneMin: 1 },
  { id: 'atelier', nom: 'Atelier', emoji: '🔨', energie: 900, cristaux: 0, zoneMin: 2 },
  { id: 'ferme', nom: 'Ferme', emoji: '🐑', energie: 1200, cristaux: 0, zoneMin: 2 },
  { id: 'phare', nom: 'Phare', emoji: '🗼', energie: 2500, cristaux: 0, zoneMin: 3 },
  { id: 'observatoire', nom: 'Observatoire', emoji: '🔭', energie: 4000, cristaux: 0, zoneMin: 4 },
  { id: 'chateau', nom: 'Château', emoji: '🏯', energie: 8000, cristaux: 0, zoneMin: 5 },
  // Décorations : ne coûtent que des cristaux, non améliorables.
  { id: 'fleurs', nom: 'Fleurs', emoji: '🌸', energie: 0, cristaux: 20, zoneMin: 0 },
  { id: 'arbre', nom: 'Arbre', emoji: '🌳', energie: 0, cristaux: 30, zoneMin: 0 },
  { id: 'fontaine', nom: 'Fontaine', emoji: '⛲', energie: 0, cristaux: 80, zoneMin: 2 },
  { id: 'statue', nom: 'Statue', emoji: '🗿', energie: 0, cristaux: 150, zoneMin: 4 },
]

// ---------- Les cristaux ----------

/** Cristaux gagnés pour chaque check-in quotidien. */
export const CRISTAUX_PAR_CHECKIN = 5

/** Cristaux gagnés pour chaque envie surmontée. */
export const CRISTAUX_PAR_ENVIE = 10

/** Cristaux gagnés chaque fois qu'un palier de jours cumulés est atteint. */
export const CRISTAUX_PAR_PALIER = 50
