// Les petits personnages, dessinés en code dans un <canvas>.
// La même fonction sert au mini-jeu, à l'île et à l'aperçu des réglages.
//
// Ce sont de vraies figurines en 3D, dans un style « chibi » : grosse tête ronde,
// petit corps, cheveux lisses. Chaque avatar est un assemblage de boules placées
// dans l'espace (tête, corps, mains…). Pour le dessiner, on fait tourner ces
// boules autour de lui, puis on les dessine de la plus éloignée à la plus proche.
// Quand l'angle change, on le voit donc tourner.
import { AVATARS_DEFAUT } from './config'
import type { Avatar, Etat } from './logique/types'

/** Les deux avatars de l'utilisateur ; ce qui manque est pris dans ceux par défaut. */
export function avatarsDe(etat: Etat): Avatar[] {
  return AVATARS_DEFAUT.map((defaut, i) => ({ ...defaut, ...etat.avatars?.[i] }))
}

/** false si la personne a demandé moins d'animations à son appareil : tout reste alors immobile. */
export const ANIME = typeof matchMedia === 'undefined' || !matchMedia('(prefers-reduced-motion: reduce)').matches

/** Angle de balancement d'un avatar à l'instant t (en millisecondes) : il se tourne doucement à gauche et à droite. */
export function balancement(t: number, decalage = 0): number {
  return Math.sin(t / 1400 + decalage) * 0.45
}

/**
 * Un élément de l'avatar. Position en « hauteurs d'avatar » :
 * x vers la droite, y vers le haut depuis les pieds, z vers celui qui regarde.
 */
interface Piece {
  x: number
  y: number
  z: number
  /** Dessine l'élément, une fois sa position à l'écran (px, py) calculée. */
  dessin: (px: number, py: number) => void
}

/** Rayon de la tête, hauteur de son centre, et rayon du casque de cheveux (en hauteurs d'avatar). */
const TETE = 0.31
const Y_TETE = 0.66
const CASQUE = 0.335

/**
 * Dessine un avatar debout.
 * (x, y) = le point au sol entre ses pieds ; t = sa hauteur en pixels.
 * content = true : il sourit en grand, les yeux plissés.
 * angle = de combien il est tourné, en radians (0 = de face, positif = vers la droite).
 */
