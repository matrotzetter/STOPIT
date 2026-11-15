// Écran « Île » : la carte, les ressources, et la construction sur les cases dégagées.
import { useState } from 'react'
import type { Ecran } from '../App'
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

/** Couleur du sol de chaque zone, de la plage (zone 1) au sommet (zone 6). */
const COULEURS_ZONES = ['#d9c58a', '#a9c46c', '#7fb069', '#5a9a5f', '#8d9a8a', '#c9d3da']

/** Côté d'une case, dans les unités du dessin. */
const C = 10

interface PropsCarte {
  etat: Etat
  maintenant: number
  /** Case sélectionnée (entourée en blanc). */
  selection?: number | null
  /** Si fourni, les cases deviennent cliquables. */
  onCase?: (numCase: number) => void
}

/** Le dessin de l'île (SVG). Utilisé ici en grand, et en petit sur l'accueil. */
export function CarteIle({ etat, maintenant, selection, onCase }: PropsCarte) {
  const degagees = casesDegagees(etat, maintenant)
  const monuments = etat.recompenses.filter((r) => r.encaisseeLe)

  return (
    <svg className="ile" viewBox={`0 0 ${TAILLE * C} ${TAILLE * C + 12}`} role="group" aria-label="Carte de l'île">
      {ZONE_DE_CASE.map((zone, i) => {
        const x = (i % TAILLE) * C
        const y = Math.floor(i / TAILLE) * C
        const batiment = etat.batiments.find((b) => b.case === i)
        const m = batiment && modele(batiment.type)
        const description = !degagees[i] ? 'brume' : m ? m.nom : 'case libre'
        return (
          <g
            key={i}
            // Les 4 lignes suivantes rendent la case utilisable au clavier et au lecteur d'écran.
            role={onCase ? 'button' : undefined}
            tabIndex={onCase ? 0 : undefined}
            aria-label={`Ligne ${Math.floor(i / TAILLE) + 1}, colonne ${(i % TAILLE) + 1} : ${description}`}
            onKeyDown={onCase && ((e) => e.key === 'Enter' && onCase(i))}
            onClick={onCase && (() => onCase(i))}
          >
            <rect x={x} y={y} width={C} height={C} fill={COULEURS_ZONES[zone]} stroke="#0f1419" strokeWidth={0.3} />
            {degagees[i] ? (
              m && (
                // La taille de l'emoji grandit avec le niveau du bâtiment.
                <text x={x + C / 2} y={y + C / 2} fontSize={4 + batiment.niveau * 1.3} textAnchor="middle" dominantBaseline="central">
                  {m.emoji}
                </text>
              )
            ) : (
              // Brume : un voile gris, d'opacité légèrement différente d'une case à l'autre.
              <rect x={x} y={y} width={C} height={C} fill="#b8c2cc" opacity={0.8 + ((i * 7) % 4) * 0.05} />
            )}
            {selection === i && (
              <rect x={x + 0.5} y={y + 0.5} width={C - 1} height={C - 1} fill="none" stroke="#fff" strokeWidth={1} />
            )}
          </g>
        )
      })}

      {/* La plage des monuments : un trophée par récompense encaissée. */}
      <rect x={0} y={TAILLE * C} width={TAILLE * C} height={12} fill="#e8d9a8" />
      {/* La plage a 9 places : 8 trophées, puis « +N » s'il y en a davantage. */}
      {monuments.slice(0, 8).map((r, i) => (
        <text key={r.id} x={6 + i * 9} y={TAILLE * C + 6} fontSize={7} textAnchor="middle" dominantBaseline="central">
          🏆<title>{r.nom}</title>
        </text>
      ))}
      {monuments.length > 8 && (
        <text x={6 + 8 * 9} y={TAILLE * C + 6} fontSize={4} fill="#3a3320" textAnchor="middle" dominantBaseline="central">
          +{monuments.length - 8}
        </text>
      )}
    </svg>
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
