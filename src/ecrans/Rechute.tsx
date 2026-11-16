// Écran « Rechute » : on note ce qui s'est passé, puis on affiche ce qui reste acquis.
import { useState, type FormEvent } from 'react'
import type { Ecran } from '../App'
import { DECLENCHEURS } from '../config'
import { NOM_UNITE, chf, duree } from '../format'
import { cagnotte, meilleureSerieMs, soldeCagnotte, tempsCumuleMs } from '../logique/calculs'
import type { Etat } from '../logique/types'

interface Props {
  etat: Etat
  maj: (etat: Etat) => void
  aller: (ecran: Ecran) => void
}

/** Les boutons « Déclencheur » (facultatif), aussi utilisés par l'écran Envie. Toucher le bouton choisi le désélectionne. */
export function ChoixDeclencheur({ valeur, onChange }: { valeur?: string; onChange: (d?: string) => void }) {
  return (
    <fieldset>
      <legend>Déclencheur (facultatif)</legend>
      <div className="puces">
        {DECLENCHEURS.map((d) => (
          <button
            key={d}
            type="button"
            className={valeur === d ? 'puce choisie' : 'puce'}
            aria-pressed={valeur === d}
            onClick={() => onChange(valeur === d ? undefined : d)}
          >
            {d}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export default function Rechute({ etat, maj, aller }: Props) {
  const [unites, setUnites] = useState('1')
  const [declencheur, setDeclencheur] = useState<string>()
  const [note, setNote] = useState('')
  /** Coût de la rechute une fois enregistrée ; null tant qu'on est sur le formulaire. */
  const [coutRetire, setCoutRetire] = useState<number | null>(null)

  function valider(evenement: FormEvent) {
    evenement.preventDefault()
    const nombre = Number(unites)
    maj({
      ...etat,
      rechutes: [...etat.rechutes, { date: Date.now(), unites: nombre, declencheur, note: note.trim() || undefined }],
    })
    setCoutRetire(nombre * etat.profil.prixParUnite)
  }

  // ---------- Après l'enregistrement : ce qui est acquis ----------
  if (coutRetire !== null) {
    const maintenant = Date.now()
    const surmontees = etat.envies.filter((e) => e.surmontee).length
    const encaissees = etat.recompenses.filter((r) => r.encaisseeLe).length
    return (
      <main>
        <h1>C'est noté</h1>
        <p>
          Ta série repart de zéro et {chf(coutRetire)} sont retirés de la cagnotte. Tout le reste est conservé :
        </p>
        <section className="carte">
          <p>💰 Cagnotte : {chf(cagnotte(etat, maintenant))}</p>
          {soldeCagnotte(etat, maintenant) < 0 && (
            <p className="discret">{chf(-soldeCagnotte(etat, maintenant))} à rattraper avant qu'elle ne remonte.</p>
          )}
          <p>📅 Temps cumulé sans nicotine : {duree(tempsCumuleMs(etat, maintenant))}</p>
          <p>🏆 Meilleure série : {duree(meilleureSerieMs(etat, maintenant))}</p>
          <p>💪 Envies surmontées : {surmontees}</p>
          <p>🎁 Récompenses encaissées : {encaissees}</p>
        </section>
        <button onClick={() => aller('accueil')}>Repartir</button>
      </main>
    )
  }

  // ---------- Formulaire ----------
  return (
    <main>
      <h1>Noter une rechute</h1>
      <p className="discret">Ça arrive. On le note tel quel, et rien de ce que tu as construit n'est effacé.</p>

      <form onSubmit={valider}>
        <label>
          Nombre de {NOM_UNITE[etat.profil.produit]} consommées
          <input
            type="number"
            inputMode="decimal"
            min="0.1"
            step="any"
            required
            value={unites}
            onChange={(e) => setUnites(e.target.value)}
          />
        </label>

        <ChoixDeclencheur valeur={declencheur} onChange={setDeclencheur} />

        <label>
          Note (facultatif)
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <button type="submit">Enregistrer</button>
        <button type="button" className="secondaire" onClick={() => aller('accueil')}>
          Annuler
        </button>
      </form>
    </main>
  )
}
