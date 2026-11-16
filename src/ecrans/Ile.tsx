// Écran « Île » : la carte, les ressources, et la construction sur les cases dégagées.
import { useEffect, useRef, useState } from 'react'
import type { Ecran } from '../App'
import { ANIME, HAUTEUR_AVATAR, avatarsDe, dessinerAvatar } from '../avatar'
import { CATALOGUE, NIVEAU_MAX, PALIERS_JOURS } from '../config'
import { JOUR_MS, tempsCumuleMs } from '../logique/calculs'
import {
  TAILLE,
  ZONE_DE_CASE,
  ameliorer,
  casesDegagees,
  construire,
  coutAmelioration,
  energie,
  estAmeliorable,
  modele,
  refusAmelioration,
  refusConstruction,
  soldeCristaux,
} from '../logique/ile'
import type { Etat } from '../logique/types'
import { BATIMENTS, CIELS, COULEURS_MOTIFS, FEU, NUAGE, dessinerMotif, periode } from '../pixels'
import { useMaintenant } from '../useMaintenant'

/** Couleur du sol de chaque zone, de la plage (zone 1) au sommet (zone 6). */
const COULEURS_ZONES = ['#d9c58a', '#a9c46c', '#7fb069', '#5a9a5f', '#8d9a8a', '#c9d3da']

// L'île est dessinée en « pixel art isométrique » : on la regarde de biais et d'en
// haut. Chaque case est un losange posé sur un bloc de terre, d'autant plus haut
// que sa zone est proche du sommet. Le dessin est fait en tout petit (160 pixels
// de large) puis agrandi sans lissage : toutes les mesures sont en gros pixels.
/** Largeur et hauteur du losange d'une case. */
const L = 20
const H = 10
/** Hauteur gagnée à chaque zone, et épaisseur du socle de l'île. */
const MARCHE = 2
const SOCLE = 3
/** Largeur du dessin, et position verticale de la case du fond. */
const LARGEUR = TAILLE * L
const HAUT = 4 + 5 * MARCHE
/** Haut de la plage, sous l'île, et hauteur totale du dessin. */
const PLAGE = HAUT + TAILLE * H + SOCLE + 2
const HAUTEUR = PLAGE + HAUTEUR_AVATAR + 3

/** Les cases, du fond vers l'avant : celles de devant sont dessinées en dernier et cachent les autres. */
const ORDRE = ZONE_DE_CASE.map((_, i) => i).sort(
  (a, b) => (a % TAILLE) + Math.floor(a / TAILLE) - ((b % TAILLE) + Math.floor(b / TAILLE)),
)

/** Où se trouve la case n° i : x = son milieu, y = le haut de son losange. */
function positionCase(i: number) {
  const colonne = i % TAILLE
  const ligne = Math.floor(i / TAILLE)
  return {
    x: LARGEUR / 2 + ((colonne - ligne) * L) / 2,
    y: HAUT + ((colonne + ligne) * H) / 2 - ZONE_DE_CASE[i] * MARCHE,
  }
}


/** Position des étoiles, des vagues et des lucioles. */
const ETOILES = [
  [8, 34], [40, 8], [58, 20], [12, 52], [34, 30], [120, 6], [140, 22], [152, 10], [104, 12], [150, 96], [10, 92], [28, 104],
]
const VAGUES = [
  [6, 72], [20, 84], [4, 60], [128, 88], [142, 76], [116, 95], [44, 95],
]
const LUCIOLES = [
  [50, 60], [78, 46], [96, 70], [66, 80], [112, 52], [84, 30],
]

/**
 * Dessine toute l'île dans le canvas.
 * t = le temps en millisecondes, pour les animations ; heure = l'heure qu'il est (0 à 23), pour le ciel.
 */
