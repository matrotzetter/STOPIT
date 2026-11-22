// Écran « Île » : la carte, les ressources, et la construction sur les cases dégagées.
import { useState } from 'react'
import type { Ecran } from '../App'
import { CATALOGUE, DUREE_CONCERT_MS, NIVEAU_MAX, PALIERS_JOURS } from '../config'
import { JOUR_MS, tempsCumuleMs } from '../logique/calculs'
import {
  EST_EAU,
  ZONE_DE_CASE,
  ameliorer,
  casesDegagees,
  construire,
  coutAmelioration,
  coutTotal,
  deconstruire,
  energie,
  estAmeliorable,
  modele,
  refusAmelioration,
  refusConstruction,
  soldeCristaux,
} from '../logique/ile'
import type { Etat } from '../logique/types'
import { son } from '../sons'
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
  /** true après un premier appui sur « Déconstruire » : on attend la confirmation. */
  const [confirmer, setConfirmer] = useState(false)

  /** Choisit une case (et annule une déconstruction en attente sur l'ancienne). */
  function choisirCase(numCase: number) {
    setSelection(numCase)
    setConfirmer(false)
  }

  function retirer(numCase: number) {
    maj(deconstruire(etat, numCase, Date.now()))
    setConfirmer(false)
  }
  /** La raison d'arrêter lue dans la bouteille à la mer ; null = bouteille fermée. */
  const [message, setMessage] = useState<string | null>(null)
  /** Heure de fin du concert du club de jazz (0 = pas de concert). */
  const [concertJusqua, setConcertJusqua] = useState(0)

  /** Ouvre la bouteille : une raison au hasard, différente de celle déjà affichée quand c'est possible. */
  function ouvrirBouteille() {
    const raisons = etat.profil.raisons.map((r) => r.trim()).filter((r) => r !== '')
    const autres = raisons.length > 1 ? raisons.filter((r) => r !== message) : raisons
    setMessage(autres[Math.floor(Math.random() * autres.length)])
  }

  function lancerConcert() {
    son('jazz')
    setConcertJusqua(Date.now() + DUREE_CONCERT_MS)
    setTimeout(() => setConcertJusqua(0), DUREE_CONCERT_MS) // le bouton redevient utilisable à la fin
  }

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

      <CarteIle
        etat={etat}
        maintenant={maintenant}
        selection={selection}
        onCase={choisirCase}
        onBouteille={ouvrirBouteille}
        concertJusqua={concertJusqua}
      />

      {message !== null && (
        <section className="parchemin" aria-live="polite">
          <p className="parchemin-titre">Un message dans la bouteille :</p>
          <p className="parchemin-texte">« {message} »</p>
          <button className="secondaire" onClick={() => setMessage(null)}>
            Refermer
          </button>
        </section>
      )}

      {monuments.length > 0 && (
        <p className="discret">🏆 Monuments : {monuments.map((r) => r.nom).join(', ')}</p>
      )}

      {/* ---------- Panneau de la case sélectionnée ---------- */}
      {selection === null ? (
        <p className="discret">Touche une case dégagée pour construire, ou la bouteille sur l'îlot.</p>
      ) : !degagee ? (
        <section className="carte">
          <p>🌫️ Cette case est encore dans la brume (zone {ZONE_DE_CASE[selection] + 1}).</p>
        </section>
      ) : EST_EAU[selection] ? (
        <section className="carte">
          <p>💧 Une source : l'eau descend jusqu'au bord de l'île et tombe en cascade. On ne construit pas sur l'eau.</p>
        </section>
      ) : batiment && modeleBatiment ? (
        <section className="carte">
          <p className="valeur">
            {modeleBatiment.emoji} {modeleBatiment.nom}
            {estAmeliorable(modeleBatiment) && ` · niveau ${batiment.niveau}/${NIVEAU_MAX}`}
          </p>
          {batiment.type === 'club' && (
            <button disabled={concertJusqua > 0} onClick={lancerConcert}>
              🎷 Écouter le concert
            </button>
          )}
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
          {(() => {
            // Déconstruire rend tout ce que le bâtiment a coûté : on l'affiche avant de confirmer.
            const rendu = coutTotal(modeleBatiment, batiment.niveau)
            const gain = [rendu.energie > 0 && `⚡ ${rendu.energie}`, rendu.cristaux > 0 && `💎 ${rendu.cristaux}`]
              .filter(Boolean)
              .join(' · ')
            return confirmer ? (
              <>
                <p>
                  Retirer « {modeleBatiment.nom} » ? Tu récupères {gain}.
                </p>
                <button onClick={() => retirer(selection)}>Oui, déconstruire</button>
                <button className="secondaire" onClick={() => setConfirmer(false)}>
                  Non, garder
                </button>
              </>
            ) : (
              <button className="secondaire" onClick={() => setConfirmer(true)}>
                Déconstruire (récupère {gain})
              </button>
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
      <button className="secondaire" onClick={() => aller('accueil')}>Retour</button>
    </main>
  )
}