export function dessinerAvatar(
  ctx: CanvasRenderingContext2D,
  a: Avatar,
  x: number,
  y: number,
  t: number,
  content = false,
  angle = 0,
) {
  const pieces: Piece[] = []
  const ENCRE = '#3a2a22'
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  // Un seul dégradé de relief, dessiné pour une boule de rayon 1 : clair en haut à gauche
  // (là d'où vient la lumière), sombre sur le bord opposé. Il est réutilisé pour chaque boule.
  const relief = ctx.createRadialGradient(-0.4, -0.45, 0.1, 0, 0, 1.1)
  relief.addColorStop(0, 'rgba(255, 255, 255, 0.4)')
  relief.addColorStop(0.5, 'rgba(255, 255, 255, 0)')
  relief.addColorStop(1, 'rgba(0, 0, 0, 0.35)')

  /** Dessine une boule centrée en (px, py), ombrée ou non. Rayons en pixels. */
  const dessinerBoule = (px: number, py: number, rx: number, ry: number, couleur: string, ombre = true) => {
    ctx.save()
    ctx.translate(px, py)
    ctx.scale(rx, ry)
    for (const remplissage of ombre ? [couleur, relief] : [couleur]) {
      ctx.fillStyle = remplissage
      ctx.beginPath()
      ctx.arc(0, 0, 1, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
  /** Ajoute un élément quelconque à la position donnée. */
  const piece = (bx: number, by: number, bz: number, dessin: Piece['dessin']) => pieces.push({ x: bx, y: by, z: bz, dessin })
  /** Ajoute une boule (ou un œuf si rx ≠ ry). Rayons en hauteurs d'avatar. */
  const boule = (bx: number, by: number, bz: number, rx: number, couleur: string, ry = rx, ombre = true) =>
    piece(bx, by, bz, (px, py) => dessinerBoule(px, py, rx * t, ry * t, couleur, ombre))
  /** Ajoute un détail plat (œil plissé, bouche, lunettes) dessiné au trait. */
  const trait = (bx: number, by: number, bz: number, epaisseur: number, tracer: (px: number, py: number) => void) =>
    piece(bx, by, bz, (px, py) => {
      ctx.strokeStyle = ENCRE
      ctx.lineWidth = Math.max(1, epaisseur * t)
      ctx.lineCap = 'round'
      ctx.beginPath()
      tracer(px, py)
      ctx.stroke()
    })
  /**
   * Ajoute une suite de boules entre deux points : un bras, ou un morceau de tube.
   * ombre = false : boules unies, pour que le bras paraisse lisse et non annelé.
   */
  const boudin = (de: number[], vers: number[], rayon: number, couleur: string, nombre: number, ombre = true) => {
    for (let i = 0; i <= nombre; i++) {
      const p = i / nombre
      boule(de[0] + (vers[0] - de[0]) * p, de[1] + (vers[1] - de[1]) * p, de[2] + (vers[2] - de[2]) * p, rayon, couleur, rayon, ombre)
    }
  }

  // ---------- Le corps : petit, sous une grosse tête ----------
  boule(-0.1, 0.04, 0.04, 0.09, ENCRE, 0.05) // chaussures
  boule(0.1, 0.04, 0.04, 0.09, ENCRE, 0.05)
  boule(0, 0.21, 0, 0.2, a.pull, 0.2) // pull
  boule(0, Y_TETE, 0, TETE, a.peau) // tête

  // ---------- Les cheveux : un casque lisse, ouvert sur le visage ----------
  if (a.coiffure !== 'chauve') {
    // Derrière la tête : la masse des cheveux qui descend dans le cou ou sur les épaules.
    if (a.coiffure === 'milongs') boule(0, 0.57, -0.1, 0.34, a.cheveux, 0.3)
    if (a.coiffure === 'longs') boule(0, 0.46, -0.12, 0.35, a.cheveux, 0.4)
    if (a.coiffure === 'chignon') boule(0, 1.0, -0.1, 0.12, a.cheveux)
    // Le casque : une boule un peu plus grosse que la tête, dont on découpe l'ouverture du visage.
    // L'ouverture glisse sur le côté et se resserre quand la tête tourne.
    piece(0, Y_TETE, 0.01, (px, py) => {
      const r = TETE * t
      ctx.save()
      ctx.beginPath()
      ctx.rect(px - 2 * r, py - 2 * r, 4 * r, 4 * r)
      ctx.ellipse(px + sin * r * 0.9, py + r * 0.5, Math.max(0.05, cos) * r * 0.86, r * 0.82, 0, 0, Math.PI * 2)
      ctx.clip('evenodd') // on ne peint que hors de l'ouverture
      dessinerBoule(px, py, CASQUE * t, CASQUE * t, a.cheveux)
      ctx.restore()
    })
  }

  // ---------- Le visage ----------
  if (a.barbe) boule(0, 0.5, 0.15, 0.2, a.cheveux, 0.13)
  boule(-0.19, 0.58, 0.23, 0.05, 'rgba(255, 120, 120, 0.45)') // joues roses
  boule(0.19, 0.58, 0.23, 0.05, 'rgba(255, 120, 120, 0.45)')
  for (const cote of [-1, 1]) {
    if (content) {
      // œil plissé : un petit arc
      trait(cote * 0.11, 0.66, 0.29, 0.025, (px, py) => ctx.arc(px, py + 0.01 * t, 0.04 * t, Math.PI, 0))
    } else {
      boule(cote * 0.11, 0.66, 0.29, 0.03, ENCRE, 0.045) // œil ovale…
      boule(cote * 0.11 + 0.01, 0.675, 0.3, 0.011, '#fff') // …avec un reflet
    }
    if (a.lunettes) trait(cote * 0.11, 0.66, 0.31, 0.018, (px, py) => ctx.arc(px, py, 0.075 * t, 0, Math.PI * 2))
  }
  if (a.lunettes) {
    trait(0, 0.66, 0.31, 0.018, (px, py) => {
      ctx.moveTo(px - 0.035 * t, py)
      ctx.lineTo(px + 0.035 * t, py)
    })
  }
  // Le nez : un petit triangle arrondi
  piece(0, 0.61, 0.32, (px, py) => {
    ctx.fillStyle = '#e8956a'
    ctx.beginPath()
    ctx.moveTo(px, py - 0.022 * t)
    ctx.lineTo(px + 0.026 * t, py + 0.018 * t)
    ctx.lineTo(px - 0.026 * t, py + 0.018 * t)
    ctx.fill()
  })
  // La bouche (cachée par le bec quand il joue du saxophone)
  if (!a.saxophone) {
    trait(0, 0.55, 0.33, 0.022, (px, py) => ctx.arc(px, py - 0.03 * t, (content ? 0.075 : 0.05) * t, 0.25, Math.PI - 0.25))
  }

  // ---------- Les bras, et le saxophone ----------
  let mains = [
    [-0.25, 0.17, 0.04],
    [0.25, 0.17, 0.04],
  ]
  if (a.saxophone) {
    const bec = [0.01, 0.55, 0.31]
    const coude = [-0.03, 0.18, 0.34] // le bas du tube droit
    const OR = '#e8b84a'
    boudin(bec, [bec[0] - 0.004, bec[1] - 0.05, bec[2] + 0.005], 0.026, '#2a2220', 2) // le bec noir
    boudin([bec[0] - 0.005, bec[1] - 0.06, bec[2] + 0.006], coude, 0.034, OR, 22) // le tube
    boudin(coude, [0.04, 0.09, 0.36], 0.038, OR, 8) // la courbe du bas
    boudin([0.04, 0.09, 0.36], [0.14, 0.18, 0.36], 0.042, OR, 8) // la remontée
    boule(0.17, 0.22, 0.36, 0.075, OR) // le pavillon…
    boule(0.19, 0.24, 0.4, 0.047, '#8a6420') // …et son ouverture
    // Les mains se posent sur le tube, l'une au-dessus de l'autre.
    mains = [0.45, 0.85].map((p) => bec.map((v, i) => v + (coude[i] - v) * p + (i === 2 ? 0.03 : 0)))
  }
  mains.forEach((main, i) => {
    boudin([(i === 0 ? -1 : 1) * 0.16, 0.32, 0], main, 0.055, a.pull, 7, false)
    boule(main[0], main[1], main[2] + 0.02, 0.05, a.peau)
  })

  // ---------- Rotation, puis dessin du plus loin au plus proche ----------
  pieces
    .map((p) => ({ dessin: p.dessin, px: x + (p.x * cos + p.z * sin) * t, py: y - p.y * t, loin: p.z * cos - p.x * sin }))
    .sort((p, q) => p.loin - q.loin)
    .forEach((p) => p.dessin(p.px, p.py))
}
