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
- Interface en français, montants en CHF, thème sombre, gros boutons, style pixel art.

## Règles de calcul (`src/logique/calculs.ts`)

- Économie par jour = consommation par jour × prix par unité.
- Temps cumulé sans nicotine = maintenant − date d'arrêt (0 si future). Une rechute
  est un instant : elle ne retire pas de temps cumulé.
- Série = temps depuis l'arrêt ou depuis la dernière rechute.
- Cagnotte = économie par jour × jours cumulés − unités des rechutes × prix par
  unité − prix des récompenses encaissées. Jamais négative : un solde négatif
  s'affiche comme 0, avec le retard à rattraper indiqué à part.
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

- [x] (h) habillage en pixel art, après plusieurs essais abandonnés (volume, 3D, chibi).
  État actuel, le seul à connaître :
  - Thème « soirée au coin du feu » : toutes les couleurs sont des variables en tête de
    `styles.css` (contours `--trait`, ombres dures `--ombre`, police à chasse fixe
    `--chiffres` pour les chiffres seulement). Tons doux, peu d'animations.
  - Avatars (`src/avatar.ts`) : 16 × 21 gros pixels. `CALQUES` décrit chaque calque en
    texte (corps, cheveux, barbe, lunettes, saxophone, dab) ; `dessinerAvatar` les
    superpose, avec respiration, clignement, regard et dab. Deux avatars dans
    `etat.avatars` (facultatif, complété par `AVATARS_DEFAUT` via `avatarsDe`), réglés
    dans `src/ecrans/Avatars.tsx`. Purement décoratifs.
  - Île et mini-jeu : chacun dans un `<canvas>` de très basse résolution (160 px de
    large pour l'île, ~115 pour le jeu), agrandi par `image-rendering: pixelated`.
    Tout se mesure en « gros pixels » entiers, avec `fillRect`. Motifs en texte dans
    `src/pixels.ts` (feu, nuage, flèche, `BATIMENTS`). Ciel de l'île selon l'heure
    (`periode`, `CIELS`).
  - Sur l'île, un SVG transparent posé par-dessus porte une zone par case : clics,
    clavier et lecteur d'écran passent par lui.
  - `animer()` dans `src/avatar.ts` : la seule boucle d'animation, 12 images par
    seconde, coupée par `prefers-reduced-motion` (`ANIME`).
  - Mini-jeu : `DESSINS_FORMES` est rangé du facile au difficile ; `formesEnJeu(score)`
    fait glisser un groupe de `PUZZLE_FORMES_EN_JEU` formes d'un cran tous les
    `PUZZLE_POINTS_PAR_CRAN` points.
  - Mode Envie : une raison d'arrêter affichée, barre de temps, avatars à la victoire,
    air de saxophone (`son('sax')`) si un avatar en a un.
- [x] (i) `soldeCagnotte` (peut être négatif) à côté de `cagnotte` (jamais négative) :
  l'accueil affiche « CHF x à rattraper » quand une rechute a coûté plus que la cagnotte.

- [x] (j) audit 6 à 10 : `prixUnitaire` (testé) pour le prix au paquet ; dessin de
  l'île dans `src/ecrans/CarteIle.tsx`, séparé de l'écran `Ile.tsx` ; boutons
  déclencheur partagés (`ChoixDeclencheur` dans `Rechute.tsx`) ; verrou d'écran
  redemandé au retour dans l'app ; `overrides` dans `package.json` force `glob` ≥ 14.0.6
  (alertes de sécurité de `workbox-build`) : à retirer quand `vite-plugin-pwa` l'inclura.

- [x] (k) île vivante, purement visuelle :
  - Saisons (`saison`, `SAISONS` dans `src/pixels.ts`) : couleurs du sol et du feuillage,
    pétales, feuilles ou flocons qui tombent ; en novembre, quelques flocons ; neige sur
    les toits en hiver.
  - Vie : voilier au large, mouettes (sauf la nuit), fumée (`CHEMINEES`), mouton près de
    la ferme. Ce qui passe devant les cases est dessiné après elles (`pardessus`).
  - Décoration « Club de jazz » (💎 60) : bouton « Écouter le concert » → `son('jazz')`
    (ii-V-I swing généré dans `src/sons.ts`) ; pendant `DUREE_CONCERT_MS`, les avatars
    s'arrêtent, le premier joue du sax, des notes montent.
  - Bouteille à la mer sur la plage (si des raisons existent) : cliquable sur l'écran Île
    seulement, affiche une raison au hasard dans un `.parchemin`.

- [x] (l) déconstruire : `deconstruire` / `refusDeconstruction` dans `src/logique/ile.ts`
  (testés). Rend tout le coût (`coutTotal` : construction + améliorations), ce qui découle
  directement des dépenses recalculées. Interdit sous la brume. Bouton avec confirmation.

Leçons pour la suite : avant toute refonte visuelle, montrer deux ou trois essais
côte à côte et demander ; poser une question quand la demande peut se comprendre de
deux façons ; rien n'a encore été vérifié sur l'iPhone.

À chaque fin d'étape : lancer l'app, exécuter les tests, dire quoi tester, faire
un commit, attendre le retour de l'utilisateur.
