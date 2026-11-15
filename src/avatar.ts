// Les petits personnages du mini-jeu, dessinés en code dans un <canvas>.
// La même fonction sert au mini-jeu et à l'aperçu des réglages.
import { AVATARS_DEFAUT } from './config'
import type { Avatar, Etat } from './logique/types'

/** Les deux avatars de l'utilisateur ; ce qui manque est pris dans ceux par défaut. */
export function avatarsDe(etat: Etat): Avatar[] {
  return AVATARS_DEFAUT.map((defaut, i) => ({ ...defaut, ...etat.avatars?.[i] }))
}

/**
 * Dessine un avatar debout.
 * (x, y) = le point au sol entre ses pieds ; t = sa hauteur totale en pixels.
 * content = true : il sourit en grand, les yeux plissés.
 */
export function dessinerAvatar(ctx: CanvasRenderingContext2D, a: Avatar, x: number, y: number, t: number, content = false) {
  const r = t * 0.27 // rayon de la tête
  const cy = y - t + r * 1.15 // centre de la tête
  const largeurCorps = t * 0.5
  const hautCorps = y - t * 0.42

  const disque = (cx: number, cyy: number, rayon: number, couleur: string) => {
    ctx.fillStyle = couleur
    ctx.beginPath()
    ctx.arc(cx, cyy, rayon, 0, Math.PI * 2)
    ctx.fill()
  }

  // Cheveux longs ou mi-longs : une masse derrière la tête et les épaules
  if (a.coiffure === 'longs' || a.coiffure === 'milongs') {
    ctx.fillStyle = a.cheveux
    ctx.beginPath()
    ctx.roundRect(x - r * 1.12, cy - r * 0.4, r * 2.24, r * (a.coiffure === 'longs' ? 2.5 : 1.7), r * 0.5)
    ctx.fill()
  }

  // Corps : un pull arrondi, plus sombre en bas pour donner du volume
  const degrade = ctx.createLinearGradient(0, hautCorps, 0, y)
  degrade.addColorStop(0, 'rgba(0,0,0,0)')
  degrade.addColorStop(1, 'rgba(0,0,0,0.3)')
  for (const couleur of [a.pull, degrade]) {
    ctx.fillStyle = couleur
    ctx.beginPath()
    ctx.roundRect(x - largeurCorps / 2, hautCorps, largeurCorps, y - hautCorps, [t * 0.18, t * 0.18, t * 0.08, t * 0.08])
    ctx.fill()
  }

  // Tête
  disque(x, cy, r, a.peau)

  // Barbe : le bas du visage
  if (a.barbe) {
    ctx.fillStyle = a.cheveux
    ctx.beginPath()
    ctx.arc(x, cy, r * 1.03, 0.45, Math.PI - 0.45)
    ctx.fill()
  }

  // Cheveux du dessus (une calotte), et le chignon
  if (a.coiffure !== 'chauve') {
    ctx.fillStyle = a.cheveux
    ctx.beginPath()
    ctx.arc(x, cy, r * 1.08, Math.PI + 0.3, -0.3)
    ctx.fill()
    if (a.coiffure === 'chignon') disque(x, cy - r * 1.2, r * 0.45, a.cheveux)
  }

  // Joues roses
  disque(x - r * 0.55, cy + r * 0.3, r * 0.17, 'rgba(255, 120, 120, 0.35)')
  disque(x + r * 0.55, cy + r * 0.3, r * 0.17, 'rgba(255, 120, 120, 0.35)')

  // Yeux et bouche
  ctx.strokeStyle = '#3a2a22'
  ctx.lineWidth = Math.max(1, r * 0.1)
  ctx.lineCap = 'round'
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
}
