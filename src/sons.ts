// Sons générés en code (aucun fichier audio) grâce à l'API Web Audio du navigateur.

let contexte: AudioContext | undefined
let actifs = true

/** Active ou coupe tous les sons (réglage de l'utilisateur). */
export function reglerSons(valeur: boolean) {
  actifs = valeur
}

/** Les mélodies : une liste de notes (fréquence en hertz), jouées l'une après l'autre. */
const MELODIES = {
  pose: [330],
  ligne: [523, 784],
  victoire: [523, 659, 784, 1047],
}

/** Joue un petit son. Ne fait rien si les sons sont coupés ou indisponibles. */
export function son(nom: keyof typeof MELODIES) {
  if (!actifs) return
  try {
    contexte ??= new AudioContext()
    contexte.resume() // l'iPhone met le son en pause tant qu'on n'a pas touché l'écran
    const ctx = contexte
    MELODIES[nom].forEach((frequence, i) => {
      const debut = ctx.currentTime + i * 0.09
      const oscillateur = ctx.createOscillator() // produit la note
      const volume = ctx.createGain() // règle son volume
      oscillateur.frequency.value = frequence
      // La note démarre doucement (volume 0.08) puis s'éteint en 0.15 seconde.
      volume.gain.setValueAtTime(0.08, debut)
      volume.gain.exponentialRampToValueAtTime(0.001, debut + 0.15)
      oscillateur.connect(volume).connect(ctx.destination)
      oscillateur.start(debut)
      oscillateur.stop(debut + 0.15)
    })
  } catch {
    // Pas de son sur ce navigateur : ce n'est pas grave.
  }
}
