# Cagnotte

Une application personnelle pour arrêter la nicotine. L'argent que tu ne dépenses
plus alimente une cagnotte, qui débloque les récompenses que tu as choisies. Une
île à dégager de la brume rend ta progression visible.

- Aucun compte, aucun serveur : tes données restent sur ton appareil.
- Fonctionne hors ligne une fois installée.
- Interface en français, montants en CHF.

## 1. Lancer l'app sur ton ordinateur

Il faut [Node.js](https://nodejs.org) (version 22 ou plus récente). Dans un
terminal ouvert dans le dossier du projet :

```bash
npm install
```

Cette commande télécharge les outils nécessaires. Elle n'est à faire qu'une fois.

```bash
npm run dev
```

L'app s'ouvre à l'adresse http://localhost:5173. Elle se recharge toute seule
quand tu modifies un fichier. Pour l'arrêter : `Ctrl + C` dans le terminal.

Autres commandes utiles :

| Commande | Ce qu'elle fait |
|---|---|
| `npm test` | Vérifie les règles de calcul (cagnotte, série, île, puzzle…) |
| `npm run build` | Fabrique la version finale dans le dossier `dist/` |
| `npm run preview` | Affiche cette version finale sur http://localhost:4173 |

## 2. Mettre l'app en ligne (gratuit, avec GitHub Pages)

À faire une seule fois :

1. Sur [github.com](https://github.com), clique sur **+** puis **New repository**.
   Donne-lui un nom (par exemple `cagnotte`), choisis **Public**, ne coche rien
   d'autre, puis **Create repository**.
2. Dans le terminal, relie ton dossier à ce dépôt et envoie le code. Remplace
   `TON-PSEUDO` par ton nom d'utilisateur GitHub :

   ```bash
   git remote add origin https://github.com/TON-PSEUDO/cagnotte.git
   ```

   ```bash
   git push -u origin main
   ```

   Une fenêtre te demandera de te connecter à GitHub la première fois.
3. Sur la page du dépôt : **Settings** → **Pages** → sous **Build and
   deployment**, choisis **Source : GitHub Actions**.
4. Onglet **Actions** : attends que « Mise en ligne » affiche une coche verte
   (une à deux minutes). Si elle a échoué avant l'étape 3, ouvre-la et clique
   sur **Re-run all jobs**.

Ton app est alors à l'adresse `https://TON-PSEUDO.github.io/cagnotte/`.

Pour ce dépôt, c'est déjà fait : l'app est en ligne à l'adresse
https://matrotzetter.github.io/STOPIT/

Ensuite, pour publier une modification :

```bash
git add -A
```

```bash
git commit -m "Ma modification"
```

```bash
git push
```

La mise en ligne se refait toute seule. L'app installée sur ton téléphone se met
à jour à l'ouverture suivante, sans perdre tes données.

Le dépôt est public : tout le monde peut lire le **code**, mais jamais tes
**données**, qui ne quittent pas ton téléphone.

## 3. Installer l'app sur ton iPhone

1. Ouvre l'adresse de ton app dans **Safari** (pas dans une autre app).
2. Touche le bouton **Partager** (le carré avec une flèche vers le haut).
3. Choisis **Sur l'écran d'accueil**, puis **Ajouter**.
4. Lance l'app depuis son icône (une pièce dorée) : elle s'ouvre en plein écran
   et fonctionne sans connexion.

À savoir :

- **Fais ton premier lancement depuis l'icône**, pas depuis Safari. Sur iPhone,
  l'app installée et l'onglet Safari ont chacun leurs propres données.
- **Installe-la vraiment.** Safari peut effacer les données d'un simple site
  resté sans visite pendant une semaine ; une app installée n'est pas concernée.
- **Exporte de temps en temps** : Réglages → Exporter. C'est ta seule sauvegarde
  si tu changes de téléphone ou supprimes l'app. Pour restaurer : Réglages →
  Importer.

Sur Android (Chrome) : menu **⋮** → **Installer l'application**.

## Comment le projet est organisé

```text
src/
├─ config.ts        toutes les valeurs d'équilibrage (gains, coûts, paliers, carte de l'île)
├─ logique/         les règles de calcul, sans interface, avec leurs tests (*.test.ts)
├─ ecrans/          un fichier par écran
├─ stockage.ts      enregistrement local, export et import
├─ sons.ts          sons générés en code
└─ styles.css       l'apparence (thème sombre)
scripts/icones.mjs  dessine l'icône de l'app en code
```

Pour ajuster le jeu (énergie par heure, prix des bâtiments, durée du minuteur,
rythme de la respiration…), tout se trouve dans `src/config.ts`.

## Besoin d'aide pour arrêter ?

- [stop-tabac.ch](https://www.stop-tabac.ch)
- Ligne stop-tabac : 0848 000 181

Cette app ne donne aucun conseil médical.
