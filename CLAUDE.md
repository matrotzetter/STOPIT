# Cagnotte

Application web personnelle (PWA, mobile-first) pour arrêter la nicotine : l'argent
non dépensé alimente une cagnotte qui débloque des récompenses réelles ; une île
dans la brume rend la progression visible.

L'utilisateur est débutant en programmation : expliquer en français simple,
commenter le code en français, ne pas supposer qu'il connaît les outils.

## Commandes

- `npm run dev` : lance l'app en développement (http://localhost:5173)
- `npm test` : exécute les tests des règles de calcul
- `npm run build` : vérifie les types puis fabrique la version finale dans `dist/`

## Principes

- Aucun serveur, aucun compte : tout est dans le `localStorage` (clé `cagnotte-etat`).
- On n'enregistre que des faits datés (`src/logique/types.ts`). Cagnotte, série,
  cristaux, etc. sont recalculés à partir de ces faits et de l'heure actuelle :
  la progression avance donc même app fermée.
- Logique = fonctions pures dans `src/logique/`, testées, sans React.
- Toutes les constantes d'équilibrage dans `src/config.ts`.
- Aucune affirmation médicale. Aucun fichier image ou son externe.
- Aucune mécanique pour retenir l'utilisateur dans l'app.
- Interface en français, montants en CHF, thème sombre, gros boutons.

## Règles de calcul (`src/logique/calculs.ts`)

- Économie par jour = consommation par jour × prix par unité.
- Temps cumulé sans nicotine = maintenant − date d'arrêt (0 si future). Une rechute
  est un instant : elle ne retire pas de temps cumulé.
- Série = temps depuis l'arrêt ou depuis la dernière rechute.
- Cagnotte = économie par jour × jours cumulés − unités des rechutes × prix par
  unité − prix des récompenses encaissées. Jamais négative.
- Récompense débloquée si série ≥ palier ET cagnotte ≥ prix.
- Cristaux = gain fixe par check-in, par envie surmontée, par palier de jours
  cumulés atteint. Jamais convertis en argent.
- À venir (étape d) : énergie = heures cumulées × taux − dépenses ; zones de l'île
  selon les jours cumulés (3, 7, 14, 30, 60, 90) ; après une rechute, la dernière
  zone se recouvre de brume et se redégage en 3 jours.

## Avancement

- [x] (a) structure + premier lancement + accueil
- [x] (b) mode Envie avec respiration guidée (option « Jouer » désactivée jusqu'à
  l'étape e ; le minuteur se calcule depuis l'heure de départ)
- [x] (c) récompenses + rechute (une récompense encaissée n'est plus modifiable ni
  supprimable : son prix resterait sinon dans la cagnotte)
- [ ] (d) île : grille, brume, énergie, bâtiments
- [ ] (e) mini-jeu + cristaux
- [ ] (f) statistiques + réglages
- [ ] (g) PWA + mise en ligne GitHub Pages (téléphone : iPhone)

À chaque fin d'étape : lancer l'app, exécuter les tests, dire quoi tester, faire
un commit, attendre le retour de l'utilisateur.
