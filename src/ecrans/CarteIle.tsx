// Le dessin de l'île, en pixel art : utilisé en grand sur l'écran Île et en tête de l'accueil.
import { useEffect, useRef } from 'react'
import { HAUTEUR_AVATAR, animer, avatarsDe, dessinerAvatar } from '../avatar'
import { TAILLE, ZONE_DE_CASE, casesDegagees, modele } from '../logique/ile'
import type { Etat } from '../logique/types'
import {
  BATEAU,
  BATIMENTS,
  BOUTEILLE,
  CHEMINEES,
  CIELS,
  COULEURS_MOTIFS,
  FEU,
  MOUETTE,
  MOUTON,
  NOTE,
  NUAGE,
  SAISONS,
  dessinerMotif,
  periode,
  saison,
} from '../pixels'

// L'île est dessinée en « pixel art isométrique » : on la regarde de biais et d'en
// haut. Chaque case est un losange posé sur un bloc de terre, d'autant plus haut
// que sa zone est proche du sommet. Le dessin est fait en tout petit (160 pixels
// de large) puis agrandi sans lissage : toutes les mesures sont en gros pixels.
/** Largeur et hauteur du losange d'une case. */
const L = 20
const H = 10
/** Hauteur gagnée à chaque zone, et épaisseur du socle de l'île. */
const MARCHE = 2
const SOCLE = 3
/** Largeur du dessin, et position verticale de la case du fond. */
const LARGEUR = TAILLE * L
const HAUT = 4 + 5 * MARCHE
/** Haut de la plage, sous l'île, et hauteur totale du dessin. */
const PLAGE = HAUT + TAILLE * H + SOCLE + 2
const HAUTEUR = PLAGE + HAUTEUR_AVATAR + 3
/** Coin haut gauche de la bouteille échouée, au bord de l'eau. */
const BOUTEILLE_X = 76
const BOUTEILLE_Y = PLAGE + 3

/** Les cases, du fond vers l'avant : celles de devant sont dessinées en dernier et cachent les autres. */
const ORDRE = ZONE_DE_CASE.map((_, i) => i).sort(
  (a, b) => (a % TAILLE) + Math.floor(a / TAILLE) - ((b % TAILLE) + Math.floor(b / TAILLE)),
)

/** Où se trouve la case n° i : x = son milieu, y = le haut de son losange. */
function positionCase(i: number) {
  const colonne = i % TAILLE
  const ligne = Math.floor(i / TAILLE)
  return {
    x: LARGEUR / 2 + ((colonne - ligne) * L) / 2,
    y: HAUT + ((colonne + ligne) * H) / 2 - ZONE_DE_CASE[i] * MARCHE,
  }
}


/** Position des étoiles, des vagues et des lucioles. */
const ETOILES = [
  [8, 34], [40, 8], [58, 20], [12, 52], [34, 30], [120, 6], [140, 22], [152, 10], [104, 12], [150, 96], [10, 92], [28, 104],
]
const VAGUES = [
  [6, 72], [20, 84], [4, 60], [128, 88], [142, 76], [116, 95], [44, 95],
]
const LUCIOLES = [
  [50, 60], [78, 46], [96, 70], [66, 80], [112, 52], [84, 30],
]

/** true si l'utilisateur a noté au moins une raison d'arrêter : la bouteille à la mer en contient une. */
const aDesRaisons = (etat: Etat) => etat.profil.raisons.some((r) => r.trim() !== '')

/**
 * Dessine toute l'île dans le canvas.
 * t = le temps en millisecondes, pour les animations ; quand = la date et l'heure, pour le ciel et la saison ;
 * concert = true pendant que le club de jazz joue.
 */
