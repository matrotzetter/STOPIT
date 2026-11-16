// Petits dessins en « pixel art » partagés par l'île et le mini-jeu.
// Un motif est décrit en texte : chaque lettre est un pixel d'une couleur, « . » = transparent.

/** Dessine un motif, coin haut gauche en (x, y). `couleurs` donne la couleur de chaque lettre. */
export function dessinerMotif(
  ctx: CanvasRenderingContext2D,
  lignes: string[],
  x: number,
  y: number,
  couleurs: Record<string, string>,
) {
  lignes.forEach((ligne, dy) =>
    [...ligne].forEach((lettre, dx) => {
      if (lettre === '.') return
      ctx.fillStyle = couleurs[lettre]
      ctx.fillRect(x + dx, y + dy, 1, 1)
    }),
  )
}

/** Couleurs des motifs ci-dessous. */
export const COULEURS_MOTIFS: Record<string, string> = {
  o: '#f4883a', // flamme orange
  y: '#f9c64a', // flamme jaune
  w: '#fff0a8', // cœur de la flamme
  b: '#6b4a34', // bûche
  B: '#4a3222', // bûche, côté sombre
  n: '#e6ebf0', // nuage clair
  g: '#b8c2cc', // nuage, dessous gris
  c: '#f3e6d6', // flèche « on recommence »
  // Couleurs des bâtiments
  r: '#d9534a', // rouge (toits, bandes du phare)
  R: '#a53a34', // rouge foncé
  t: '#b07a4a', // bois
  T: '#7a5233', // bois foncé
  s: '#c2bdb5', // pierre
  S: '#8a857f', // pierre foncée
  v: '#5fae5a', // feuillage
  V: '#3f8a44', // feuillage foncé
  j: '#f6d55c', // jaune (lumière, fleurs)
  l: '#a8dcf4', // eau claire, vitre
  L: '#4a9ed0', // eau
  p: '#f0a0c0', // rose
  e: '#f4f1ea', // blanc cassé
  x: '#2a1a24', // noir (portes, ombres)
}

/** Le feu de camp : deux images qui alternent pour le faire danser. */
export const FEU = [
  ['....o....', '...oo....', '...oyo...', '..ooyo.o.', '..oyyoo..', '.ooywyo..', '.oyywyoo.', '.oyywyyo.', '..oyyyo..', '.bbBbbBb.'],
  ['...o.....', '....oo...', '...oyo...', '.o.oyoo..', '..ooyyo..', '..oywyoo.', '.ooywyyo.', '.oyywyyo.', '..oyyyo..', '.bBbbBbb.'],
]

/** Un petit nuage de brume. */
export const NUAGE = ['...nnnn.....', '.nnnnnnnn...', 'nnnnnnnnnnn.', 'nnnnnnnnnnnn', '.gggggggggg.']

/** La flèche ronde affichée quand la partie recommence. */
export const FLECHE = ['..ccc.c', '.c...cc', 'c...ccc', 'c......', 'c.....c', '.c...c.', '..ccc..']

/** Les moments de la journée, pour la couleur du ciel de l'île. */
export type Periode = 'nuit' | 'aube' | 'jour' | 'soir'

/** Le moment de la journée à une heure donnée (de 0 à 23). */
export function periode(heure: number): Periode {
  if (heure < 5 || heure >= 21) return 'nuit'
  if (heure < 8) return 'aube'
  if (heure < 17) return 'jour'
  return 'soir'
}

/** Couleurs du ciel, de haut en bas, jusqu'à la mer (les deux dernières bandes). */
export const CIELS: Record<Periode, string[]> = {
  nuit: ['#2a2052', '#2b2a5e', '#2a3868', '#274a73', '#23597f', '#1f6f8f'],
  aube: ['#4a3a78', '#8a5a92', '#d27a8c', '#f4a97c', '#4f93ad', '#3f84a0'],
  jour: ['#4a9ede', '#62b0e6', '#7fc2ee', '#a3d6f4', '#3d9cc6', '#2f8cb8'],
  soir: ['#2f2a6b', '#5b3a86', '#a8508a', '#e8785f', '#3a6f95', '#2f6088'],
}

/**
 * Le dessin de chaque bâtiment et décoration de l'île, par identifiant du CATALOGUE.
 * Le feu de camp n'est pas ici : il utilise les deux images animées de FEU.
 */
export const BATIMENTS: Record<string, string[]> = {
  cabane: ['....r....', '...rrr...', '..rrrrr..', '.rrrrrrr.', 'RRRRRRRRR', '.ttxxtlt.', '.ttxxttt.', '.ttxxttt.'],
  potager: ['.v.v.v.v.', '.V.V.V.V.', 'TTTTTTTTT', '.v.v.v.v.', 'TTTTTTTTT'],
  puits: ['.TTTTT.', 'T.....T', 'T..x..T', 'T..x..T', 'sssssss', 'sSsSsSs', 'sssssss', 'SsSsSsS'],
  atelier: ['......SS.', '......SS.', '.TTTTTTT.', 'TTTTTTTTT', '.ssssess.', '.sxxsess.', '.sxxssss.', '.sxxssss.'],
  ferme: ['....RRR....', '...RrrrR...', '..RrrrrrR..', '.RrrrrrrrR.', '.rrreeerrr.', '.rrrexerrr.', '.rrrexerrr.', '.rrrexerrr.'],
  phare: ['..j..', '.jjj.', '.xxx.', '.eee.', '.rrr.', '.eee.', '.rrr.', '.eee.', '.rrr.', '.eee.', 'sssss', 'sssss'],
  observatoire: ['...sss...', '..sssLs..', '.sssLsss.', '.ssLssss.', '.eeeeeee.', '.eexxeee.', '.eexxeee.'],
  chateau: [
    's.s.....s.s',
    'sss.....sss',
    'sss.s.s.sss',
    'sSs.sss.sSs',
    'sssssssssss',
    'sSsssssssSs',
    'ssssxxxssss',
    'sssxxxxxsss',
    'sSsxxxxxsSs',
    'sssxxxxxsss',
  ],
  fleurs: ['.p...j.', 'pjp.jrj', '.v...v.', '.v.p.v.'],
  arbre: ['..vvv..', '.vvvvv.', 'vvVvvvv', 'vvvvVvv', '.vvvvv.', '..vVv..', '...T...', '...T...', '..TTT..'],
  fontaine: ['....l....', '...lLl...', '....l....', '..sssss..', '.slLlLls.', '.sssssss.', '..SSSSS..'],
  statue: ['.sss.', '.sSs.', '.sss.', 'sssss', '.sss.', '.sss.', '.s.s.', 'SSSSS', 'SSSSS'],
}
