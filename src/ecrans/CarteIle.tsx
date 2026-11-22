// Le dessin de l'île flottante, en pixel art : utilisé en grand sur l'écran Île et sur l'accueil.
import { useEffect, useMemo, useRef } from 'react'
import { HAUTEUR_AVATAR, animer, avatarsDe, dessinerAvatar } from '../avatar'
import { PALIERS_JOURS, SOURCES } from '../config'
import { JOUR_MS, tempsCumuleMs } from '../logique/calculs'
import { EST_EAU, TAILLE, ZONE_DE_CASE, casesDegagees, modele, numeroCase } from '../logique/ile'
import type { Batiment, Etat } from '../logique/types'
import {
  BATIMENTS,
  BOUTEILLE,
  CHEMINEES,
  COULEURS_MOTIFS,
  FEU,
  MOUETTE,
  MOUTON,
  NOTE,
  NUAGE,
  ROCHE,
  SAISONS,
  type Saison,
  dessinerMotif,
  hasard,
  periode,
  saison,
} from '../pixels'

// L'île est dessinée en « pixel art isométrique » : on la regarde de biais et d'en
// haut. Chaque case est un losange posé sur un bloc de terre, d'autant plus haut
// que sa zone est proche du sommet. Sous l'île pend un gros rocher, et un petit îlot
// flotte en dessous avec les deux personnages. Le dessin est fait en tout petit
// (200 pixels de large) puis agrandi sans lissage : toutes les mesures sont en gros pixels.

/** Largeur et hauteur du losange d'une case. */
const L = 20
const H = 10
/** Hauteur gagnée à chaque zone, et épaisseur du socle de l'île. */
const MARCHE = 2
const SOCLE = 3
/** Largeur du dessin, et position verticale de la case du fond. */
const LARGEUR = TAILLE * L
const HAUT = 4 + 5 * MARCHE

/** Les cases de terre, du fond vers l'avant : celles de devant sont dessinées en dernier et cachent les autres. */
const ORDRE = ZONE_DE_CASE.map((_, i) => i)
  .filter((i) => ZONE_DE_CASE[i] >= 0)
  .sort((a, b) => (a % TAILLE) + Math.floor(a / TAILLE) - ((b % TAILLE) + Math.floor(b / TAILLE)))

/** Où se trouve la case n° i : x = son milieu, y = le haut de son losange. */
function positionCase(i: number) {
  const colonne = i % TAILLE
  const ligne = Math.floor(i / TAILLE)
  return {
    x: LARGEUR / 2 + ((colonne - ligne) * L) / 2,
    y: HAUT + ((colonne + ligne) * H) / 2 - ZONE_DE_CASE[i] * MARCHE,
  }
}

/** Pour chaque colonne de pixels : le pixel le plus bas de l'île (y), ou -1 s'il n'y a pas de terre au-dessus. */
const BAS_ILE: number[] = (() => {
  const bas: number[] = new Array(LARGEUR).fill(-1)
  for (const i of ORDRE) {
    const { x, y } = positionCase(i)
    const profondeur = ZONE_DE_CASE[i] * MARCHE + SOCLE
    for (let n = 0; n < L / 2; n++) {
      const yBas = y + H / 2 + Math.floor(n / 2) + profondeur
      for (const colonne of [x - L / 2 + n, x + L / 2 - 1 - n]) bas[colonne] = Math.max(bas[colonne], yBas)
    }
  }
  return bas
})()
const BAS_MAX = Math.max(...BAS_ILE)

/** Profondeur du rocher sous l'île : il grandit avec chaque zone ouverte. */
const PROFONDEUR_MIN = 24
const PROFONDEUR_PAR_ZONE = 6
const PROFONDEUR_MAX = PROFONDEUR_MIN + PROFONDEUR_PAR_ZONE * PALIERS_JOURS.length

/** Le petit îlot sous l'île : milieu, haut du sol, demi-largeur. */
const ILOT_X = 88
const ILOT_Y = BAS_MAX + PROFONDEUR_MAX + 6
const ILOT_RAYON = 42
const HAUTEUR = ILOT_Y + 22
/** Hauteur du dessin sans l'îlot (accueil) : juste l'île et son rocher, à sa taille du moment. */
const hauteurSansIlot = (zonesOuvertes: number) => BAS_MAX + PROFONDEUR_MIN + PROFONDEUR_PAR_ZONE * zonesOuvertes + 4
/** Coin haut gauche de la bouteille, posée sur l'îlot. */
const BOUTEILLE_X = ILOT_X + 4
const BOUTEILLE_Y = ILOT_Y - 1

