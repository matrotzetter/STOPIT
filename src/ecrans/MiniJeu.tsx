// Le mini-jeu : on fait glisser des blocs sur un plateau en bois pour compléter
// des lignes, au coin du feu, sous les étoiles. Dessiné en « pixel art » dans un <canvas>.
// Les règles sont dans logique/puzzle.ts ; ici il n'y a que le dessin et le doigt.
//
// Tout est mesuré en « gros pixels » : le dessin est fait en tout petit (environ
// 115 pixels de large), puis agrandi par le navigateur sans lissage. C'est ce
// qui donne l'aspect pixelisé.
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { ANIME, HAUTEUR_AVATAR, animer, dessinerAvatar } from '../avatar'
import { PUZZLE_TAILLE as N } from '../config'
import type { Avatar } from '../logique/types'
import { COULEURS_MOTIFS, FEU, FLECHE, dessinerMotif } from '../pixels'
import { son } from '../sons'
import { estBloquee, jouerCoup, nouvellePartie, peutPoser, type Forme, type Partie } from '../logique/puzzle'

/** Couleurs des cases : la n° 0 est un creux vide du plateau en bois, les autres sont les blocs. */
const COULEURS = ['#5a3d2b', '#9cc5a1', '#f2c14e', '#e8a0a8', '#f4a26b']

/** Combien de pixels d'écran pour un gros pixel du dessin (environ). */
const GROS_PIXEL = 3

