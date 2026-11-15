// Le mini-jeu : on fait glisser des blocs sur un plateau en bois pour compléter
// des lignes, au coin du feu. Dessiné dans un <canvas> (une zone de dessin),
// pour rester fluide sur téléphone.
// Les règles sont dans logique/puzzle.ts ; ici il n'y a que le dessin et le doigt.
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { ANIME, balancement, dessinerAvatar } from '../avatar'
import { PUZZLE_TAILLE as N } from '../config'
import type { Avatar } from '../logique/types'
import { son } from '../sons'
import { estBloquee, jouerCoup, nouvellePartie, peutPoser, type Forme, type Partie } from '../logique/puzzle'

/** Couleurs des cases : la n° 0 est un creux vide du plateau en bois, les autres sont les blocs. */
const COULEURS = ['#5a3d2b', '#9cc5a1', '#f2c14e', '#e8a0a8', '#f4a26b']

/** Taille des formes en attente, par rapport aux cases de la grille. */
const ECHELLE_MAIN = 0.5

/** Marge entre le bord du plateau et les cases, en pixels. */
const MARGE = 8

/** Le plateau est vu de biais : une case est moins haute que large. */
const APLATI = 0.78

interface Props {
  /** Meilleur score enregistré. */
  record: number
  /** Appelé quand le score dépasse le record. */
  onRecord: (score: number) => void
  /** Les deux personnages assis près du feu. */
  avatars: Avatar[]
}

/** Tout ce qui change pendant le jeu, gardé hors de React pour ne pas redessiner la page à chaque geste. */
interface Jeu {
  partie: Partie
  /** Forme en train d'être déplacée : son numéro dans la main et la position du doigt. */
  glisse: { index: number; x: number; y: number } | null
  /** Cases qui viennent d'être effacées (elles clignotent en clair un instant). */
  flash: number[]
  bloquee: boolean
  /** Largeur du dessin et largeur d'une case, en pixels. */
  largeur: number
  cote: number
}