/** Les cascades : d'où tombe l'eau (bord avant de la dernière case de chaque source), et quelle case doit être dégagée. */
const CASCADES = SOURCES.map((source) => {
  const [l, c] = source.cases[source.cases.length - 1]
  const i = numeroCase(l, c)
  const { x, y } = positionCase(i)
  return { case: i, x: Math.round(x + (source.chute === 'gauche' ? -L / 4 : L / 4)), y: y + (3 * H) / 4 }
})

/** Les ruisseaux : la suite des cases d'eau de chaque source, jusqu'au point de chute. */
const RUISSEAUX = SOURCES.map((source, n) => ({
  points: [...source.cases.map(([l, c]) => numeroCase(l, c)), -1].map((i) => {
    if (i === -1) return { x: CASCADES[n].x, y: CASCADES[n].y, case: CASCADES[n].case }
    const { x, y } = positionCase(i)
    return { x, y: y + H / 2, case: i }
  }),
}))

/** Position des lucioles. */
const LUCIOLES = [
  [60, 70], [96, 52], [120, 80], [80, 96], [140, 60], [104, 34], [40, 90],
]

/** true si l'utilisateur a noté au moins une raison d'arrêter : la bouteille en contient une. */
const aDesRaisons = (etat: Etat) => etat.profil.raisons.some((r) => r.trim() !== '')

// ---------- Le rocher sous l'île (calque fixe, dessiné une fois puis réutilisé) ----------

/**
 * Dessine un rocher suspendu sous une surface : `bas[x]` = le haut du rocher dans la colonne x.
 * Il se resserre vers une pointe placée sous (xPointe, yPointe) ; la face gauche est éclairée,
 * la droite à l'ombre, et les strates suivent les bords de l'île (pente d'un demi-pixel).
 */
function dessinerRocher(
  ctx: CanvasRenderingContext2D,
  bas: number[],
  xPointe: number,
  yPointe: number,
  pente: number,
  laSaison: Saison,
  graine: number,
) {
  const alea = hasard(graine)
  const colonnes = bas.map((y, x) => (y >= 0 ? x : -1)).filter((x) => x >= 0)
  if (colonnes.length === 0) return
  // Le fond du rocher, colonne par colonne, puis quelques pics qui pendent.
  const fond = bas.map((y, x) => (y < 0 ? -1 : Math.max(y + 4, yPointe - Math.abs(x - xPointe) * pente)))
  for (let k = 0; k < colonnes.length / 18; k++) {
    const c = colonnes[Math.floor(alea() * colonnes.length)]
    const longueur = 4 + alea() * 10
    const demi = 1 + Math.floor(alea() * 3)
    for (let d = -demi; d <= demi; d++) {
      if (fond[c + d] > 0) fond[c + d] = Math.max(fond[c + d], fond[c] + longueur * (1 - Math.abs(d) / (demi + 1)))
    }
  }
  // Par colonnes de 2 pixels : des marches nettes, comme le reste du pixel art.
  for (let x = 0; x < bas.length; x++) if (x % 2) fond[x] = fond[x - 1] >= 0 && bas[x] >= 0 ? fond[x - 1] : fond[x]
  // L'arête qui sépare les deux faces part du point le plus bas de la surface et va vers la pointe.
  const xAvant = colonnes.reduce((a, x) => (bas[x] > bas[a] ? x : a), colonnes[0])
  const mousse = SAISONS[laSaison].mousse
  for (const x of colonnes) {
    const yFin = Math.round(fond[x])
    for (let y = bas[x] + 1; y <= yFin; y++) {
      const t = Math.min(1, Math.max(0, (y - bas[xAvant]) / Math.max(1, yPointe - bas[xAvant])))
      const gauche = x < xAvant + (xPointe - xAvant) * t
      const avance = (y - bas[x]) / Math.max(1, yFin - bas[x])
      const strate = Math.floor((gauche ? y - x / 2 : y + x / 2) / 6) % 2
      const teintes = gauche ? ROCHE.eclairee : ROCHE.ombre
      ctx.fillStyle = y === yFin ? ROCHE.bord : teintes[Math.min(teintes.length - 1, Math.floor(avance * 3.2) + strate)]
      ctx.fillRect(x, y, 1, 1)
    }
    // La mousse (ou la neige) qui déborde du bord, et quelques lianes.
    const epaisseur = 2 + (Math.sin(x * 1.3) > 0.2 ? 1 : 0)
    for (let k = 1; k <= epaisseur; k++) {
      ctx.fillStyle = k < epaisseur ? mousse[0] : mousse[1]
      ctx.fillRect(x, bas[x] + k, 1, 1)
    }
    if (alea() < 0.09) {
      ctx.fillStyle = mousse[1]
      ctx.fillRect(x, bas[x] + epaisseur, 1, 3 + Math.floor(alea() * 7))
    }
  }
}