function dessinerIle(
  ctx: CanvasRenderingContext2D,
  etat: Etat,
  degagees: boolean[],
  selection: number | null | undefined,
  t: number,
  heure: number,
) {
  const moment = periode(heure)
  const ciel = CIELS[moment]
  const couleurCiel = (y: number) => ciel[Math.min(ciel.length - 1, Math.floor((y / PLAGE) * ciel.length))]
  const rect = (x: number, y: number, l: number, h: number, couleur: string) => {
    ctx.fillStyle = couleur
    ctx.fillRect(Math.round(x), Math.round(y), l, h)
  }

  // Le ciel et la mer, par bandes de couleur
  for (let y = 0; y < PLAGE; y++) rect(0, y, LARGEUR, 1, couleurCiel(y))
  // Les étoiles ne sortent que quand il fait sombre.
  if (moment === 'nuit' || moment === 'soir') {
    ETOILES.forEach(([x, y], n) => Math.sin(t / 700 + n * 2) > -0.4 && rect(x, y, 1, 1, '#ffffff'))
  }
  // Le soleil ou la lune : un disque. Bas sur l'horizon à l'aube et le soir, haut en plein jour.
  const astre = { nuit: 16, aube: 34, jour: 14, soir: 36 }[moment]
  for (let dy = -6; dy <= 6; dy++) {
    const demi = Math.round(Math.sqrt(36 - dy * dy))
    rect(22 - demi, astre + dy, demi * 2, 1, moment === 'nuit' ? '#fff3c9' : moment === 'jour' ? '#ffe27a' : '#ffb35c')
  }
  if (moment === 'nuit') {
    // La lune est un croissant : le disque est mordu par un disque de la couleur du ciel.
    for (let dy = -5; dy <= 5; dy++) {
      const demi = Math.round(Math.sqrt(25 - dy * dy))
      rect(26 - demi, 14 + dy, demi * 2, 1, couleurCiel(14 + dy))
    }
  }
  VAGUES.forEach(([x, y], n) => {
    const glisse = Math.round(Math.sin(t / 900 + n) * 2)
    rect(x + glisse, y, 4, 1, 'rgba(255, 255, 255, 0.35)')
    rect(x + glisse + 4, y + 1, 3, 1, 'rgba(255, 255, 255, 0.35)')
  })

  // Les cases, du fond vers l'avant
  for (const i of ORDRE) {
    const zone = ZONE_DE_CASE[i]
    const { x, y } = positionCase(i)
    const profondeur = zone * MARCHE + SOCLE
    // Les deux flancs de terre : des colonnes d'un pixel, qui suivent le bord du losange.
    for (let n = 0; n < L / 2; n++) {
      const haut = y + H / 2 + 1 + Math.floor(n / 2)
      rect(x - L / 2 + n, haut, 1, profondeur, '#8a6b4a') // flanc gauche
      rect(x + L / 2 - 1 - n, haut, 1, profondeur, '#6a5038') // flanc droit
    }
    // Le dessus : un losange, ligne par ligne (4, 8, 12, 16, 20 pixels puis l'inverse).
    const couleur = degagees[i] ? COULEURS_ZONES[zone] : ['#b8c2cc', '#aeb9c4', '#c2cbd4'][i % 3]
    for (let dy = 0; dy < H; dy++) {
      const largeur = 4 * (dy < H / 2 ? dy + 1 : H - dy)
      rect(x - largeur / 2, y + dy, largeur, 1, couleur)
      // Le bord avant du losange est un peu plus sombre : il marque l'arête.
      if (dy >= H / 2) {
        rect(x - largeur / 2, y + dy, 2, 1, 'rgba(0, 0, 0, 0.18)')
        rect(x + largeur / 2 - 2, y + dy, 2, 1, 'rgba(0, 0, 0, 0.18)')
      }
    }
    if (selection === i) {
      // Case sélectionnée : son contour en blanc.
      for (let dy = 0; dy < H; dy++) {
        const largeur = 4 * (dy < H / 2 ? dy + 1 : H - dy)
        rect(x - largeur / 2, y + dy, 2, 1, '#ffffff')
        rect(x + largeur / 2 - 2, y + dy, 2, 1, '#ffffff')
      }
    }
    if (!degagees[i]) {
      // Brume : un petit nuage posé sur la case, qui monte et descend lentement.
      dessinerMotif(ctx, NUAGE, x - 6, y + 1 + Math.round(Math.sin(t / 1500 + i)), COULEURS_MOTIFS)
      continue
    }
    // Deux brins sombres pour donner du grain au sol
    rect(x - 4 + ((i * 5) % 8), y + 4 + (i % 3), 1, 1, 'rgba(0, 0, 0, 0.18)')
    rect(x + 3 - ((i * 3) % 7), y + 3 + ((i * 2) % 4), 1, 1, 'rgba(255, 255, 255, 0.2)')
    const batiment = etat.batiments.find((b) => b.case === i)
    if (batiment) {
      // Le bâtiment est debout sur la case, centré, les pieds un peu en avant du milieu.
      const motif = batiment.type === 'feu' ? FEU[Math.floor(t / 180) % 2] : BATIMENTS[batiment.type]
      if (!motif) continue // type inconnu (fichier importé d'une autre version) : on ne dessine rien
      const gauche = x - Math.floor(motif[0].length / 2)
      const haut = y + H / 2 + 2 - motif.length
      rect(gauche, y + H / 2 + 2, motif[0].length, 1, 'rgba(0, 0, 0, 0.25)') // ombre au sol
      dessinerMotif(ctx, motif, gauche, haut, COULEURS_MOTIFS)
      // Niveaux 2 et 3 : une ou deux petites étoiles dorées au-dessus.
      for (let n = 1; n < batiment.niveau; n++) rect(x - batiment.niveau * 2 + n * 4 - 1, haut - 4, 2, 2, '#ffd166')
    }
  }

  LUCIOLES.forEach(([x, y], n) => {
    if (moment === 'jour') return // les lucioles ne brillent pas en plein jour
    if (Math.sin(t / 800 + n * 3) < -0.3) return // elle s'éteint par moments
    rect(x + Math.sin(t / 1100 + n) * 4, y + Math.cos(t / 1300 + n * 2) * 3, 1, 1, '#ffe08a')
  })

  // La plage : les avatars aux deux bouts, et un trophée par récompense encaissée
  rect(0, PLAGE, LARGEUR, HAUTEUR - PLAGE, '#e8d9a8')
  rect(0, PLAGE, LARGEUR, 1, '#f6efd2')
  for (let n = 0; n < 24; n++) rect((n * 37) % LARGEUR, PLAGE + 3 + ((n * 11) % 18), 1, 1, '#d6c48c') // grains de sable
  const monuments = etat.recompenses.filter((r) => r.encaisseeLe)
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  // 8 trophées, puis « +N » s'il y en a davantage.
  monuments.slice(0, 8).forEach((_, n) => ctx.fillText('🏆', 36 + n * 11, HAUTEUR - 4))
  if (monuments.length > 8) {
    ctx.fillStyle = '#3a3320'
    ctx.fillText(`+${monuments.length - 8}`, 36 + 8 * 11, HAUTEUR - 5)
  }
  avatarsDe(etat).forEach((avatar, n) => {
    // Chacun se promène lentement sur sa moitié de plage, et regarde dans le sens de la marche.
    const pas = t / 9000 + n * 2
    const x = Math.round((n === 0 ? 40 : LARGEUR - 40) + Math.sin(pas) * 28)
    rect(x - 6, HAUTEUR - 3, 12, 1, 'rgba(0, 0, 0, 0.2)')
    dessinerAvatar(ctx, avatar, x, HAUTEUR - 2, HAUTEUR_AVATAR, false, Math.cos(pas))
  })
}

