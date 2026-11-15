// Le mini-jeu : on fait glisser des éclats de lumière sur la grille pour
// compléter des lignes et repousser la brume. Dessiné dans un <canvas>
// (une zone de dessin), pour rester fluide sur téléphone.
// Les règles sont dans logique/puzzle.ts ; ici il n'y a que le dessin et le doigt.
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { PUZZLE_TAILLE as N } from '../config'
import { estBloquee, jouerCoup, nouvellePartie, peutPoser, type Forme, type Partie } from '../logique/puzzle'

/** Couleurs des cases : la n° 0 est la brume (case vide), les autres sont les éclats de lumière. */
const COULEURS = ['#2a3441', '#4fd1a5', '#f2c14e', '#6fb3ff', '#ff9f7a']

/** Taille des formes en attente, par rapport aux cases de la grille. */
const ECHELLE_MAIN = 0.6

interface Props {
  /** Meilleur score enregistré. */
  record: number
  /** Appelé quand le score dépasse le record. */
  onRecord: (score: number) => void
}

/** Tout ce qui change pendant le jeu, gardé hors de React pour ne pas redessiner la page à chaque geste. */
interface Jeu {
  partie: Partie
  /** Forme en train d'être déplacée : son numéro dans la main et la position du doigt. */
  glisse: { index: number; x: number; y: number } | null
  /** Cases qui viennent d'être effacées (elles clignotent en blanc un instant). */
  flash: number[]
  bloquee: boolean
  /** Largeur du dessin et côté d'une case, en pixels. */
  largeur: number
  cote: number
}

export default function MiniJeu({ record, onRecord }: Props) {
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

  /** Haut de la zone des formes en attente. */
  const hautMain = () => jeu.largeur + 8

  /** Coin haut gauche de la forme déplacée : centrée sous le doigt, et soulevée pour rester visible. */
  function origineGlisse(forme: Forme) {
    const g = jeu.glisse!
    return { ox: g.x - (forme.largeur * jeu.cote) / 2, oy: g.y - forme.hauteur * jeu.cote - jeu.cote }
  }

  /** Case de la grille visée par la forme déplacée. */
  function caseVisee(forme: Forme) {
    const { ox, oy } = origineGlisse(forme)
    return { cx: Math.round(ox / jeu.cote), cy: Math.round(oy / jeu.cote) }
  }

  /** Redessine tout le jeu. */
  function dessiner() {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { partie, glisse, cote, largeur } = jeu
    ctx.clearRect(0, 0, largeur, hautMain() + cote * 3)

    /** Dessine une case arrondie. */
    const carre = (x: number, y: number, c: number, couleur: string) => {
      ctx.fillStyle = couleur
      ctx.beginPath()
      ctx.roundRect(x + 1, y + 1, c - 2, c - 2, c / 6)
      ctx.fill()
    }
    /** Dessine une forme entière à partir de son coin haut gauche. */
    const dessinerForme = (forme: Forme, x: number, y: number, c: number) => {
      for (const [dx, dy] of forme.cases) carre(x + dx * c, y + dy * c, c, COULEURS[forme.couleur])
    }

    // 1. La grille
    partie.grille.forEach((couleur, i) => {
      const blanc = jeu.flash.includes(i)
      carre((i % N) * cote, Math.floor(i / N) * cote, cote, blanc ? '#ffffff' : COULEURS[couleur])
    })

    // 2. L'ombre de la forme déplacée, là où elle se poserait
    const formeGlissee = glisse && partie.main[glisse.index]
    if (formeGlissee) {
      const { cx, cy } = caseVisee(formeGlissee)
      if (peutPoser(partie.grille, formeGlissee, cx, cy)) {
        ctx.globalAlpha = 0.35
        dessinerForme(formeGlissee, cx * cote, cy * cote, cote)
        ctx.globalAlpha = 1
      }
    }

    // 3. Les formes en attente, chacune centrée dans son tiers de largeur
    const petit = cote * ECHELLE_MAIN
    partie.main.forEach((forme, i) => {
      if (!forme || i === glisse?.index) return
      const x = (largeur / 3) * (i + 0.5) - (forme.largeur * petit) / 2
      const y = hautMain() + (cote * 3 - forme.hauteur * petit) / 2
      dessinerForme(forme, x, y, petit)
    })

    // 4. La forme sous le doigt
    if (formeGlissee) {
      const { ox, oy } = origineGlisse(formeGlissee)
      ctx.globalAlpha = 0.9
      dessinerForme(formeGlissee, ox, oy, cote)
      ctx.globalAlpha = 1
    }

    // 5. Partie finie : voile sombre et flèche « on recommence »
    if (jeu.bloquee) {
      ctx.fillStyle = 'rgba(15, 20, 25, 0.75)'
      ctx.fillRect(0, 0, largeur, largeur)
      ctx.fillStyle = '#e8edf2'
      ctx.font = `${cote * 2}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('↻', largeur / 2, largeur / 2)
    }
  }

  // Au démarrage : on règle la taille du dessin sur la largeur disponible.
  useEffect(() => {
    const canvas = canvasRef.current!
    jeu.largeur = canvas.clientWidth
    jeu.cote = jeu.largeur / N
    const hauteur = hautMain() + jeu.cote * 3
    // Sur un écran de téléphone, 1 point = 2 ou 3 pixels réels : on dessine en haute définition.
    const densite = window.devicePixelRatio || 1
    canvas.width = jeu.largeur * densite
    canvas.height = hauteur * densite
    canvas.style.height = `${hauteur}px`
    canvas.getContext('2d')!.scale(densite, densite)
    dessiner()
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

      if (resultat.effacees.length > 0) {
        jeu.flash = resultat.effacees
        setTimeout(() => {
          jeu.flash = []
          dessiner()
        }, 200)
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
        aria-label="Mini-jeu : fais glisser les formes du bas sur la grille pour compléter des lignes"
        onPointerDown={debutGlisse}
        onPointerMove={mouvement}
        onPointerUp={finGlisse}
        onPointerCancel={finGlisse}
      />
    </div>
  )
}