/** Hauteur du décor (guirlande, feu, avatars) au-dessus du plateau, en gros pixels. */
const HAUT_SCENE = HAUTEUR_AVATAR + 9

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
  /** Mesures du dessin, en gros pixels : largeur totale, largeur et hauteur d'une case, épaisseur d'un bloc, marge à gauche. */
  largeur: number
  cote: number
  ch: number
  epaisseur: number
  marge: number
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
    ch: 0,
    epaisseur: 0,
    marge: 0,
  }))
  const [score, setScore] = useState(0)

  /** Haut de la première rangée de cases (on laisse la place de l'épaisseur d'un bloc). */
  const hautGrille = () => HAUT_SCENE + 3 + jeu.epaisseur
  /** Bas du plateau en bois. */
  const basPlateau = () => hautGrille() + N * jeu.ch + 3
  /** Haut de la zone des formes en attente. */
  const hautMain = () => basPlateau() + 6
  /** Hauteur de la zone des formes en attente. */
  const hauteurMain = () => Math.round(jeu.cote * 2.6)
  /** Hauteur totale du dessin. */
  const hauteurTotale = () => hautMain() + hauteurMain()

  /** Coin haut gauche de la forme déplacée : centrée sous le doigt, et soulevée pour rester visible. */
  function origineGlisse(forme: Forme) {
    const g = jeu.glisse!
    return { ox: g.x - (forme.largeur * jeu.cote) / 2, oy: g.y - forme.hauteur * jeu.ch - jeu.cote }
  }

  /** Case de la grille visée par la forme déplacée. */
  function caseVisee(forme: Forme) {
    const { ox, oy } = origineGlisse(forme)
    return { cx: Math.round((ox - jeu.marge) / jeu.cote), cy: Math.round((oy - hautGrille()) / jeu.ch) }
  }

  /** Redessine tout le jeu. */
  function dessiner() {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { partie, glisse, cote, ch, epaisseur, largeur, marge } = jeu
    /** L'heure, en millisecondes : elle fait bouger le feu, les braises et la guirlande. */
    const t = ANIME ? performance.now() : 0
    const milieu = Math.floor(largeur / 2)

    /** Peint un rectangle, toujours calé sur les gros pixels. */
    const rect = (x: number, y: number, l: number, h: number, couleur: string) => {
      ctx.fillStyle = couleur
      ctx.fillRect(Math.round(x), Math.round(y), l, h)
    }
    /** Dessine un bloc en volume posé sur la case (x, y) : c = largeur, h = hauteur, e = épaisseur. */
    const bloc = (x: number, y: number, c: number, h: number, e: number, couleur: string) => {
      rect(x, y - e, c - 1, h - 1 + e, couleur) // le bloc entier
      rect(x, y + h - 1 - e, c - 1, e, 'rgba(0, 0, 0, 0.3)') // sa face avant, plus sombre
      rect(x, y - e, c - 1, 1, 'rgba(255, 255, 255, 0.35)') // reflet en haut
      rect(x, y - e, 1, h - 1, 'rgba(255, 255, 255, 0.18)') // reflet à gauche
    }
    /** Dessine une forme entière à partir de son coin haut gauche. c = largeur d'une case. */
    const dessinerForme = (forme: Forme, x: number, y: number, c: number) => {
      const h = Math.round(c * 0.78)
      const e = Math.max(1, Math.round(c * 0.24))
      // Du fond vers l'avant : les blocs de devant cachent ceux de derrière.
      for (const [dx, dy] of [...forme.cases].sort((a, b) => a[1] - b[1])) {
        bloc(Math.round(x) + dx * c, Math.round(y) + dy * h, c, h, e, COULEURS[forme.couleur])
      }
    }

    // 1. Le décor : la nuit étoilée, la lueur du feu, une guirlande, les deux avatars
    rect(0, 0, largeur, hauteurTotale(), '#121233')
    for (let n = 0; n < 14; n++) {
      // Des étoiles toujours aux mêmes endroits, qui scintillent doucement.
      if (Math.sin(t / 900 + n * 2) > -0.5) rect((n * 37 + 11) % largeur, 3 + ((n * 23) % (HAUT_SCENE - 8)), 1, 1, '#d8d4f0')
    }
    const sol = HAUT_SCENE - 2
    for (let n = 0; n < 4; n++) {
      // La lueur : des rectangles de plus en plus petits, empilés autour du feu.
      const demi = 44 - n * 9
      rect(milieu - demi, sol - (28 - n * 6), demi * 2, 28 - n * 6, 'rgba(255, 170, 80, 0.07)')
    }
    for (let x = 0; x < largeur; x++) {
      const p = x / largeur
      const y = 1 + Math.round(16 * p * (1 - p)) // le fil pend au milieu
      rect(x, y, 1, 1, '#4a3a30')
      // Une ampoule tous les 12 pixels ; chacune s'éteint à moitié de temps en temps.
      if (x % 12 === 6) rect(x - 1, y + 1, 2, 2, Math.sin(t / 600 + x) > -0.6 ? '#ffd98a' : '#a8843f')
    }
    dessinerMotif(ctx, FEU[Math.floor(t / 180) % 2], milieu - 4, sol - 10, COULEURS_MOTIFS)
    // Braises : des étincelles qui montent du feu en zigzaguant, puis s'éteignent.
    for (let n = 0; n < 5; n++) {
      const p = (t / 3200 + n / 5) % 1 // de 0 (dans le feu) à 1 (éteinte)
      if (p < 0.8) rect(milieu + Math.sin(n * 7 + p * 6) * 6, sol - 11 - p * 14, 1, 1, '#ffcf7a')
    }
    const content = jeu.flash.length > 0 // une ligne vient d'être complétée : ils sautent de joie
    avatars.forEach((avatar, i) => {
      const x = Math.round(largeur * (i === 0 ? 0.2 : 0.8))
      rect(x - 6, sol, 12, 1, 'rgba(0, 0, 0, 0.35)') // ombre au sol
      // Chacun regarde vers le feu.
      dessinerAvatar(ctx, avatar, x, sol - (content ? 3 : 0), HAUTEUR_AVATAR, content, i === 0 ? 1 : -1)
    })

    // 2. Le plateau en bois (avec sa tranche) et la grille
    rect(0, HAUT_SCENE, largeur, basPlateau() - HAUT_SCENE + 3, '#5c3b27')
    rect(0, HAUT_SCENE, largeur, basPlateau() - HAUT_SCENE, '#8a5a3c')
    rect(0, HAUT_SCENE, largeur, 1, '#a36f4c') // arête claire en haut
    partie.grille.forEach((couleur, i) => {
      const x = marge + (i % N) * cote
      const y = hautGrille() + Math.floor(i / N) * ch
      if (jeu.flash.includes(i)) bloc(x, y, cote, ch, epaisseur, '#fff6e0')
      else if (couleur) bloc(x, y, cote, ch, epaisseur, COULEURS[couleur])
      else {
        rect(x, y, cote - 1, ch - 1, COULEURS[0]) // creux vide…
        rect(x, y, cote - 1, 1, 'rgba(0, 0, 0, 0.25)') // …avec son ombre en haut
      }
    })

    // 3. L'ombre de la forme déplacée, là où elle se poserait
    const formeGlissee = glisse && partie.main[glisse.index]
    if (formeGlissee) {
      const { cx, cy } = caseVisee(formeGlissee)
      if (peutPoser(partie.grille, formeGlissee, cx, cy)) {
        ctx.globalAlpha = 0.4
        dessinerForme(formeGlissee, marge + cx * cote, hautGrille() + cy * ch, cote)
        ctx.globalAlpha = 1
      }
    }

    // 4. Les formes en attente, chacune centrée dans son tiers de largeur
    const petit = Math.max(4, Math.round(cote * 0.5))
    partie.main.forEach((forme, i) => {
      if (!forme || i === glisse?.index) return
      const x = (largeur / 3) * (i + 0.5) - (forme.largeur * petit) / 2
      const y = hautMain() + (hauteurMain() - forme.hauteur * Math.round(petit * 0.78)) / 2
      dessinerForme(forme, x, y, petit)
    })

    // 5. La forme sous le doigt
    if (formeGlissee) {
      const { ox, oy } = origineGlisse(formeGlissee)
      dessinerForme(formeGlissee, ox, oy, cote)
    }

    // 6. Partie finie : voile sombre sur le plateau et flèche « on recommence »
    if (jeu.bloquee) {
      rect(0, HAUT_SCENE, largeur, basPlateau() - HAUT_SCENE + 3, 'rgba(14, 16, 38, 0.8)')
      ctx.save()
      ctx.translate(milieu - 10, Math.round((HAUT_SCENE + basPlateau()) / 2) - 10)
      ctx.scale(3, 3) // la petite flèche est dessinée trois fois plus grosse
      dessinerMotif(ctx, FLECHE, 0, 0, COULEURS_MOTIFS)
      ctx.restore()
    }
  }

  // Au démarrage : on règle la taille du dessin sur la largeur disponible.
  useEffect(() => {
    const canvas = canvasRef.current!
    jeu.largeur = Math.round(canvas.clientWidth / GROS_PIXEL)
    jeu.cote = Math.floor((jeu.largeur - 6) / N)
    jeu.ch = Math.round(jeu.cote * 0.78)
    jeu.epaisseur = Math.max(2, Math.round(jeu.cote * 0.24))
    jeu.marge = Math.floor((jeu.largeur - N * jeu.cote) / 2)
    // Le dessin a très peu de pixels ; c'est la feuille de style qui l'agrandit sans le lisser.
    canvas.width = jeu.largeur
    canvas.height = hauteurTotale()
    // Le décor est vivant : on redessine le jeu régulièrement, jusqu'à ce qu'on le quitte.
    // (Chaque geste du doigt redessine aussi tout de suite : le jeu reste réactif.)
    return animer(dessiner)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Position du doigt dans le dessin, en gros pixels. */
  function position(e: PointerEvent<HTMLCanvasElement>) {
    const cadre = e.currentTarget.getBoundingClientRect()
    const echelle = cadre.width / jeu.largeur
    return { x: (e.clientX - cadre.left) / echelle, y: (e.clientY - cadre.top) / echelle }
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