/** Les rochers déjà dessinés, rangés par « zones ouvertes + saison + îlot » : on ne les redessine pas à chaque image. */
const calquesRocher = new Map<string, HTMLCanvasElement>()

function calqueRocher(zonesOuvertes: number, laSaison: Saison, avecIlot: boolean): HTMLCanvasElement {
  const cle = `${zonesOuvertes}-${laSaison}-${avecIlot}`
  let calque = calquesRocher.get(cle)
  if (calque) return calque
  calque = document.createElement('canvas')
  calque.width = LARGEUR
  calque.height = HAUTEUR
  const ctx = calque.getContext('2d')!
  const profondeur = PROFONDEUR_MIN + PROFONDEUR_PAR_ZONE * zonesOuvertes
  dessinerRocher(ctx, BAS_ILE, LARGEUR / 2, BAS_MAX + profondeur, 1.55, laSaison, 7)
  if (avecIlot) dessinerSolIlot(ctx, laSaison)
  calquesRocher.set(cle, calque)
  return calque
}

/** L'îlot : un sol ovale (sable bordé d'herbe) posé sur son propre petit rocher. */
function dessinerSolIlot(ctx: CanvasRenderingContext2D, laSaison: Saison) {
  const basIlot: number[] = new Array(LARGEUR).fill(-1)
  for (let dy = 0; dy < 5; dy++) {
    const demi = Math.round(ILOT_RAYON * Math.sqrt(1 - ((dy - 2) / 2.6) ** 2))
    for (let x = ILOT_X - demi; x < ILOT_X + demi; x++) {
      ctx.fillStyle = dy === 0 || Math.abs(x - ILOT_X) > demi - 3 ? SAISONS[laSaison].zones[1] : SAISONS[laSaison].zones[0]
      ctx.fillRect(x, ILOT_Y + dy, 1, 1)
      basIlot[x] = ILOT_Y + dy
    }
  }
  dessinerRocher(ctx, basIlot, ILOT_X, ILOT_Y + 18, 0.5, laSaison, 3)
}

// ---------- Le dessin complet, image par image ----------

interface Scene {
  etat: Etat
  degagees: boolean[]
  /** Bâtiment posé sur chaque case (calculé une fois par rendu, pas à chaque image). */
  parCase: Map<number, Batiment>
  zonesOuvertes: number
  selection: number | null | undefined
  quand: Date
  concert: boolean
  /** false : sans l'îlot des personnages (accueil). */
  ilot: boolean
  /** Hauteur du dessin : les cascades s'effacent avant d'en atteindre le bas. */
  hauteur: number
}

