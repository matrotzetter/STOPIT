// Écran « Récompenses » : liste, ajout, modification, suppression, encaissement.
import { useState, type FormEvent } from 'react'
import type { Ecran } from '../App'
import { PALIERS_JOURS } from '../config'
import { chf, texteManque } from '../format'
import { JOUR_MS, cagnotte, etatRecompense, serieMs } from '../logique/calculs'
import type { Etat, Recompense } from '../logique/types'

interface Props {
  etat: Etat
  maj: (etat: Etat) => void
  aller: (ecran: Ecran) => void
}

/** Récompense en cours de saisie dans le formulaire (sans id = nouvelle récompense). */
interface Brouillon {
  id?: string
  nom: string
  prix: string
  palier: string
}

export default function Recompenses({ etat, maj, aller }: Props) {
  // null = le formulaire est fermé.
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null)
  const maintenant = Date.now()
  const argent = cagnotte(etat, maintenant)
  const serieJours = serieMs(etat, maintenant) / JOUR_MS

  const aVenir = etat.recompenses.filter((r) => !r.encaisseeLe).sort((a, b) => a.palierJours - b.palierJours)
  const encaissees = etat.recompenses.filter((r) => r.encaisseeLe)

  /** Enregistre le formulaire : modifie la récompense existante ou en ajoute une. */
  function valider(evenement: FormEvent) {
    evenement.preventDefault()
    if (!brouillon) return
    const saisie = { nom: brouillon.nom.trim(), prix: Number(brouillon.prix), palierJours: Number(brouillon.palier) }
    const recompenses = brouillon.id
      ? etat.recompenses.map((r) => (r.id === brouillon.id ? { ...r, ...saisie } : r))
      : [...etat.recompenses, { id: crypto.randomUUID(), ...saisie }]
    maj({ ...etat, recompenses })
    setBrouillon(null)
  }

  function supprimer(r: Recompense) {
    if (!confirm(`Supprimer « ${r.nom} » ?`)) return
    maj({ ...etat, recompenses: etat.recompenses.filter((x) => x.id !== r.id) })
  }

  /** Encaisser : on note la date. Le prix est alors retiré de la cagnotte par le calcul. */
  function encaisser(r: Recompense) {
    if (!confirm(`Encaisser « ${r.nom} » ? ${chf(r.prix)} seront retirés de la cagnotte.`)) return
    maj({ ...etat, recompenses: etat.recompenses.map((x) => (x.id === r.id ? { ...x, encaisseeLe: Date.now() } : x)) })
  }

  // ---------- Formulaire d'ajout ou de modification ----------
  if (brouillon) {
    return (
      <main>
        <h1>{brouillon.id ? 'Modifier la récompense' : 'Nouvelle récompense'}</h1>
        <form onSubmit={valider}>
          <label>
            Nom
            <input
              type="text"
              required
              value={brouillon.nom}
              onChange={(e) => setBrouillon({ ...brouillon, nom: e.target.value })}
            />
          </label>
          <div className="rangee">
            <label>
              Prix (CHF)
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                required
                value={brouillon.prix}
                onChange={(e) => setBrouillon({ ...brouillon, prix: e.target.value })}
              />
            </label>
            <label>
              Après (jours)
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                required
                list="paliers"
                value={brouillon.palier}
                onChange={(e) => setBrouillon({ ...brouillon, palier: e.target.value })}
              />
            </label>
          </div>
          <datalist id="paliers">
            {PALIERS_JOURS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <button type="submit">Enregistrer</button>
          <button type="button" className="secondaire" onClick={() => setBrouillon(null)}>
            Annuler
          </button>
        </form>
      </main>
    )
  }

  // ---------- Liste ----------
  return (
    <main>
      <h1>Récompenses</h1>
      <p className="discret">
        Cagnotte : {chf(argent)} · Série : {Math.floor(serieJours)} j
      </p>

      {aVenir.map((r) => {
        const debloquee = etatRecompense(r, etat, maintenant) === 'debloquee'
        return (
          <section key={r.id} className="carte">
            <p className="valeur">
              {debloquee ? '🎁' : '🔒'} {r.nom}
            </p>
            <p className="discret">
              {chf(r.prix)} · après {r.palierJours} j ·{' '}
              {debloquee ? 'Débloquée !' : texteManque(r.palierJours - serieJours, r.prix - argent)}
            </p>
            {debloquee && <button onClick={() => encaisser(r)}>Encaisser</button>}
            <div className="rangee espace-haut">
              <button
                className="secondaire"
                onClick={() => setBrouillon({ id: r.id, nom: r.nom, prix: String(r.prix), palier: String(r.palierJours) })}
              >
                Modifier
              </button>
              <button className="secondaire" onClick={() => supprimer(r)}>
                Supprimer
              </button>
            </div>
          </section>
        )
      })}

      <button className="secondaire" onClick={() => setBrouillon({ nom: '', prix: '', palier: '' })}>
        + Ajouter une récompense
      </button>

      {encaissees.length > 0 && (
        <>
          <h2>Encaissées</h2>
          {encaissees.map((r) => (
            <section key={r.id} className="carte">
              <p className="valeur">✅ {r.nom}</p>
              <p className="discret">
                {chf(r.prix)} · encaissée le {new Date(r.encaisseeLe!).toLocaleDateString('fr-CH')}
              </p>
            </section>
          ))}
        </>
      )}

      <button onClick={() => aller('accueil')}>Retour</button>
    </main>
  )
}
