// Écran « Île » : la carte, les ressources, et la construction sur les cases dégagées.
import { useState } from 'react'
import type { Ecran } from '../App'
import { avatarsDe } from '../avatar'
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
import { useMaintenant } from '../useMaintenant'
import { Apercu } from './Avatars'

/** Couleur du sol de chaque zone, de la plage (zone 1) au sommet (zone 6). */
const COULEURS_ZONES = ['#d9c58a', '#a9c46c', '#7fb069', '#5a9a5f', '#8d9a8a', '#c9d3da']

// L'île est dessinée en « 3D isométrique » : on la regarde de biais et d'en haut.
// Chaque case est un losange posé sur un bloc de terre, d'autant plus haut que
// sa zone est proche du sommet. Les mesures sont dans les unités du dessin.
/** Largeur et hauteur du losange d'une case. */
const L = 20
const H = 10
/** Hauteur gagnée à chaque zone, et épaisseur du socle de l'île. */
const MARCHE = 2.2
const SOCLE = 3
/** Largeur du dessin, et position verticale de la case du fond. */
const LARGEUR = TAILLE * L
const HAUT = 4 + 5 * MARCHE
/** Haut de la plage, sous l'île. */
const PLAGE = HAUT + TAILLE * H + SOCLE + 2

/** Position des étoiles dans le ciel, au-dessus et autour de l'île. */
const ETOILES = [
  [8, 34], [40, 8], [58, 20], [12, 52], [34, 30], [120, 6], [140, 22], [152, 10], [104, 12], [150, 96], [10, 92], [28, 104],
]

/** Position des vagues (sur la mer, de part et d'autre de l'île) et des lucioles (au-dessus de l'île). */
const VAGUES = [
  [6, 72], [20, 84], [4, 60], [128, 88], [142, 76], [116, 96], [44, 96],
]
const LUCIOLES = [
  [50, 60], [78, 46], [96, 70], [66, 80], [112, 52], [84, 30],
]

/** Les cases, du fond vers l'avant : celles de devant sont dessinées en dernier et cachent les autres. */
const ORDRE = ZONE_DE_CASE.map((_, i) => i).sort(
  (a, b) => (a % TAILLE) + Math.floor(a / TAILLE) - ((b % TAILLE) + Math.floor(b / TAILLE)),
)

interface PropsCarte {
  etat: Etat
  maintenant: number
  /** Case sélectionnée (entourée en blanc). */
  selection?: number | null
  /** Si fourni, les cases deviennent cliquables. */
  onCase?: (numCase: number) => void
}