/** Dessine toute l'île dans le canvas. t = le temps en millisecondes, pour les animations. */
function dessinerIle(ctx: CanvasRenderingContext2D, scene: Scene, t: number) {
  const { etat, degagees, parCase, selection, quand, concert } = scene
  const moment = periode(quand.getHours())
  const laSaison = saison(quand)
  const habillage = SAISONS[laSaison]
  // Les couleurs des motifs, avec celles de la saison par-dessus (feuillage roux en automne, etc.).
  const couleurs = { ...COULEURS_MOTIFS, ...habillage.motifs }
  /** L'eau des bassins et des ruisseaux : bleue, ou glace pâle en hiver. */
  const eau = laSaison === 'hiver' ? '#a9cfe6' : '#3f8fc4'
  const rect = (x: number, y: number, l: number, h: number, couleur: string) => {
    ctx.fillStyle = couleur
    ctx.fillRect(Math.round(x), Math.round(y), l, h)
  }

  // Fond transparent : c'est le décor de la page (ciel, géante) qu'on voit autour de l'île.
  ctx.clearRect(0, 0, LARGEUR, HAUTEUR)
  ctx.drawImage(calqueRocher(scene.zonesOuvertes, laSaison, scene.ilot), 0, 0)

  /** Ce qui doit passer devant toutes les cases (fumée, mouton, notes) : dessiné après la boucle. */
  const pardessus: (() => void)[] = []

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
    if (EST_EAU[i]) {
      dessinerEau(i)
      continue
    }
    // Deux brins sombres pour donner du grain au sol
    rect(x - 4 + ((i * 5) % 8), y + 4 + (i % 3), 1, 1, 'rgba(0, 0, 0, 0.18)')
    rect(x + 3 - ((i * 3) % 7), y + 3 + ((i * 2) % 4), 1, 1, 'rgba(255, 255, 255, 0.2)')
    // Au printemps, une case sur trois a une petite fleur.
    if (laSaison === 'printemps' && i % 3 === 0) rect(x + 2 - (i % 5), y + 5, 1, 1, '#f6b8d0')
    const batiment = parCase.get(i)
    if (batiment) dessinerBatiment(batiment, x, y)
  }

  pardessus.forEach((dessiner) => dessiner())

  // Mouettes, en journée : elles font le tour de l'île en battant des ailes.
  if (moment !== 'nuit') {
    for (let n = 0; n < 2; n++) {
      const x = (((t / 1000) * 6 + n * 110) % 260) - 30
      const y = 18 + n * 12 + Math.round(Math.sin(t / 600 + n) * 2)
      dessinerMotif(ctx, MOUETTE[Math.floor(t / 250 + n) % 2], Math.round(x), y, couleurs)
    }
  }
  // Lucioles, sauf en plein jour : elles s'allument et s'éteignent en flottant.
  if (moment !== 'jour') {
    LUCIOLES.forEach(([x, y], n) => {
      if (Math.sin(t / 800 + n * 3) < -0.3) return
      rect(x + Math.sin(t / 1100 + n) * 4, y + Math.cos(t / 1300 + n * 2) * 3, 1, 1, '#ffe08a')
    })
  }
  // Ce qui tombe selon la saison (pétales, feuilles, flocons). En novembre, quelques flocons se mêlent aux feuilles.
  tomber(habillage.chute.nombre, habillage.chute.couleurs, habillage.chute.largeur, 0)
  if (laSaison === 'automne' && quand.getMonth() === 10) tomber(5, ['#ffffff'], 1, 17)

  if (scene.ilot) dessinerIlot()

  // ---------- Les morceaux du dessin ----------

  /** Une case d'eau : le bassin est plein d'eau ; un ruisseau est un filet qui va vers la case suivante. */
  function dessinerEau(i: number) {
    const ruisseau = RUISSEAUX.find((r) => r.points.some((p) => p.case === i))!
    const k = ruisseau.points.findIndex((p) => p.case === i)
    const { x, y } = positionCase(i)
    if (k === 0) {
      // Le bassin : tout le dessus de la case, avec des reflets qui scintillent.
      for (let dy = 1; dy < H - 1; dy++) {
        const largeur = 4 * (dy < H / 2 ? dy + 1 : H - dy) - 4
        rect(x - largeur / 2, y + dy, largeur, 1, eau)
      }
      if (Math.sin(t / 700 + i) > 0) rect(x - 3, y + 4, 2, 1, '#8fd0f0')
      if (Math.sin(t / 900 + i * 2) > 0) rect(x + 2, y + 6, 2, 1, '#8fd0f0')
    }
    // Le filet d'eau. Chaque case dessine sa part : depuis le bord partagé avec la case
    // d'avant jusqu'à son milieu, puis jusqu'au bord partagé avec la suivante (ou jusqu'au
    // point de chute). Ainsi, les cases de devant ne recouvrent pas l'eau des cases de derrière.
    const moitie = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
    const ici = ruisseau.points[k]
    const suivant = ruisseau.points[k + 1]
    const finale = suivant.case === ici.case // le dernier point est le bord d'où tombe la cascade
    if (k > 0) filet(moitie(ruisseau.points[k - 1], ici), ici)
    filet(ici, finale ? suivant : moitie(ici, suivant))
    // Au bord, l'eau tombe en cascade.
    const cascade = CASCADES.find((c) => c.case === i)
    if (cascade) pardessus.push(() => dessinerCascade(cascade.x, cascade.y))
  }

  /** Un filet d'eau de 5 pixels de large entre deux points, avec un reflet qui descend le courant. */
  function filet(depart: { x: number; y: number }, arrivee: { x: number; y: number }) {
    const pas = Math.max(1, Math.max(Math.abs(arrivee.x - depart.x), Math.abs(arrivee.y - depart.y)) * 2)
    for (let n = 0; n <= pas; n++) {
      const f = n / pas
      const px = depart.x + (arrivee.x - depart.x) * f
      const py = depart.y + (arrivee.y - depart.y) * f
      rect(px - 2, py - 1, 5, 1, eau)
      rect(px - 3, py, 7, 1, eau)
      rect(px - 2, py + 1, 5, 1, eau)
      if (Math.abs(((t / 700 + px / 40) % 1) - 0.5) < 0.05) rect(px, py, 2, 1, '#a8dcf4')
    }
  }

  /**
   * Une cascade de 4 pixels de large qui tombe du bord, puis s'efface peu à peu dans le vide.
   * En hiver, elle est gelée : plus courte, plus pâle, et immobile.
   */
  function dessinerCascade(x0: number, y0: number) {
    const gelee = laSaison === 'hiver'
    const longueur = Math.min(gelee ? 34 : 72, scene.hauteur - y0 - 2)
    const teintes = gelee ? ['#f4fbff', '#dceefa', '#c4e2f4', '#a8d4ee'] : ['#d9f1ff', '#a8dcf4', '#7fc6ea', '#5fb2dc']
    for (let k = 0; k < longueur; k++) {
      const f = k / longueur
      ctx.globalAlpha = f < 0.35 ? 1 : Math.max(0, 1 - (f - 0.35) / 0.65)
      for (let dx = 0; dx < 4; dx++) {
        // Des traits clairs qui descendent : l'eau semble couler (sauf quand elle est gelée).
        const ecume = (k * 3 + dx * 5 - (gelee ? 0 : Math.floor(t / 60))) % 11 === 0
        rect(x0 - 2 + dx, y0 + k, 1, 1, ecume ? '#ffffff' : teintes[dx])
      }
    }
    ctx.globalAlpha = 1
  }

  /** Un bâtiment debout sur sa case, avec ce qui l'anime (fumée, mouton, notes, étoiles de niveau). */
  function dessinerBatiment(batiment: Batiment, x: number, y: number) {
    const i = batiment.case
    const motif = batiment.type === 'feu' ? FEU[Math.floor(t / 180) % 2] : BATIMENTS[batiment.type]
    if (!motif) return // type inconnu (fichier importé d'une autre version) : on ne dessine rien
    // Centré sur la case, les pieds un peu en avant du milieu.
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

  /** L'îlot sous l'île : la bouteille, un trophée par récompense encaissée, et les deux personnages. */
  function dessinerIlot() {
    if (aDesRaisons(etat)) {
      dessinerMotif(ctx, BOUTEILLE, BOUTEILLE_X, BOUTEILLE_Y, couleurs)
      if (Math.sin(t / 900) > 0.85) rect(BOUTEILLE_X + 5, BOUTEILLE_Y, 1, 1, '#ffffff') // un reflet de temps en temps
    }
    const monuments = etat.recompenses.filter((r) => r.encaisseeLe)
    ctx.font = '9px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    // 6 trophées sur le bord droit de l'îlot, puis « +N » s'il y en a davantage.
    monuments.slice(0, 6).forEach((_, n) => ctx.fillText('🏆', ILOT_X + 18 + (n % 3) * 7, ILOT_Y + 4 - Math.floor(n / 3) * 2))
    if (monuments.length > 6) {
      ctx.fillStyle = '#fff3e4'
      ctx.fillText(`+${monuments.length - 6}`, ILOT_X + 40, ILOT_Y + 3)
    }
    avatarsDe(etat).forEach((avatar, n) => {
      if (concert) {
        // Pendant le concert, ils s'arrêtent et sourient ; le premier joue du saxophone, des notes s'envolent.
        const x = ILOT_X - 22 + n * 18
        dessinerAvatar(ctx, n === 0 ? { ...avatar, saxophone: true } : avatar, x, ILOT_Y + 3, HAUTEUR_AVATAR, true, n === 0 ? 0.5 : -0.5)
        if (n === 0) notes(x + 6, ILOT_Y - HAUTEUR_AVATAR - 2, 0.5)
        return
      }
      // Chacun se promène lentement sur sa moitié d'îlot, et regarde dans le sens de la marche.
      const pas = t / 9000 + n * 2
      const x = Math.round(ILOT_X + (n === 0 ? -20 : 2) + Math.sin(pas) * 9)
      dessinerAvatar(ctx, avatar, x, ILOT_Y + 3, HAUTEUR_AVATAR, false, Math.cos(pas))
    })
  }

  /** Trois croches qui montent depuis (x, y), ondulent et s'effacent. `decalage` évite qu'elles partent toutes ensemble. */
  function notes(x: number, y: number, decalage: number) {
    for (let k = 0; k < 3; k++) {
      const avance = (t / 1400 + k / 3 + decalage) % 1 // de 0 (sortie) à 1 (disparue)
      ctx.globalAlpha = 1 - avance // de plus en plus transparente
      dessinerMotif(ctx, NOTE, x + Math.round(Math.sin(avance * 5 + k) * 2), Math.round(y - avance * 12), couleurs)
    }
    ctx.globalAlpha = 1
  }

  /** Fait tomber `nombre` particules d'une largeur donnée, en biais, de haut en bas de l'île. */
  function tomber(nombre: number, teintes: string[], largeur: number, decalage: number) {
    for (let n = 0; n < nombre; n++) {
      const y = ((t / 90 + n * 53 + decalage * 7) % (BAS_MAX + 30)) - 5
      const x = (n * 37 + decalage + Math.sin(t / 1500 + n) * 6 + LARGEUR) % LARGEUR
      rect(x, y, largeur, 1, teintes[n % teintes.length])
    }
  }
}