function dessinerIle(
  ctx: CanvasRenderingContext2D,
  etat: Etat,
  degagees: boolean[],
  selection: number | null | undefined,
  t: number,
  quand: Date,
  concert: boolean,
) {
  const moment = periode(quand.getHours())
  const laSaison = saison(quand)
  const habillage = SAISONS[laSaison]
  // Les couleurs des motifs, avec celles de la saison par-dessus (feuillage roux en automne, etc.).
  const couleurs = { ...COULEURS_MOTIFS, ...habillage.motifs }
  const ciel = CIELS[moment]
  const couleurCiel = (y: number) => ciel[Math.min(ciel.length - 1, Math.floor((y / PLAGE) * ciel.length))]
  const rect = (x: number, y: number, l: number, h: number, couleur: string) => {
    ctx.fillStyle = couleur
    ctx.fillRect(Math.round(x), Math.round(y), l, h)
  }

  // Le ciel et la mer, par bandes de couleur
  for (let y = 0; y < PLAGE; y++) rect(0, y, LARGEUR, 1, couleurCiel(y))
  // Les étoiles ne sortent que quand il fait sombre.
  if (moment === 'nuit' || moment === 'soir') {
    ETOILES.forEach(([x, y], n) => Math.sin(t / 700 + n * 2) > -0.4 && rect(x, y, 1, 1, '#ffffff'))
  }
  // Le soleil ou la lune : un disque. Bas sur l'horizon à l'aube et le soir, haut en plein jour.
  const astre = { nuit: 16, aube: 34, jour: 14, soir: 36 }[moment]
  for (let dy = -6; dy <= 6; dy++) {
    const demi = Math.round(Math.sqrt(36 - dy * dy))
    rect(22 - demi, astre + dy, demi * 2, 1, moment === 'nuit' ? '#fff3c9' : moment === 'jour' ? '#ffe27a' : '#ffb35c')
  }
  if (moment === 'nuit') {
    // La lune est un croissant : le disque est mordu par un disque de la couleur du ciel.
    for (let dy = -5; dy <= 5; dy++) {
      const demi = Math.round(Math.sqrt(25 - dy * dy))
      rect(26 - demi, 14 + dy, demi * 2, 1, couleurCiel(14 + dy))
    }
  }
  VAGUES.forEach(([x, y], n) => {
    const glisse = Math.round(Math.sin(t / 900 + n) * 2)
    rect(x + glisse, y, 4, 1, 'rgba(255, 255, 255, 0.35)')
    rect(x + glisse + 4, y + 1, 3, 1, 'rgba(255, 255, 255, 0.35)')
  })
  // Un voilier passe au large : il met un peu plus d'une minute à traverser, puis disparaît autant.
  // Il est dessiné avant l'île, qui le cache quand il passe derrière.
  const course = ((t / 1000) * 2.5) % 340
  if (course < 180) dessinerMotif(ctx, BATEAU, Math.round(course - 12), 68 + Math.round(Math.sin(t / 700)), couleurs)

  /** Ce qui doit passer devant toutes les cases (fumée, mouton, notes) : dessiné après la boucle. */
  const pardessus: (() => void)[] = []

  // Les cases, du fond vers l'avant
  for (const i of ORDRE) {
    const zone = ZONE_DE_CASE[i]
    const { x, y } = positionCase(i)
    const profondeur = zone * MARCHE + SOCLE
    // Les deux flancs de terre : des colonnes d'un pixel, qui suivent le bord du losange.
    for (let n = 0; n < L / 2; n++) {
      const haut = y + H / 2 + 1 + Math.floor(n / 2)
      rect(x - L / 2 + n, haut, 1, profondeur, '#8a6b4a') // flanc gauche
      rect(x + L / 2 - 1 - n, haut, 1, profondeur, '#6a5038') // flanc droit
    }
    // Le dessus : un losange, ligne par ligne (4, 8, 12, 16, 20 pixels puis l'inverse).
    const couleur = degagees[i] ? habillage.zones[zone] : ['#b8c2cc', '#aeb9c4', '#c2cbd4'][i % 3]
    for (let dy = 0; dy < H; dy++) {
      const largeur = 4 * (dy < H / 2 ? dy + 1 : H - dy)
      rect(x - largeur / 2, y + dy, largeur, 1, couleur)
      // Le bord avant du losange est un peu plus sombre : il marque l'arête.
      if (dy >= H / 2) {
        rect(x - largeur / 2, y + dy, 2, 1, 'rgba(0, 0, 0, 0.18)')
        rect(x + largeur / 2 - 2, y + dy, 2, 1, 'rgba(0, 0, 0, 0.18)')
      }
    }
    if (selection === i) {
      // Case sélectionnée : son contour en blanc.
      for (let dy = 0; dy < H; dy++) {
        const largeur = 4 * (dy < H / 2 ? dy + 1 : H - dy)
        rect(x - largeur / 2, y + dy, 2, 1, '#ffffff')
        rect(x + largeur / 2 - 2, y + dy, 2, 1, '#ffffff')
      }
    }
    if (!degagees[i]) {
      // Brume : un petit nuage posé sur la case, qui monte et descend lentement.
      dessinerMotif(ctx, NUAGE, x - 6, y + 1 + Math.round(Math.sin(t / 1500 + i)), COULEURS_MOTIFS)
      continue
    }
    // Deux brins sombres pour donner du grain au sol
    rect(x - 4 + ((i * 5) % 8), y + 4 + (i % 3), 1, 1, 'rgba(0, 0, 0, 0.18)')
    rect(x + 3 - ((i * 3) % 7), y + 3 + ((i * 2) % 4), 1, 1, 'rgba(255, 255, 255, 0.2)')
    // Au printemps, une case sur trois a une petite fleur.
    if (laSaison === 'printemps' && i % 3 === 0) rect(x + 2 - (i % 5), y + 5, 1, 1, '#f6b8d0')
    const batiment = etat.batiments.find((b) => b.case === i)
    if (batiment) {
      // Le bâtiment est debout sur la case, centré, les pieds un peu en avant du milieu.
      const motif = batiment.type === 'feu' ? FEU[Math.floor(t / 180) % 2] : BATIMENTS[batiment.type]
      if (!motif) continue // type inconnu (fichier importé d'une autre version) : on ne dessine rien
      const gauche = x - Math.floor(motif[0].length / 2)
      const haut = y + H / 2 + 2 - motif.length
      rect(gauche, y + H / 2 + 2, motif[0].length, 1, 'rgba(0, 0, 0, 0.25)') // ombre au sol
      dessinerMotif(ctx, motif, gauche, haut, couleurs)
      if (laSaison === 'hiver' && batiment.type !== 'feu') {
        // En hiver, de la neige sur le haut du bâtiment : le pixel le plus haut de chaque colonne devient blanc.
        for (let colonne = 0; colonne < motif[0].length; colonne++) {
          const ligne = motif.findIndex((l) => l[colonne] !== '.')
          if (ligne >= 0) rect(gauche + colonne, haut + ligne, 1, 1, '#ffffff')
        }
      }
      const cheminee = CHEMINEES[batiment.type]
      if (cheminee !== undefined) {
        // De la fumée : trois bouffées qui montent, s'écartent et s'effacent, l'une après l'autre.
        pardessus.push(() => {
          for (let k = 0; k < 3; k++) {
            const avance = (t / 1600 + k / 3 + i * 0.37) % 1 // de 0 (sortie) à 1 (disparue)
            const cote = Math.round(Math.sin(avance * 6 + k) * 1.5)
            const taille = avance > 0.5 ? 2 : 1
            rect(gauche + cheminee + cote, haut - 1 - avance * 9, taille, taille, `rgba(225, 225, 235, ${0.7 * (1 - avance)})`)
          }
        })
      }
      if (batiment.type === 'ferme') {
        // Un mouton broute à côté de la ferme : il avance et recule d'un pixel, en bougeant les pattes.
        const pas = Math.sin(t / 2500 + i)
        const motifMouton = MOUTON[Math.abs(pas) > 0.5 ? Math.floor(t / 300) % 2 : 0]
        pardessus.push(() => dessinerMotif(ctx, motifMouton, x + 5 + Math.round(pas), y + H / 2 - 1, couleurs))
      }
      if (batiment.type === 'club' && concert) pardessus.push(() => notes(x + 3, haut - 2, i))
      // Niveaux 2 et 3 : une ou deux petites étoiles dorées au-dessus.
      for (let n = 1; n < batiment.niveau; n++) rect(x - batiment.niveau * 2 + n * 4 - 1, haut - 4, 2, 2, '#ffd166')
    }
  }

  pardessus.forEach((dessiner) => dessiner())

  // Mouettes, sauf la nuit : elles traversent le ciel en battant des ailes.
  if (moment !== 'nuit') {
    for (let n = 0; n < 2; n++) {
      const x = (((t / 1000) * 6 + n * 90) % 220) - 20
      const y = 22 + n * 9 + Math.round(Math.sin(t / 600 + n) * 2)
      dessinerMotif(ctx, MOUETTE[Math.floor(t / 250 + n) % 2], Math.round(x), y, couleurs)
    }
  }

  LUCIOLES.forEach(([x, y], n) => {
    if (moment === 'jour') return // les lucioles ne brillent pas en plein jour
    if (Math.sin(t / 800 + n * 3) < -0.3) return // elle s'éteint par moments
    rect(x + Math.sin(t / 1100 + n) * 4, y + Math.cos(t / 1300 + n * 2) * 3, 1, 1, '#ffe08a')
  })

  // Ce qui tombe du ciel selon la saison (pétales, feuilles, flocons). En novembre, quelques flocons se mêlent aux feuilles.
  tomber(habillage.chute.nombre, habillage.chute.couleurs, habillage.chute.largeur, 0)
  if (laSaison === 'automne' && quand.getMonth() === 10) tomber(5, ['#ffffff'], 1, 17)

  // La plage : les avatars aux deux bouts, et un trophée par récompense encaissée
  rect(0, PLAGE, LARGEUR, HAUTEUR - PLAGE, '#e8d9a8')
  rect(0, PLAGE, LARGEUR, 1, '#f6efd2')
  for (let n = 0; n < 24; n++) rect((n * 37) % LARGEUR, PLAGE + 3 + ((n * 11) % 18), 1, 1, '#d6c48c') // grains de sable
  if (aDesRaisons(etat)) {
    // La bouteille à la mer, avec un reflet qui brille de temps en temps.
    rect(BOUTEILLE_X, BOUTEILLE_Y + BOUTEILLE.length, BOUTEILLE[0].length, 1, 'rgba(0, 0, 0, 0.15)')
    dessinerMotif(ctx, BOUTEILLE, BOUTEILLE_X, BOUTEILLE_Y, couleurs)
    if (Math.sin(t / 900) > 0.85) rect(BOUTEILLE_X + 5, BOUTEILLE_Y, 1, 1, '#ffffff')
  }
  const monuments = etat.recompenses.filter((r) => r.encaisseeLe)
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  // 8 trophées, puis « +N » s'il y en a davantage.
  monuments.slice(0, 8).forEach((_, n) => ctx.fillText('🏆', 36 + n * 11, HAUTEUR - 4))
  if (monuments.length > 8) {
    ctx.fillStyle = '#3a3320'
    ctx.fillText(`+${monuments.length - 8}`, 36 + 8 * 11, HAUTEUR - 5)
  }
  avatarsDe(etat).forEach((avatar, n) => {
    if (concert) {
      // Pendant le concert, ils s'arrêtent et sourient ; le premier joue du saxophone, des notes s'envolent.
      const x = n === 0 ? 50 : LARGEUR - 50
      rect(x - 6, HAUTEUR - 3, 12, 1, 'rgba(0, 0, 0, 0.2)')
      dessinerAvatar(ctx, n === 0 ? { ...avatar, saxophone: true } : avatar, x, HAUTEUR - 2, HAUTEUR_AVATAR, true, n === 0 ? 0.5 : -0.5)
      if (n === 0) notes(x + 6, HAUTEUR - HAUTEUR_AVATAR - 2, 0.5)
      return
    }
    // Chacun se promène lentement sur sa moitié de plage, et regarde dans le sens de la marche.
    const pas = t / 9000 + n * 2
    const x = Math.round((n === 0 ? 40 : LARGEUR - 40) + Math.sin(pas) * 28)
    rect(x - 6, HAUTEUR - 3, 12, 1, 'rgba(0, 0, 0, 0.2)')
    dessinerAvatar(ctx, avatar, x, HAUTEUR - 2, HAUTEUR_AVATAR, false, Math.cos(pas))
  })

  /** Trois croches qui montent depuis (x, y), ondulent et s'effacent. `decalage` évite qu'elles partent toutes ensemble. */
  function notes(x: number, y: number, decalage: number) {
    for (let k = 0; k < 3; k++) {
      const avance = (t / 1400 + k / 3 + decalage) % 1 // de 0 (sortie) à 1 (disparue)
      ctx.globalAlpha = 1 - avance // de plus en plus transparente
      dessinerMotif(ctx, NOTE, x + Math.round(Math.sin(avance * 5 + k) * 2), Math.round(y - avance * 12), couleurs)
    }
    ctx.globalAlpha = 1
  }

  /** Fait tomber `nombre` particules d'une largeur donnée, en biais, de haut en bas du dessin. */
  function tomber(nombre: number, teintes: string[], largeur: number, decalage: number) {
    for (let n = 0; n < nombre; n++) {
      const y = ((t / 90 + n * 53 + decalage * 7) % (HAUTEUR + 10)) - 5
      const x = (n * 37 + decalage + Math.sin(t / 1500 + n) * 6 + LARGEUR) % LARGEUR
      rect(x, y, largeur, 1, teintes[n % teintes.length])
    }
  }
}