/** Le dessin de l'île (SVG), avec les deux avatars sur la plage. Utilisé ici et sur l'accueil. */
export function CarteIle({ etat, maintenant, selection, onCase }: PropsCarte) {
  const degagees = casesDegagees(etat, maintenant)
  const monuments = etat.recompenses.filter((r) => r.encaisseeLe)

  return (
    <span className="ile-cadre">
      <svg className="ile" viewBox={`0 0 ${LARGEUR} ${PLAGE + 22}`} role="group" aria-label="Carte de l'île">
        {/* Le décor : ciel de nuit qui descend vers la mer, lune et étoiles. */}
        <defs>
          <linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a2052" />
            <stop offset="0.45" stopColor="#274a73" />
            <stop offset="1" stopColor="#1f6f8f" />
          </linearGradient>
        </defs>
        <rect width={LARGEUR} height={PLAGE + 22} fill="url(#ciel)" />
        <circle cx={22} cy={16} r={7} fill="#fff3c9" />
        <circle cx={25} cy={14} r={6} fill="#2a2256" />
        {ETOILES.map(([ex, ey], n) => (
          <circle key={n} className="etoile" cx={ex} cy={ey} r={0.6} fill="#fff" style={{ animationDelay: `${n * 0.4}s` }} />
        ))}
        {ORDRE.map((i) => {
          const colonne = i % TAILLE
          const ligne = Math.floor(i / TAILLE)
          const zone = ZONE_DE_CASE[i]
          // (x, y) = le coin du fond du losange, relevé selon la hauteur de la zone.
          const x = LARGEUR / 2 + ((colonne - ligne) * L) / 2
          const y = HAUT + ((colonne + ligne) * H) / 2 - zone * MARCHE
          const bas = y + H / 2 + zone * MARCHE + SOCLE // niveau de la mer, sous les coins gauche et droit
          const dessus = `${x},${y} ${x + L / 2},${y + H / 2} ${x},${y + H} ${x - L / 2},${y + H / 2}`
          const batiment = etat.batiments.find((b) => b.case === i)
          const m = batiment && modele(batiment.type)
          const description = !degagees[i] ? 'brume' : m ? m.nom : 'case libre'
          const taille = 7 + (batiment?.niveau ?? 0) * 1.5
          return (
            <g
              key={i}
              // Les 4 lignes suivantes rendent la case utilisable au clavier et au lecteur d'écran.
              role={onCase ? 'button' : undefined}
              tabIndex={onCase ? 0 : undefined}
              aria-label={`Ligne ${ligne + 1}, colonne ${colonne + 1} : ${description}`}
              onKeyDown={onCase && ((e) => e.key === 'Enter' && onCase(i))}
              onClick={onCase && (() => onCase(i))}
            >
              {/* Les deux flancs de terre visibles, puis le dessus. */}
              <polygon points={`${x - L / 2},${y + H / 2} ${x},${y + H} ${x},${bas + H / 2} ${x - L / 2},${bas}`} fill="#8a6b4a" />
              <polygon points={`${x + L / 2},${y + H / 2} ${x},${y + H} ${x},${bas + H / 2} ${x + L / 2},${bas}`} fill="#6a5038" />
              <polygon points={dessus} fill={COULEURS_ZONES[zone]} stroke="rgba(0,0,0,0.25)" strokeWidth={0.3} />
              {degagees[i] ? (
                m && (
                  <>
                    <ellipse cx={x} cy={y + H / 2 + 1} rx={taille * 0.4} ry={taille * 0.15} fill="rgba(0,0,0,0.25)" />
                    {/* Le bâtiment est debout sur la case ; il grandit avec son niveau. */}
                    <text x={x} y={y + H / 2 - taille * 0.3} fontSize={taille} textAnchor="middle" dominantBaseline="central">
                      {m.emoji}
                    </text>
                  </>
                )
              ) : (
                // Brume : un voile gris sur la case et un petit nuage posé dessus.
                <>
                  <polygon points={dessus} fill="#b8c2cc" opacity={0.8 + ((i * 7) % 4) * 0.05} />
                  <ellipse cx={x} cy={y + H / 2 - 1.5} rx={L * 0.32} ry={H * 0.35} fill="#fff" opacity={0.35} />
                </>
              )}
              {selection === i && <polygon points={dessus} fill="none" stroke="#fff" strokeWidth={1} />}
            </g>
          )
        })}

        {/* Des vagues claires sur la mer et des lucioles au-dessus de l'île. */}
        {VAGUES.map(([vx, vy], n) => (
          <path key={n} className="vague" d={`M${vx},${vy} q3,-1.5 6,0 t6,0`} style={{ animationDelay: `${n * 0.7}s` }} />
        ))}
        {LUCIOLES.map(([lx, ly], n) => (
          <circle key={n} className="luciole" cx={lx} cy={ly} r={0.9} style={{ animationDelay: `${n * 1.3}s` }} />
        ))}

        {/* La plage : les avatars aux deux bouts, et un trophée par récompense encaissée. */}
        <rect x={0} y={PLAGE} width={LARGEUR} height={22} fill="#e8d9a8" />
        <rect x={0} y={PLAGE} width={LARGEUR} height={1.5} fill="#f6efd2" />
        {/* 8 trophées, puis « +N » s'il y en a davantage. */}
        {monuments.slice(0, 8).map((r, i) => (
          <text key={r.id} x={36 + i * 11} y={PLAGE + 12} fontSize={9} textAnchor="middle" dominantBaseline="central">
            🏆<title>{r.nom}</title>
          </text>
        ))}
        {monuments.length > 8 && (
          <text x={36 + 8 * 11} y={PLAGE + 12} fontSize={5} fill="#3a3320" textAnchor="middle" dominantBaseline="central">
            +{monuments.length - 8}
          </text>
        )}
      </svg>
      {avatarsDe(etat).map((avatar, i) => (
        <Apercu key={i} avatar={avatar} decalage={i * 2} className={`avatar-ile ${i === 0 ? 'gauche' : 'droite'}`} />
      ))}
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
