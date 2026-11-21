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

/** Fréquence d'une note à partir de son numéro MIDI (60 = do du milieu du piano, 69 = la 440 Hz). */
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

/**
 * Joue une note : `debut` et `duree` en secondes, `type` = forme de l'onde (le timbre).
 * Si `filtre` est donné, les aigus au-dessus de cette fréquence sont adoucis.
 */
function note(ctx: AudioContext, frequence: number, debut: number, duree: number, type: OscillatorType, fort: number, filtre?: number) {
  const oscillateur = ctx.createOscillator() // produit la note
  const volume = ctx.createGain() // règle son volume
  oscillateur.type = type
  oscillateur.frequency.value = frequence
  // La note monte très vite puis s'éteint doucement.
  volume.gain.setValueAtTime(0.0001, debut)
  volume.gain.exponentialRampToValueAtTime(fort, debut + 0.015)
  volume.gain.exponentialRampToValueAtTime(0.0001, debut + duree)
  if (filtre) {
    const passeBas = ctx.createBiquadFilter() // un filtre « passe-bas » : il laisse passer les graves
    passeBas.frequency.value = filtre
    oscillateur.connect(passeBas).connect(volume)
  } else {
    oscillateur.connect(volume)
  }
  volume.connect(ctx.destination)
  oscillateur.start(debut)
  oscillateur.stop(debut + duree + 0.05)
}

/**
 * Le concert du club de jazz : un ii-V-I en do majeur (Dm7, G7, Cmaj7), en croches swing.
 * Saxophone (la mélodie), piano (les accords, rythme « charleston ») et contrebasse (walking bass).
 * Dure environ 6 secondes (DUREE_CONCERT_MS dans config.ts).
 */
function jazz(ctx: AudioContext) {
  const temps = 0.4 // durée d'un temps, en secondes (150 à la noire)
  const t0 = ctx.currentTime + 0.05
  // Croches swing : la première d'une paire dure 2/3 du temps, la seconde 1/3.
  const croche = (n: number) => t0 + Math.floor(n / 2) * temps + (n % 2) * temps * (2 / 3)

  // Saxophone : montée en Dm7, arpège de G7 puis chromatisme la♭ → sol → fa, résolution sur mi (tierce de Cmaj7).
  const ligne = [74, 77, 81, 84, 83, 81, 79, 77, 67, 71, 74, 77, 81, 80, 79, 77]
  ligne.forEach((midi, n) => note(ctx, hz(midi), croche(n), n % 2 ? 0.14 : 0.26, 'sawtooth', 0.045, 2200))
  note(ctx, hz(76), croche(16), temps * 3, 'sawtooth', 0.05, 2200)

  // Piano : accords sans fondamentale, sur le 1er temps et le « et » du 2e temps de chaque mesure.
  const accords = [
    [53, 57, 60, 64], // Dm7 : fa la do mi
    [53, 59, 64], // G7 (G13) : fa si mi
    [52, 55, 59, 62], // Cmaj7 (Cmaj9) : mi sol si ré
  ]
  accords.forEach((accord, mesure) => {
    const debut = t0 + mesure * 4 * temps
    for (const midi of accord) {
      note(ctx, hz(midi), debut, mesure === 2 ? temps * 4 : temps * 1.2, 'triangle', 0.03)
      if (mesure < 2) note(ctx, hz(midi), debut + temps * (1 + 2 / 3), temps * 0.6, 'triangle', 0.025)
    }
  })

  // Contrebasse : une note par temps, qui « marche » d'un accord à l'autre.
  const basse = [50, 52, 53, 54, 55, 53, 52, 49, 48]
  basse.forEach((midi, n) => note(ctx, hz(midi), t0 + n * temps, n === 8 ? temps * 3 : temps * 0.9, 'sine', 0.09))
}

/** Joue un petit son. Ne fait rien si les sons sont coupés ou indisponibles. */
export function son(nom: keyof typeof MELODIES | 'jazz') {
  if (!actifs) return
  try {
    contexte ??= new AudioContext()
    contexte.resume() // l'iPhone met le son en pause tant qu'on n'a pas touché l'écran
    const ctx = contexte
    if (nom === 'jazz') return jazz(ctx)
    const sax = nom === 'sax'
    const duree = sax ? 0.24 : 0.15 // durée d'une note, en secondes
    MELODIES[nom].forEach((frequence, i) => {
      const debut = ctx.currentTime + i * (sax ? 0.14 : 0.09)
      // « sawtooth » : une onde en dents de scie, au son cuivré ; « sine » : un son pur.
      note(ctx, frequence, debut, duree, sax ? 'sawtooth' : 'sine', sax ? 0.05 : 0.08)
    })
  } catch {
    // Pas de son sur ce navigateur : ce n'est pas grave.
  }
}