interface PropsCarte {
  etat: Etat
  maintenant: number
  /** Case sélectionnée (entourée en blanc). */
  selection?: number | null
  /** Si fourni, les cases deviennent cliquables. */
  onCase?: (numCase: number) => void
}

/**
 * L'île. Le dessin est dans un <canvas> ; par-dessus, un SVG invisible porte une
 * zone par case : c'est lui qui reçoit le doigt, le clavier et le lecteur d'écran.
 * Utilisé ici et sur l'accueil.
 */
export function CarteIle({ etat, maintenant, selection, onCase }: PropsCarte) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const degagees = casesDegagees(etat, maintenant)

  // Redessine à chaque changement, et en continu pour les animations.
  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    let image = 0
    const boucle = () => {
      dessinerIle(ctx, etat, degagees, selection, ANIME ? performance.now() : 0, new Date(maintenant).getHours())
      // requestAnimationFrame : « rappelle-moi juste avant la prochaine image affichée ».
      if (ANIME) image = requestAnimationFrame(boucle)
    }
    boucle()
    return () => cancelAnimationFrame(image)
  })

  return (
    <span className="ile-cadre">
      <canvas ref={canvasRef} className="ile" width={LARGEUR} height={HAUTEUR} aria-hidden="true" />
      <svg className="ile" viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} role="group" aria-label="Carte de l'île">
        {ORDRE.map((i) => {
          const { x, y } = positionCase(i)
          const bas = y + H + ZONE_DE_CASE[i] * MARCHE + SOCLE
          const batiment = etat.batiments.find((b) => b.case === i)
          const m = batiment && modele(batiment.type)
          const description = !degagees[i] ? 'brume' : m ? m.nom : 'case libre'
          return (
            // Une zone transparente de la forme de la case (dessus + flancs).
            <polygon
              key={i}
              points={`${x},${y} ${x + L / 2},${y + H / 2} ${x + L / 2},${bas - H / 2} ${x},${bas} ${x - L / 2},${bas - H / 2} ${x - L / 2},${y + H / 2}`}
              fill="transparent"
              // Les 4 lignes suivantes rendent la case utilisable au clavier et au lecteur d'écran.
              role={onCase ? 'button' : undefined}
              tabIndex={onCase ? 0 : undefined}
              aria-label={`Ligne ${Math.floor(i / TAILLE) + 1}, colonne ${(i % TAILLE) + 1} : ${description}`}
              onKeyDown={onCase && ((e) => e.key === 'Enter' && onCase(i))}
              onClick={onCase && (() => onCase(i))}
            />
          )
        })}
      </svg>
    </span>
  )
}

