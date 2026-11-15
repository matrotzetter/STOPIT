// Les petits personnages, dessinés en « pixel art » dans un <canvas>.
// La même fonction sert au mini-jeu, à l'île et à l'aperçu des réglages.
//
// Un avatar est une petite image de 16 pixels de large sur 21 de haut, décrite en
// texte : chaque lettre est un gros pixel d'une couleur donnée (voir `couleurDe`).
// On superpose plusieurs calques : cheveux de derrière, corps, cheveux de devant,
// barbe, lunettes, saxophone.
import { AVATARS_DEFAUT } from './config'
import type { Avatar, Etat } from './logique/types'

/** Les deux avatars de l'utilisateur ; ce qui manque est pris dans ceux par défaut. */
export function avatarsDe(etat: Etat): Avatar[] {
  return AVATARS_DEFAUT.map((defaut, i) => ({ ...defaut, ...etat.avatars?.[i] }))
}

/** false si la personne a demandé moins d'animations à son appareil : tout reste alors immobile. */
export const ANIME = typeof matchMedia === 'undefined' || !matchMedia('(prefers-reduced-motion: reduce)').matches

/** Direction du regard à l'instant t (en millisecondes) : passe doucement de gauche à droite. */
export function balancement(t: number, decalage = 0): number {
  return Math.sin(t / 1400 + decalage) * 0.45
}

/** Taille de l'image d'un avatar, en gros pixels. */
export const LARGEUR_AVATAR = 16
export const HAUTEUR_AVATAR = 21

/** Un calque : des lignes de l'image, chacune avec son numéro (0 = tout en haut). « . » = transparent. */
type Calque = [number, string][]

/**
 * Les calques. Lettres : o contour, s peau, c joue, m bouche, p pull, k chaussure,
 * h cheveux, l reflet des cheveux, n noir, g or, G or foncé.
 */
export const CALQUES: Record<string, Calque> = {
  corps: [
    [3, '....oooooooo....'],
    [4, '...osssssssso...'],
    [5, '..osssssssssso..'],
    [6, '..osssssssssso..'],
    [7, '..osssssssssso..'],
    [8, '..osssssssssso..'],
    [9, '..osssssssssso..'],
    [10, '..osssssssssso..'],
    [11, '..oscssmmsscso..'],
    [12, '...osssssssso...'],
    [13, '....oooooooo....'],
    [14, '...oppppppppo...'],
    [15, '..oppppppppppo..'],
    [16, '..opoppppppopo..'],
    [17, '..osopppppposo..'],
    [18, '..ooppppppppoo..'],
    [19, '....okkookko....'],
    [20, '....oooooooo....'],
  ],
  // Cheveux de devant : un casque avec une frange, commun à toutes les coiffures.
  cheveux: [
    [2, '....oooooooo....'],
    [3, '...ohhllhhhho...'],
    [4, '..ohhllhhhhhho..'],
    [5, '..ohhhhhhhhhho..'],
    [6, '..ohhh....hhho..'],
    [7, '..ohh......hho..'],
    [8, '..oh........ho..'],
  ],
  chignon: [
    [0, '......oooo......'],
    [1, '.....ohlhho.....'],
    [2, '.....ohhhho.....'],
  ],
  // Cheveux de derrière : dessinés avant le corps, ils dépassent de chaque côté.
  milongs: [
    [9, 'ohh..........hho'],
    [10, 'ohh..........hho'],
    [11, 'ohh..........hho'],
    [12, 'ohhh........hhho'],
    [13, 'ohhhh......hhhho'],
    [14, '.oooo......oooo.'],
  ],
  longs: [
    [9, 'ohh..........hho'],
    [10, 'ohh..........hho'],
    [11, 'ohh..........hho'],
    [12, 'ohhh........hhho'],
    [13, 'ohhhh......hhhho'],
    [14, 'ohhh........hhho'],
    [15, 'ohh..........hho'],
    [16, 'ohh..........hho'],
    [17, 'ohh..........hho'],
    [18, '.oo..........oo.'],
  ],
  barbe: [
    [9, '...h........h...'],
    [10, '...hh......hh...'],
    [11, '...hhhhmmhhhh...'],
    [12, '....hhhhhhhh....'],
  ],
  lunettes: [
    [7, '...nnnnnnnnnn...'],
    [8, '...n...nn...n...'],
    [9, '...n...nn...n...'],
    [10, '...nnnnnnnnnn...'],
  ],
  saxophone: [
    [11, '.......nn.......'],
    [12, '.......gG.......'],
    [13, '.......gG.......'],
    [14, '......sgG.......'],
    [15, '.......gG..ggG..'],
    [16, '.......gGsggG...'],
    [17, '.......ggggG....'],
    [18, '........GGG.....'],
  ],
}

