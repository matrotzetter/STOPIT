// Les petits personnages, dessinés en code dans un <canvas>.
// La même fonction sert au mini-jeu, à l'île et à l'aperçu des réglages.
import { AVATARS_DEFAUT } from './config'
import type { Avatar, Etat } from './logique/types'

/** Les deux avatars de l'utilisateur ; ce qui manque est pris dans ceux par défaut. */
export function avatarsDe(etat: Etat): Avatar[] {
  return AVATARS_DEFAUT.map((defaut, i) => ({ ...defaut, ...etat.avatars?.[i] }))
}

/**
 * Dessine un avatar debout, en volume (ombres et reflets).
 * (x, y) = le point au sol entre ses pieds ; t = sa hauteur totale en pixels.
 * content = true : il sourit en grand, les yeux plissés.
 */
export function dessinerAvatar(ctx: CanvasRenderingContext2D, a: Avatar, x: number, y: number, t: number, content = false) {
  const r = t * 0.27 // rayon de la tête
  const cy = y - t + r * 1.15 // centre de la tête
  const largeurCorps = t * 0.5
  const hautCorps = y - t * 0.42
  const basCorps = y - t * 0.04

  const disque = (cx: number, cyy: number, rayon: number, couleur: string | CanvasGradient) => {
    ctx.fillStyle = couleur
    ctx.beginPath()
    ctx.arc(cx, cyy, rayon, 0, Math.PI * 2)
    ctx.fill()
  }
  /** Un dégradé rond qui donne du relief : clair en haut à gauche, sombre sur le bord opposé. */
  const relief = (cx: number, cyy: number, rayon: number) => {
    const g = ctx.createRadialGradient(cx - rayon * 0.4, cyy - rayon * 0.45, rayon * 0.1, cx, cyy, rayon * 1.1)
    g.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
    g.addColorStop(0.5, 'rgba(255, 255, 255, 0)')
    g.addColorStop(1, 'rgba(0, 0, 0, 0.25)')
    return g
  }

  // Cheveux longs ou mi-longs : une masse derrière la tête et les épaules
  if (a.coiffure === 'longs' || a.coiffure === 'milongs') {
    ctx.fillStyle = a.cheveux
    ctx.beginPath()
    ctx.roundRect(x - r * 1.12, cy - r * 0.4, r * 2.24, r * (a.coiffure === 'longs' ? 2.5 : 1.7), r * 0.5)
    ctx.fill()
  }

  // Chaussures
  for (const cote of [-1, 1]) {
    ctx.fillStyle = '#3a2a22'
    ctx.beginPath()
    ctx.ellipse(x + cote * t * 0.12, y - t * 0.03, t * 0.1, t * 0.05, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Corps : un pull arrondi, ombré comme un cylindre (clair à gauche, sombre à droite et en bas)
  const ombreCote = ctx.createLinearGradient(x - largeurCorps / 2, 0, x + largeurCorps / 2, 0)
  ombreCote.addColorStop(0, 'rgba(255, 255, 255, 0.18)')
  ombreCote.addColorStop(0.45, 'rgba(0, 0, 0, 0)')
  ombreCote.addColorStop(1, 'rgba(0, 0, 0, 0.3)')
  const ombreBas = ctx.createLinearGradient(0, hautCorps, 0, basCorps)
  ombreBas.addColorStop(0.4, 'rgba(0, 0, 0, 0)')
  ombreBas.addColorStop(1, 'rgba(0, 0, 0, 0.25)')
  for (const couleur of [a.pull, ombreCote, ombreBas]) {
    ctx.fillStyle = couleur
    ctx.beginPath()
    ctx.roundRect(x - largeurCorps / 2, hautCorps, largeurCorps, basCorps - hautCorps, [t * 0.18, t * 0.18, t * 0.08, t * 0.08])
    ctx.fill()
  }

  // Tête
  disque(x, cy, r, a.peau)
  disque(x, cy, r, relief(x, cy, r))

  // Barbe : le bas du visage
  if (a.barbe) {
    ctx.fillStyle = a.cheveux
    ctx.beginPath()
    ctx.arc(x, cy, r * 1.03, 0.45, Math.PI - 0.45)
    ctx.fill()
  }

  // Cheveux du dessus (une calotte), et le chignon
  if (a.coiffure !== 'chauve') {
    for (const couleur of [a.cheveux, relief(x, cy, r * 1.08)]) {
      ctx.fillStyle = couleur
      ctx.beginPath()
      ctx.arc(x, cy, r * 1.08, Math.PI + 0.3, -0.3)
      ctx.fill()
    }
    if (a.coiffure === 'chignon') {
      disque(x, cy - r * 1.2, r * 0.45, a.cheveux)
      disque(x, cy - r * 1.2, r * 0.45, relief(x, cy - r * 1.2, r * 0.45))
    }
  }

  // Joues roses
  disque(x - r * 0.55, cy + r * 0.3, r * 0.17, 'rgba(255, 120, 120, 0.35)')
  disque(x + r * 0.55, cy + r * 0.3, r * 0.17, 'rgba(255, 120, 120, 0.35)')

  // Yeux et bouche
  ctx.strokeStyle = '#3a2a22'
  ctx.lineWidth = Math.max(1, r * 0.1)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const cote of [-1, 1]) {
    const ex = x + cote * r * 0.38
    if (content) {
      ctx.beginPath()
      ctx.arc(ex, cy + r * 0.08, r * 0.13, Math.PI, 0) // œil plissé : un petit arc
      ctx.stroke()
    } else {
      disque(ex, cy + r * 0.05, r * 0.09, '#3a2a22')
    }
  }
  ctx.beginPath()
  ctx.arc(x, cy + r * 0.3, r * (content ? 0.3 : 0.2), 0.15, Math.PI - 0.15)
  ctx.stroke()

  // Lunettes
  if (a.lunettes) {
    ctx.lineWidth = Math.max(1, r * 0.07)
    for (const cote of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(x + cote * r * 0.38, cy + r * 0.05, r * 0.25, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(x - r * 0.13, cy + r * 0.05)
    ctx.lineTo(x + r * 0.13, cy + r * 0.05)
    ctx.stroke()
  }

  // Où sont les mains : le long du corps, ou sur le saxophone.
  const epaule = hautCorps + t * 0.07
  let mains = [
    [x - largeurCorps / 2 - t * 0.03, hautCorps + t * 0.26],
    [x + largeurCorps / 2 + t * 0.03, hautCorps + t * 0.26],
  ]

  // Saxophone : un tube doré qui part de la bouche, descend, et remonte vers le pavillon
  if (a.saxophone) {
    const [bx, by] = [x + r * 0.05, cy + r * 0.5] // le bec, à la bouche
    const [cx2, cy2] = [x - t * 0.04, y - t * 0.2] // le bas du tube droit
    const tube = () => {
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(cx2, cy2)
      ctx.quadraticCurveTo(x - t * 0.03, y - t * 0.05, x + t * 0.1, y - t * 0.08)
      ctx.lineTo(x + t * 0.17, y - t * 0.2)
      ctx.stroke()
    }
    ctx.strokeStyle = '#b8862b'
    ctx.lineWidth = t * 0.085
    tube()
    ctx.strokeStyle = '#e8b84a'
    ctx.lineWidth = t * 0.06
    tube()
    ctx.strokeStyle = '#fbe6a2' // reflet
    ctx.lineWidth = t * 0.015
    tube()
    // Le pavillon (l'ouverture évasée) et le bec noir
    for (const [rayon, couleur] of [[0.085, '#e8b84a'], [0.055, '#8a6420']] as const) {
      ctx.fillStyle = couleur
      ctx.beginPath()
      ctx.ellipse(x + t * 0.18, y - t * 0.22, t * rayon, t * rayon * 0.55, -0.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = '#2a2220'
    ctx.lineWidth = t * 0.04
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(bx + (cx2 - bx) * 0.12, by + (cy2 - by) * 0.12)
    ctx.stroke()
    // Les mains se posent sur le tube, l'une au-dessus de l'autre.
    mains = [0.45, 0.85].map((p) => [bx + (cx2 - bx) * p, by + (cy2 - by) * p])
  }

  // Bras (de l'épaule à la main) et mains
  mains.forEach(([mx, my], i) => {
    const ex = x + (i === 0 ? -1 : 1) * (largeurCorps / 2 - t * 0.04)
    for (const couleur of [a.pull, 'rgba(0, 0, 0, 0.15)']) {
      ctx.strokeStyle = couleur
      ctx.lineWidth = t * 0.09
      ctx.beginPath()
      ctx.moveTo(ex, epaule)
      ctx.lineTo(mx, my)
      ctx.stroke()
    }
    disque(mx, my, t * 0.055, a.peau)
  })
}
