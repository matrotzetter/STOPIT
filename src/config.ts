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

/** Cristaux gagnés pour chaque check-in quotidien. */
export const CRISTAUX_PAR_CHECKIN = 5

/** Cristaux gagnés pour chaque envie surmontée. */
export const CRISTAUX_PAR_ENVIE = 10

/** Cristaux gagnés chaque fois qu'un palier de jours cumulés est atteint. */
export const CRISTAUX_PAR_PALIER = 50
