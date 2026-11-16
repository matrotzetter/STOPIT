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
  // Un petit air de saxophone : notes plus longues, au timbre plus cuivré.
  sax: [392, 466, 523, 622, 523, 466, 523, 784],
}

/** Joue un petit son. Ne fait rien si les sons sont coupés ou indisponibles. */
export function son(nom: keyof typeof MELODIES) {
  if (!actifs) return
  try {
    contexte ??= new AudioContext()
    contexte.resume() // l'iPhone met le son en pause tant qu'on n'a pas touché l'écran
    const ctx = contexte
    const sax = nom === 'sax'
    const duree = sax ? 0.24 : 0.15 // durée d'une note, en secondes
    MELODIES[nom].forEach((frequence, i) => {
      const debut = ctx.currentTime + i * (sax ? 0.14 : 0.09)
      const oscillateur = ctx.createOscillator() // produit la note
      const volume = ctx.createGain() // règle son volume
      oscillateur.type = sax ? 'sawtooth' : 'sine' // « sawtooth » : une onde en dents de scie, au son cuivré
      oscillateur.frequency.value = frequence
      // La note démarre doucement puis s'éteint.
      volume.gain.setValueAtTime(sax ? 0.05 : 0.08, debut)
      volume.gain.exponentialRampToValueAtTime(0.001, debut + duree)
      oscillateur.connect(volume).connect(ctx.destination)
      oscillateur.start(debut)
      oscillateur.stop(debut + duree)
    })
  } catch {
    // Pas de son sur ce navigateur : ce n'est pas grave.
  }
}