interface Props {
  etat: Etat
  maj: (etat: Etat) => void
  aller: (ecran: Ecran) => void
}

export default function Ile({ etat, maj, aller }: Props) {
  const maintenant = useMaintenant()
  const [selection, setSelection] = useState<number | null>(null)

  const joursCumules = tempsCumuleMs(etat, maintenant) / JOUR_MS
  const prochainPalier = PALIERS_JOURS.find((p) => p > joursCumules)
  /** Le dernier palier déjà atteint (0 avant le premier). */
  const palierAtteint = Math.max(0, ...PALIERS_JOURS.filter((p) => p <= joursCumules))
  const monuments = etat.recompenses.filter((r) => r.encaisseeLe)

  // Informations sur la case sélectionnée.
  const degagee = selection !== null && casesDegagees(etat, maintenant)[selection]
  const batiment = etat.batiments.find((b) => b.case === selection)
  const modeleBatiment = batiment && modele(batiment.type)

  return (
    <main>
      <h1>L'île</h1>
      <p>
        ⚡ {Math.floor(energie(etat, maintenant))} énergie · 💎 {soldeCristaux(etat, maintenant)} cristaux
      </p>
      <p className="discret">
        {prochainPalier
          ? `Prochaine zone dans ${Math.ceil(prochainPalier - joursCumules)} j (à ${prochainPalier} jours cumulés).`
          : 'Toutes les zones sont ouvertes.'}{' '}
        L'île avance avec ton temps sans nicotine, même app fermée.
      </p>
      {prochainPalier && (
        // Avancement entre le palier déjà atteint et le prochain.
        <progress
          value={joursCumules - palierAtteint}
          max={prochainPalier - palierAtteint}
          aria-label="Progression vers la prochaine zone"
        />
      )}

      <CarteIle etat={etat} maintenant={maintenant} selection={selection} onCase={setSelection} />

      {monuments.length > 0 && (
        <p className="discret">🏆 Monuments : {monuments.map((r) => r.nom).join(', ')}</p>
      )}

      {/* ---------- Panneau de la case sélectionnée ---------- */}
      {selection === null ? (
        <p className="discret">Touche une case dégagée pour construire.</p>
      ) : !degagee ? (
        <section className="carte">
          <p>🌫️ Cette case est encore dans la brume (zone {ZONE_DE_CASE[selection] + 1}).</p>
        </section>
      ) : batiment && modeleBatiment ? (
        <section className="carte">
          <p className="valeur">
            {modeleBatiment.emoji} {modeleBatiment.nom}
            {estAmeliorable(modeleBatiment) && ` · niveau ${batiment.niveau}/${NIVEAU_MAX}`}
          </p>
          {estAmeliorable(modeleBatiment) &&
            batiment.niveau < NIVEAU_MAX &&
            (() => {
              const cout = coutAmelioration(modeleBatiment, batiment.niveau)
              const refus = refusAmelioration(etat, selection, maintenant)
              return (
                <>
                  <button disabled={!!refus} onClick={() => maj(ameliorer(etat, selection, Date.now()))}>
                    Améliorer (⚡ {cout.energie} · 💎 {cout.cristaux})
                  </button>
                  {refus && <p className="discret">{refus}</p>}
                </>
              )
            })()}
        </section>
      ) : (
        <section className="carte">
          <p>Construire sur cette case (zone {ZONE_DE_CASE[selection] + 1}) :</p>
          {CATALOGUE.map((m) => {
            const refus = refusConstruction(etat, selection, m.id, maintenant)
            return (
              <button
                key={m.id}
                className="secondaire choix-batiment"
                disabled={!!refus}
                onClick={() => maj(construire(etat, selection, m.id, Date.now()))}
              >
                <span>
                  {m.emoji} {m.nom}
                </span>
                <span>
                  {m.energie > 0 && `⚡ ${m.energie}`}
                  {m.cristaux > 0 && `💎 ${m.cristaux}`}
                  {refus && <small> · {refus}</small>}
                </span>
              </button>
            )
          })}
        </section>
      )}

      <button className="secondaire" onClick={() => aller('entrainement')}>
        S'entraîner au mini-jeu (sans gain)
      </button>
      <button onClick={() => aller('accueil')}>Retour</button>
    </main>
  )
}