interface PropsCarte {
  etat: Etat
  maintenant: number
  /** Case sélectionnée (entourée en blanc). */
  selection?: number | null
  /** Si fourni, les cases deviennent cliquables. */
  onCase?: (numCase: number) => void
  /** Si fourni, la bouteille à la mer devient cliquable. */
  onBouteille?: () => void
  /** Heure (Date.now()) jusqu'à laquelle le club de jazz joue. */
  concertJusqua?: number
}

/**
 * L'île. Le dessin est dans un <canvas> ; par-dessus, un SVG invisible porte une
 * zone par case : c'est lui qui reçoit le doigt, le clavier et le lecteur d'écran.
 * Utilisé ici et sur l'accueil.
 */
export function CarteIle({ etat, maintenant, selection, onCase, onBouteille, concertJusqua = 0 }: PropsCarte) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const degagees = casesDegagees(etat, maintenant)

  // Redessine à chaque changement, et en continu pour les animations.
  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    const quand = new Date(maintenant)
    return animer((t) => dessinerIle(ctx, etat, degagees, selection, t, quand, Date.now() < concertJusqua))
  })

  return (
    <span className="ile-cadre">
      <canvas ref={canvasRef} className="ile" width={LARGEUR} height={HAUTEUR} aria-hidden="true" />
      <svg className="ile" viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} role="group" aria-label="Carte de l'île">
        {ORDRE.map((i) => {
          const { x, y } = positionCase(i)
          const bas = y + H + ZONE_DE_CASE[i] * MARCHE + SOCLE
          const batiment = etat.batiments.find((b) => b.case === i)
          const m = batiment && modele(batiment.type)
          const description = !degagees[i] ? 'brume' : m ? m.nom : 'case libre'
          return (
            // Une zone transparente de la forme de la case (dessus + flancs).
            <polygon
              key={i}
              points={`${x},${y} ${x + L / 2},${y + H / 2} ${x + L / 2},${bas - H / 2} ${x},${bas} ${x - L / 2},${bas - H / 2} ${x - L / 2},${y + H / 2}`}
              fill="transparent"
              // Les 4 lignes suivantes rendent la case utilisable au clavier et au lecteur d'écran.
              role={onCase ? 'button' : undefined}
              tabIndex={onCase ? 0 : undefined}
              aria-label={`Ligne ${Math.floor(i / TAILLE) + 1}, colonne ${(i % TAILLE) + 1} : ${description}`}
              onKeyDown={
                onCase &&
                ((e) => {
                  // Entrée ou Espace, comme pour un vrai bouton.
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.preventDefault() // sinon Espace fait défiler la page
                  onCase(i)
                })
              }
              onClick={onCase && (() => onCase(i))}
            />
          )
        })}
        {onBouteille && aDesRaisons(etat) && (
          // Zone un peu plus grande que la bouteille, pour le doigt.
          <rect
            x={BOUTEILLE_X - 4}
            y={BOUTEILLE_Y - 3}
            width={BOUTEILLE[0].length + 8}
            height={BOUTEILLE.length + 6}
            fill="transparent"
            role="button"
            tabIndex={0}
            aria-label="Bouteille à la mer : lire une de tes raisons"
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              onBouteille()
            }}
            onClick={onBouteille}
          />
        )}
      </svg>
    </span>
  )
}
