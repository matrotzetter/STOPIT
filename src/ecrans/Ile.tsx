// Écran « Île » : la carte, les ressources, et la construction sur les cases dégagées.
import { useState } from 'react'
import type { Ecran } from '../App'
import { CATALOGUE, NIVEAU_MAX, PALIERS_JOURS } from '../config'
import { JOUR_MS, tempsCumuleMs } from '../logique/calculs'
import {
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
import { CarteIle } from './CarteIle'

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
