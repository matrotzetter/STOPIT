// Les petits personnages, dessinés en code dans un <canvas>.
// La même fonction sert au mini-jeu, à l'île et à l'aperçu des réglages.
//
// Ce sont de vraies figurines en 3D : chaque avatar est un assemblage de boules
// placées dans l'espace (tête, corps, mains, mèches de cheveux…). Pour le
// dessiner, on fait tourner ces boules autour de lui, puis on les dessine de la
// plus éloignée à la plus proche. Quand l'angle change, on le voit donc tourner.
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

/**
 * Dessine un avatar debout.
 * (x, y) = le point au sol entre ses pieds ; t = sa hauteur en pixels (cheveux non compris).
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

  // Un seul dégradé de relief, dessiné pour une boule de rayon 1 : clair en haut à gauche
  // (là d'où vient la lumière), sombre sur le bord opposé. Il est réutilisé pour chaque boule.
  const relief = ctx.createRadialGradient(-0.4, -0.45, 0.1, 0, 0, 1.1)
  relief.addColorStop(0, 'rgba(255, 255, 255, 0.4)')
  relief.addColorStop(0.5, 'rgba(255, 255, 255, 0)')
  relief.addColorStop(1, 'rgba(0, 0, 0, 0.35)')

  /** Ajoute une boule (ou un œuf si rx ≠ ry). Rayons en hauteurs d'avatar. */
  const boule = (bx: number, by: number, bz: number, rx: number, couleur: string, ry = rx) => {
    pieces.push({
      x: bx,
      y: by,
      z: bz,
      dessin: (px, py) => {
        ctx.save()
        ctx.translate(px, py)
        ctx.scale(rx * t, ry * t)
        for (const remplissage of [couleur, relief]) {
          ctx.fillStyle = remplissage
          ctx.beginPath()
          ctx.arc(0, 0, 1, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      },
    })
  }
  /** Ajoute un détail plat (œil plissé, bouche, lunettes) dessiné au trait. */
  const trait = (bx: number, by: number, bz: number, epaisseur: number, tracer: (px: number, py: number) => void) => {
    pieces.push({
      x: bx,
      y: by,
      z: bz,
      dessin: (px, py) => {
        ctx.strokeStyle = ENCRE
        ctx.lineWidth = Math.max(1, epaisseur * t)
        ctx.lineCap = 'round'
        ctx.beginPath()
        tracer(px, py)
        ctx.stroke()
      },
    })
  }
  /** Ajoute une suite de boules entre deux points : un bras, ou un morceau de tube. */
  const boudin = (de: number[], vers: number[], rayon: number, couleur: string, nombre: number) => {
    for (let i = 0; i <= nombre; i++) {
      const p = i / nombre
      boule(de[0] + (vers[0] - de[0]) * p, de[1] + (vers[1] - de[1]) * p, de[2] + (vers[2] - de[2]) * p, rayon, couleur)
    }
  }

  // ---------- Le corps ----------
  boule(-0.12, 0.04, 0.04, 0.1, ENCRE, 0.05) // chaussures
  boule(0.12, 0.04, 0.04, 0.1, ENCRE, 0.05)
  boule(0, 0.24, 0, 0.25, a.pull, 0.22) // pull
  boule(0, 0.68, 0, 0.27, a.peau) // tête

  // ---------- Les cheveux ----------
  if (a.coiffure !== 'chauve') {
    boule(0, 0.76, -0.06, 0.28, a.cheveux) // l'arrière et le dessus du crâne
    boule(-0.12, 0.87, 0.14, 0.1, a.cheveux) // la frange : trois mèches sur le front
    boule(0, 0.9, 0.15, 0.1, a.cheveux)
    boule(0.12, 0.87, 0.14, 0.1, a.cheveux)
  }
  if (a.coiffure === 'chignon') boule(0, 1.02, -0.08, 0.1, a.cheveux)
  if (a.coiffure === 'milongs' || a.coiffure === 'longs') {
    boule(-0.2, 0.55, -0.08, 0.13, a.cheveux)
    boule(0.2, 0.55, -0.08, 0.13, a.cheveux)
    boule(0, 0.55, -0.15, 0.2, a.cheveux)
  }
  if (a.coiffure === 'longs') {
    boule(-0.2, 0.42, -0.1, 0.12, a.cheveux)
    boule(0.2, 0.42, -0.1, 0.12, a.cheveux)
    boule(0, 0.42, -0.16, 0.2, a.cheveux)
  }

  // ---------- Le visage ----------
  if (a.barbe) boule(0, 0.56, 0.12, 0.17, a.cheveux, 0.12)
  boule(-0.16, 0.62, 0.2, 0.045, 'rgba(255, 120, 120, 0.45)') // joues roses
  boule(0.16, 0.62, 0.2, 0.045, 'rgba(255, 120, 120, 0.45)')
  for (const cote of [-1, 1]) {
    if (content) {
      // œil plissé : un petit arc
      trait(cote * 0.1, 0.7, 0.25, 0.025, (px, py) => ctx.arc(px, py + 0.01 * t, 0.035 * t, Math.PI, 0))
    } else {
      boule(cote * 0.1, 0.7, 0.25, 0.028, ENCRE)
    }
    if (a.lunettes) trait(cote * 0.1, 0.7, 0.27, 0.018, (px, py) => ctx.arc(px, py, 0.068 * t, 0, Math.PI * 2))
  }
  if (a.lunettes) {
    trait(0, 0.7, 0.27, 0.018, (px, py) => {
      ctx.moveTo(px - 0.032 * t, py)
      ctx.lineTo(px + 0.032 * t, py)
    })
  }
  // La bouche (cachée par le bec quand il joue du saxophone)
  if (!a.saxophone) {
    trait(0, 0.61, 0.3, 0.025, (px, py) => ctx.arc(px, py - 0.03 * t, (content ? 0.08 : 0.055) * t, 0.2, Math.PI - 0.2))
  }

  // ---------- Les bras, et le saxophone ----------
  let mains = [
    [-0.29, 0.2, 0.04],
    [0.29, 0.2, 0.04],
  ]
  if (a.saxophone) {
    const bec = [0.01, 0.6, 0.27]
    const coude = [-0.03, 0.2, 0.31] // le bas du tube droit
    const OR = '#e8b84a'
    boudin(bec, [bec[0] - 0.004, bec[1] - 0.05, bec[2] + 0.005], 0.028, '#2a2220', 2) // le bec noir
    boudin([bec[0] - 0.005, bec[1] - 0.06, bec[2] + 0.006], coude, 0.036, OR, 22) // le tube
    boudin(coude, [0.04, 0.1, 0.33], 0.04, OR, 8) // la courbe du bas
    boudin([0.04, 0.1, 0.33], [0.15, 0.2, 0.33], 0.045, OR, 8) // la remontée
    boule(0.18, 0.24, 0.33, 0.08, OR) // le pavillon…
    boule(0.2, 0.26, 0.37, 0.05, '#8a6420') // …et son ouverture
    // Les mains se posent sur le tube, l'une au-dessus de l'autre.
    mains = [0.4, 0.85].map((p) => bec.map((v, i) => v + (coude[i] - v) * p + (i === 2 ? 0.03 : 0)))
  }
  mains.forEach((main, i) => {
    boudin([(i === 0 ? -1 : 1) * 0.2, 0.37, 0], main, 0.06, a.pull, 3)
    boule(main[0], main[1], main[2] + 0.02, 0.055, a.peau)
  })

  // ---------- Rotation, puis dessin du plus loin au plus proche ----------
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  pieces
    .map((p) => ({ dessin: p.dessin, px: x + (p.x * cos + p.z * sin) * t, py: y - p.y * t, loin: p.z * cos - p.x * sin }))
    .sort((p, q) => p.loin - q.loin)
    .forEach((p) => p.dessin(p.px, p.py))
}