// ---------- Le composant ----------

interface PropsCarte {
  etat: Etat
  maintenant: number
  /** Case sélectionnée (entourée en blanc). */
  selection?: number | null
  /** Si fourni, les cases deviennent cliquables. */
  onCase?: (numCase: number) => void
  /** Si fourni, la bouteille devient cliquable. */
  onBouteille?: () => void
  /** Heure (Date.now()) jusqu'à laquelle le club de jazz joue. */
  concertJusqua?: number
  /** false : sans l'îlot des personnages sous l'île (plus compact, pour l'accueil). */
  ilot?: boolean
}

/**
 * L'île. Le dessin est dans un <canvas> ; par-dessus, un SVG invisible porte une
 * zone par case : c'est lui qui reçoit le doigt, le clavier et le lecteur d'écran.
 * Utilisé sur l'écran Île et sur l'accueil.
 */
export function CarteIle({ etat, maintenant, selection, onCase, onBouteille, concertJusqua = 0, ilot = true }: PropsCarte) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Les écrans se rafraîchissent chaque seconde, mais l'île ne change pas si vite : on ne
  // refait les calculs (brume, bâtiments) qu'à chaque nouvelle minute ou quand les données changent.
  const minute = Math.floor(maintenant / 60000)
  const degagees = useMemo(() => casesDegagees(etat, minute * 60000), [etat, minute])
  const parCase = useMemo(() => new Map(etat.batiments.map((b) => [b.case, b])), [etat.batiments])
  const zonesOuvertes = PALIERS_JOURS.filter((p) => tempsCumuleMs(etat, minute * 60000) / JOUR_MS >= p).length
  const hauteur = ilot ? HAUTEUR : hauteurSansIlot(zonesOuvertes)

  // Redessine quand quelque chose change, et en continu pour les animations.
  // La liste à la fin dit quand recommencer : sinon la boucle d'animation serait relancée chaque seconde.
  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    const scene: Omit<Scene, 'concert'> = {
      etat,
      degagees,
      parCase,
      zonesOuvertes,
      selection,
      quand: new Date(minute * 60000),
      ilot,
      hauteur,
    }
    return animer((t) => dessinerIle(ctx, { ...scene, concert: Date.now() < concertJusqua }, t))
  }, [etat, degagees, parCase, zonesOuvertes, selection, minute, ilot, hauteur, concertJusqua])

  return (
    <span className="ile-cadre">
      <canvas ref={canvasRef} className="ile" width={LARGEUR} height={hauteur} aria-hidden="true" />
      <svg className="ile" viewBox={`0 0 ${LARGEUR} ${hauteur}`} role="group" aria-label="Carte de l'île">
        {ORDRE.map((i) => {
          const { x, y } = positionCase(i)
          const bas = y + H + ZONE_DE_CASE[i] * MARCHE + SOCLE
          const m = parCase.has(i) ? modele(parCase.get(i)!.type) : undefined
          const description = !degagees[i] ? 'brume' : EST_EAU[i] ? 'eau' : m ? m.nom : 'case libre'
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
        {ilot && onBouteille && aDesRaisons(etat) && (
          // Zone un peu plus grande que la bouteille, pour le doigt.
          <rect
            x={BOUTEILLE_X - 4}
            y={BOUTEILLE_Y - 4}
            width={BOUTEILLE[0].length + 8}
            height={BOUTEILLE.length + 8}
            fill="transparent"
            role="button"
            tabIndex={0}
            aria-label="Bouteille : lire une de tes raisons"
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