export default function MiniJeu({ record, onRecord, avatars }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // useState avec une fonction : l'objet est créé une seule fois et reste le même ensuite.
  const [jeu] = useState<Jeu>(() => ({
    partie: nouvellePartie(),
    glisse: null,
    flash: [],
    bloquee: false,
    largeur: 0,
    cote: 0,
  }))
  const [score, setScore] = useState(0)

  /** Hauteur d'une case à l'écran. */
  const ch = () => jeu.cote * APLATI
  /** Hauteur du décor (feu et avatars) au-dessus du plateau. */
  const hautScene = () => jeu.cote * 2.4
  /** Haut de la première rangée de cases (on laisse la place de l'épaisseur d'un bloc). */
  const hautGrille = () => hautScene() + MARGE + jeu.cote * 0.26
  /** Bas du plateau en bois. */
  const basPlateau = () => hautGrille() + N * ch() + MARGE
  /** Haut de la zone des formes en attente. */
  const hautMain = () => basPlateau() + 18
  /** Hauteur totale du dessin. */
  const hauteurTotale = () => hautMain() + jeu.cote * 2.4

  /** Coin haut gauche de la forme déplacée : centrée sous le doigt, et soulevée pour rester visible. */
  function origineGlisse(forme: Forme) {
    const g = jeu.glisse!
    return { ox: g.x - (forme.largeur * jeu.cote) / 2, oy: g.y - forme.hauteur * ch() - jeu.cote }
  }

  /** Case de la grille visée par la forme déplacée. */
  function caseVisee(forme: Forme) {
    const { ox, oy } = origineGlisse(forme)
    return { cx: Math.round((ox - MARGE) / jeu.cote), cy: Math.round((oy - hautGrille()) / ch()) }
  }

  /** Redessine tout le jeu. */
  function dessiner() {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { partie, glisse, cote, largeur } = jeu
    ctx.clearRect(0, 0, largeur, hauteurTotale())
    /** L'heure, en millisecondes : elle fait bouger le feu, les braises et les avatars. */
    const t = ANIME ? performance.now() : 0

    /** Dessine un rectangle aux coins arrondis. */
    const rect = (x: number, y: number, l: number, h: number, rayon: number, couleur: string | CanvasGradient) => {
      ctx.fillStyle = couleur
      ctx.beginPath()
      ctx.roundRect(x, y, l, h, rayon)
      ctx.fill()
    }
    /** Dessine un bloc en volume posé sur la case (x, y) : face avant sombre, dessus clair. */
    const bloc = (x: number, y: number, c: number, couleur: string) => {
      const h = c * APLATI
      const e = c * 0.26 // épaisseur du bloc
      const rayon = c / 7
      rect(x + 1, y + 1 - e, c - 2, h - 2 + e, rayon, couleur) // le bloc entier
      rect(x + 1, y + 1 - e, c - 2, h - 2 + e, rayon, 'rgba(0, 0, 0, 0.3)') // assombri…
      rect(x + 1, y + 1 - e, c - 2, h - 2, rayon, couleur) // …sauf le dessus
      rect(x + 3, y + 2 - e, c - 6, h * 0.22, rayon, 'rgba(255, 255, 255, 0.22)') // reflet
    }
    /** Dessine une forme entière à partir de son coin haut gauche. */
    const dessinerForme = (forme: Forme, x: number, y: number, c: number) => {
      // Du fond vers l'avant : les blocs de devant cachent ceux de derrière.
      for (const [dx, dy] of [...forme.cases].sort((a, b) => a[1] - b[1])) {
        bloc(x + dx * c, y + dy * c * APLATI, c, COULEURS[forme.couleur])
      }
    }

    // 1. Le décor : une pièce sombre et chaude, une guirlande, un feu, les deux avatars
    rect(0, 0, largeur, hauteurTotale(), 16, '#241b17')
    const sol = hautScene() - 4
    const lueur = ctx.createRadialGradient(largeur / 2, sol, 0, largeur / 2, sol, cote * 3.5)
    lueur.addColorStop(0, 'rgba(255, 170, 80, 0.4)')
    lueur.addColorStop(1, 'rgba(255, 170, 80, 0)')
    rect(0, 0, largeur, hautScene(), 16, lueur)
    ctx.strokeStyle = '#4a3a30'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, 8)
    ctx.quadraticCurveTo(largeur / 2, 34, largeur, 8)
    ctx.stroke()
    for (let i = 0; i < 9; i++) {
      const t = (i + 0.5) / 9
      rect(largeur * t - 3, 7 + 2 * t * (1 - t) * 26, 6, 6, 3, '#ffd98a') // ampoules le long du fil
    }
    rect(largeur / 2 - cote * 0.6, sol - cote * 0.2, cote * 1.2, cote * 0.2, cote * 0.1, '#5a3d2b') // bûches
    // Flammes : des ovales de plus en plus clairs. [décalage, taille, couleur]
    const flammes = [
      [-0.22, 0.7, '#f4803a'],
      [0.22, 0.6, '#f4803a'],
      [0, 0.95, '#f2a03d'],
      [0, 0.5, '#ffe08a'],
    ] as const
    flammes.forEach(([dx, tailleFixe, couleur], n) => {
      const taille = tailleFixe * (1 + 0.12 * Math.sin(t / 130 + n * 2)) // chaque flamme vacille à son rythme
      ctx.fillStyle = couleur
      ctx.beginPath()
      ctx.ellipse(largeur / 2 + dx * cote, sol - cote * (0.15 + taille / 2), cote * 0.2 * taille + 3, (cote * taille) / 2, 0, 0, Math.PI * 2)
      ctx.fill()
    })
    // Braises : des étincelles qui montent du feu en zigzaguant, puis s'éteignent.
    for (let n = 0; n < 6; n++) {
      const p = (t / 3200 + n / 6) % 1 // de 0 (dans le feu) à 1 (éteinte)
      ctx.globalAlpha = 1 - p
      rect(largeur / 2 + Math.sin(n * 7 + p * 6) * cote * 0.45 - 1.5, sol - cote * (0.9 + p * 1.3), 3, 3, 1.5, '#ffcf7a')
    }
    ctx.globalAlpha = 1
    const content = jeu.flash.length > 0 // une ligne vient d'être complétée : ils sautent de joie
    const taille = cote * 1.4
    avatars.forEach((avatar, i) => {
      const x = largeur * (i === 0 ? 0.2 : 0.8)
      const pieds = sol - (content ? cote * 0.25 : 0)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.beginPath()
      ctx.ellipse(x, sol, cote * 0.55, cote * 0.1, 0, 0, Math.PI * 2) // ombre au sol
      ctx.fill()
      // Chacun est tourné vers le feu, et se balance doucement.
      const angle = (i === 0 ? 0.35 : -0.35) + (ANIME ? balancement(t, i * 2) * 0.6 : 0)
      dessinerAvatar(ctx, avatar, x, pieds, taille, content, angle)
      ctx.fillStyle = '#c9b8a8'
      ctx.font = '11px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(String(avatar.nom).slice(0, 14), x, pieds - taille * 1.1 - 4)
    })

    // 2. Le plateau en bois (avec sa tranche) et la grille
    rect(0, hautScene(), largeur, basPlateau() - hautScene() + 10, 14, '#5c3b27')
    rect(0, hautScene(), largeur, basPlateau() - hautScene(), 14, '#8a5a3c')
    partie.grille.forEach((couleur, i) => {
      const x = MARGE + (i % N) * cote
      const y = hautGrille() + Math.floor(i / N) * ch()
      if (jeu.flash.includes(i)) bloc(x, y, cote, '#fff6e0')
      else if (couleur) bloc(x, y, cote, COULEURS[couleur])
      else rect(x + 1, y + 1, cote - 2, ch() - 2, cote / 7, COULEURS[0]) // creux vide
    })

    // 3. L'ombre de la forme déplacée, là où elle se poserait
    const formeGlissee = glisse && partie.main[glisse.index]
    if (formeGlissee) {
      const { cx, cy } = caseVisee(formeGlissee)
      if (peutPoser(partie.grille, formeGlissee, cx, cy)) {
        ctx.globalAlpha = 0.4
        dessinerForme(formeGlissee, MARGE + cx * cote, hautGrille() + cy * ch(), cote)
        ctx.globalAlpha = 1
      }
    }

    // 4. Les formes en attente, chacune centrée dans son tiers de largeur
    const petit = cote * ECHELLE_MAIN
    partie.main.forEach((forme, i) => {
      if (!forme || i === glisse?.index) return
      const x = (largeur / 3) * (i + 0.5) - (forme.largeur * petit) / 2
      const y = hautMain() + (cote * 2.4 - forme.hauteur * petit * APLATI) / 2
      dessinerForme(forme, x, y, petit)
    })

    // 5. La forme sous le doigt
    if (formeGlissee) {
      const { ox, oy } = origineGlisse(formeGlissee)
      ctx.globalAlpha = 0.9
      dessinerForme(formeGlissee, ox, oy, cote)
      ctx.globalAlpha = 1
    }

    // 6. Partie finie : voile sombre sur le plateau et flèche « on recommence »
    if (jeu.bloquee) {
      rect(0, hautScene(), largeur, basPlateau() - hautScene() + 10, 14, 'rgba(36, 27, 23, 0.8)')
      ctx.fillStyle = '#f3e6d6'
      ctx.font = `${cote * 2}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('↻', largeur / 2, (hautScene() + basPlateau()) / 2)
    }
  }

  // Au démarrage : on règle la taille du dessin sur la largeur disponible.
  useEffect(() => {
    const canvas = canvasRef.current!
    jeu.largeur = canvas.clientWidth
    jeu.cote = (jeu.largeur - 2 * MARGE) / N
    const hauteur = hauteurTotale()
    // Sur un écran de téléphone, 1 point = 2 ou 3 pixels réels : on dessine en haute définition.
    const densite = window.devicePixelRatio || 1
    canvas.width = jeu.largeur * densite
    canvas.height = hauteur * densite
    canvas.style.height = `${hauteur}px`
    canvas.getContext('2d')!.scale(densite, densite)
    dessiner()
    if (!ANIME) return
    // Le décor est vivant : on redessine le jeu à chaque image affichée.
    let image = requestAnimationFrame(function boucle() {
      dessiner()
      image = requestAnimationFrame(boucle)
    })
    return () => cancelAnimationFrame(image) // arrêt quand on quitte le jeu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Position du doigt par rapport au coin haut gauche du dessin. */
  function position(e: PointerEvent<HTMLCanvasElement>) {
    const cadre = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - cadre.left, y: e.clientY - cadre.top }
  }

  function debutGlisse(e: PointerEvent<HTMLCanvasElement>) {
    const { x, y } = position(e)
    if (jeu.bloquee || y < hautMain()) return
    const index = Math.floor(x / (jeu.largeur / 3))
    if (!jeu.partie.main[index]) return
    try {
      // Le dessin continue de recevoir les mouvements même si le doigt (ou la souris) en sort.
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Pas grave : sur un écran tactile, c'est déjà le comportement par défaut.
    }
    jeu.glisse = { index, x, y }
    dessiner()
  }

  function mouvement(e: PointerEvent<HTMLCanvasElement>) {
    if (!jeu.glisse) return
    jeu.glisse = { ...jeu.glisse, ...position(e) }
    dessiner()
  }

  function finGlisse() {
    const glisse = jeu.glisse
    const forme = glisse && jeu.partie.main[glisse.index]
    if (!glisse || !forme) return
    const { cx, cy } = caseVisee(forme)
    jeu.glisse = null
    const resultat = jouerCoup(jeu.partie, glisse.index, cx, cy)
    if (resultat) {
      jeu.partie = resultat.partie
      setScore(resultat.partie.score)
      if (resultat.partie.score > record) onRecord(resultat.partie.score)
      son(resultat.effacees.length > 0 ? 'ligne' : 'pose')

      if (resultat.effacees.length > 0) {
        jeu.flash = resultat.effacees
        setTimeout(() => {
          jeu.flash = []
          dessiner()
        }, 350)
      }

      // Plus aucun coup possible : la partie redémarre toute seule, sans pénalité.
      if (estBloquee(jeu.partie)) {
        jeu.bloquee = true
        setTimeout(() => {
          jeu.partie = nouvellePartie()
          jeu.bloquee = false
          setScore(0)
          dessiner()
        }, 1500)
      }
    }
    dessiner()
  }

  return (
    <div className="mini-jeu">
      <p className="discret">
        ⭐ {score} · 🏅 {Math.max(record, score)}
      </p>
      <canvas
        ref={canvasRef}
        aria-label="Mini-jeu : fais glisser les formes du bas sur le plateau pour compléter des lignes"
        onPointerDown={debutGlisse}
        onPointerMove={mouvement}
        onPointerUp={finGlisse}
        onPointerCancel={finGlisse}
      />
    </div>
  )
}
