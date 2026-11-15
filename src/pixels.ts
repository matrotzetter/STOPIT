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
