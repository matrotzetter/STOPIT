# Cagnotte

Application web personnelle (PWA, mobile-first) pour arrêter la nicotine : l'argent
non dépensé alimente une cagnotte qui débloque des récompenses réelles ; une île
dans la brume rend la progression visible.

L'utilisateur est débutant en programmation : expliquer en français simple,
commenter le code en français, ne pas supposer qu'il connaît les outils.

## Commandes

- `npm run dev` : lance l'app en développement (http://localhost:5173)
- `npm test` : exécute les tests des règles de calcul
- `npm run build` : dessine les icônes, vérifie les types, puis fabrique la version
  finale dans `dist/`
- `npm run preview` : sert `dist/` sur http://localhost:4173 (pour tester le hors-ligne)

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

## Règles de l'île (`src/logique/ile.ts`)

- Carte 8 × 8 décrite dans `CARTE` (`config.ts`) : chaque chiffre = zone de la case.
- La zone i s'ouvre à `PALIERS_JOURS[i]` jours cumulés (3, 7, 14, 30, 60, 90), puis
  se dégage case par case en 3 jours, de la côte vers le sommet.
- Rechute : la dernière zone ouverte se recouvre, puis se redégage en 3 jours.
  Les bâtiments sous la brume sont conservés mais cachés.
- Énergie = heures cumulées × 10 − énergie dépensée. Cristaux disponibles =
  cristaux gagnés − cristaux dépensés. Les dépenses sont recalculées à partir des
  bâtiments posés (pas de compteur enregistré).
- Bâtiments : coût en énergie, améliorables jusqu'au niveau 3 (énergie + cristaux).
  Décorations : coût en cristaux, non améliorables. Purement visuels.
- Monuments : un trophée par récompense encaissée, sur la plage sous la carte.

## Avancement

- [x] (a) structure + premier lancement + accueil
- [x] (b) mode Envie avec respiration guidée (option « Jouer » désactivée jusqu'à
  l'étape e ; le minuteur se calcule depuis l'heure de départ)
- [x] (c) récompenses + rechute (une récompense encaissée n'est plus modifiable ni
  supprimable : son prix resterait sinon dans la cagnotte)
- [x] (d) île : grille, brume, énergie, bâtiments
- [x] (e) mini-jeu + cristaux (règles dans `src/logique/puzzle.ts`, dessin Canvas
  dans `src/ecrans/MiniJeu.tsx` ; le score ne nourrit que `recordPuzzle`, jamais
  l'énergie ni les cristaux ; entraînement accessible depuis l'écran Île)
- [x] (f) statistiques + réglages (`src/logique/stats.ts` ; `lireEtat` dans
  `src/stockage.ts` valide aussi bien le stockage que l'import ; le formulaire
  `PremierLancement` sert aussi à modifier le profil via la prop `existant` ;
  sons générés dans `src/sons.ts`, coupés par `etat.sons === false`)
- [x] (g) PWA + mise en ligne GitHub Pages (téléphone : iPhone). `vite-plugin-pwa`
  génère le service worker ; `scripts/icones.mjs` dessine les icônes PNG dans
  `public/` (dossier ignoré par git, recréé à chaque build) ;
  `.github/workflows/deploy.yml` teste, construit et publie à chaque push sur main.
  Reste à faire par l'utilisateur : créer le dépôt GitHub, pousser, activer Pages.

- [x] (h) mini-jeu en volume + ambiance cosy + avatars. Le plateau est vu de biais
  (`APLATI` dans `MiniJeu.tsx`), sans bibliothèque 3D. Les deux avatars
  (`etat.avatars`, facultatif) sont dessinés par `src/avatar.ts` et réglés dans
  `src/ecrans/Avatars.tsx` (Réglages → Mes avatars) ; `avatarsDe` complète ce qui
  manque avec `AVATARS_DEFAUT`. Purement décoratifs.

- [x] (i) île en 3D isométrique (`CarteIle` dans `Ile.tsx` : losanges SVG, hauteur
  selon la zone, cases dessinées du fond vers l'avant via `ORDRE`), en tête de
  l'accueil. Avatars en volume, option `saxophone`, posés sur la plage de l'île
  par-dessus le SVG (composant `Apercu` de `Avatars.tsx`, classe `avatar-ile`).

- [x] (j) nouveau thème « soirée au coin du feu » (nuit prune, dégradé ambre → corail,
  police arrondie ; toutes les couleurs sont des variables en tête de `styles.css`).
  Mini-jeu plus difficile : `DESSINS_FORMES` est rangé du facile au difficile et
  `formesEnJeu(score)` fait glisser un groupe de `PUZZLE_FORMES_EN_JEU` formes d'un
  cran tous les `PUZZLE_POINTS_PAR_CRAN` points.

- [x] (k) avatars en pixel art (16 × 21 gros pixels) : `CALQUES` dans `src/avatar.ts`
  décrit chaque calque en texte (corps, cheveux, barbe, lunettes, saxophone) ;
  `dessinerAvatar` les superpose, avec respiration, clignement et regard.
  Animations (avatars, feu, braises, lucioles, vagues, guirlande) coupées par
  `ANIME` / `prefers-reduced-motion`. Le mini-jeu se redessine à chaque image.

À chaque fin d'étape : lancer l'app, exécuter les tests, dire quoi tester, faire
un commit, attendre le retour de l'utilisateur.