const CONTOUR = '#2a1a24'

/**
 * Dessine un avatar debout.
 * (x, y) = le point au sol entre ses pieds ; t = sa hauteur en pixels d'écran.
 * content = true : il sourit, les yeux plissés.
 * angle = où il regarde (négatif = à gauche, positif = à droite).
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
  // Côté d'un gros pixel : un nombre entier, pour que le dessin reste net.
  const p = Math.max(1, Math.round(t / HAUTEUR_AVATAR))
  const gauche = Math.round(x - (LARGEUR_AVATAR * p) / 2)
  const haut = Math.round(y - HAUTEUR_AVATAR * p)
  const maintenant = ANIME ? performance.now() : 0
  // Il respire : une image sur deux, tout sauf les pieds descend d'un pixel.
  const respire = Math.floor(maintenant / 600) % 2
  // Il cligne des yeux un court instant toutes les 4 secondes environ.
  const cligne = ANIME && maintenant % 4000 < 160

  const couleurDe: Record<string, string> = {
    o: CONTOUR,
    s: a.peau,
    c: a.peau,
    m: '#7a3b3b',
    p: a.pull,
    k: '#4a342c',
    h: a.cheveux,
    l: a.cheveux,
    n: '#1e1a1c',
    g: '#f0c14b',
    G: '#b8862b',
  }
  /** Peint un gros pixel (colonne, ligne). Les lignes au-dessus des pieds suivent la respiration. */
  const pixel = (colonne: number, ligne: number, couleur: string) => {
    ctx.fillStyle = couleur
    ctx.fillRect(gauche + colonne * p, haut + (ligne + (ligne < 19 ? respire : 0)) * p, p, p)
  }
  const dessiner = (calque: Calque) => {
    for (const [ligne, texte] of calque) {
      ;[...texte].forEach((lettre, colonne) => {
        if (lettre === '.') return
        pixel(colonne, ligne, couleurDe[lettre])
        if (lettre === 'c') pixel(colonne, ligne, 'rgba(255, 110, 120, 0.55)') // joue : du rose sur la peau
        if (lettre === 'l') pixel(colonne, ligne, 'rgba(255, 255, 255, 0.25)') // reflet : du blanc sur les cheveux
      })
    }
  }

  if (a.coiffure === 'milongs' || a.coiffure === 'longs') dessiner(CALQUES[a.coiffure])
  dessiner(CALQUES.corps)
  if (a.coiffure !== 'chauve') dessiner(CALQUES.cheveux)
  if (a.coiffure === 'chignon') dessiner(CALQUES.chignon)
  if (a.barbe) dessiner(CALQUES.barbe)

  // Les yeux : deux pixels de haut, décalés d'un pixel du côté où il regarde.
  const regard = Math.max(-1, Math.min(1, Math.round(angle * 3)))
  for (const colonne of [5 + regard, 10 + regard]) {
    if (content) {
      pixel(colonne, 8, couleurDe.n) // yeux plissés de joie : un petit chapeau « ^ »
      pixel(colonne - 1, 9, couleurDe.n)
      pixel(colonne + 1, 9, couleurDe.n)
    } else {
      if (!cligne) pixel(colonne, 8, couleurDe.n)
      pixel(colonne, 9, couleurDe.n)
    }
  }
  if (content && !a.saxophone) {
    pixel(6, 11, couleurDe.m) // sourire plus large
    pixel(9, 11, couleurDe.m)
  }

  if (a.lunettes) dessiner(CALQUES.lunettes)
  if (a.saxophone) dessiner(CALQUES.saxophone)
}
