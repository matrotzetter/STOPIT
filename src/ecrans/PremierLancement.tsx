// Premier lancement : un formulaire qui recueille le produit, la consommation,
// la date d'arrêt, les raisons et les premières récompenses.
import { useState, type FormEvent } from 'react'
import { PALIERS_JOURS } from '../config'
import { NOM_UNITE } from '../format'
import type { Etat, Produit } from '../logique/types'

const PRODUITS: { valeur: Produit; nom: string }[] = [
  { valeur: 'cigarettes', nom: 'Cigarettes' },
  { valeur: 'vape', nom: 'Puff / vape' },
  { valeur: 'snus', nom: 'Snus / sachets' },
  { valeur: 'autre', nom: 'Autre' },
]

/** Une ligne du formulaire de récompenses (les champs sont du texte tant qu'on tape). */
interface LigneRecompense {
  nom: string
  prix: string
  palier: string
}

/** Une date au format attendu par le champ date-heure : « 2026-11-15T14:30 ». */
function pourChamp(date: number): string {
  const decalage = new Date(date).getTimezoneOffset() * 60000
  return new Date(date - decalage).toISOString().slice(0, 16)
}

interface Props {
  onTermine: (etat: Etat) => void
  /** Si fourni, le formulaire sert à modifier ces données au lieu d'en créer. */
  existant?: Etat
  onAnnuler?: () => void
}

export default function PremierLancement({ onTermine, existant, onAnnuler }: Props) {
  const ancien = existant?.profil
  // Chaque useState garde en mémoire la valeur d'un champ du formulaire.
  const [produit, setProduit] = useState<Produit>(ancien?.produit ?? 'cigarettes')
  const [conso, setConso] = useState(ancien ? String(ancien.consoParJour) : '')
  const [parPaquet, setParPaquet] = useState(false)
  const [prix, setPrix] = useState(ancien ? String(ancien.prixParUnite) : '')
  const [unitesParPaquet, setUnitesParPaquet] = useState('20')
  const [arretMaintenant, setArretMaintenant] = useState(!ancien)
  const [dateArret, setDateArret] = useState(() => pourChamp(ancien?.dateArret ?? Date.now()))
  const [raisons, setRaisons] = useState(ancien?.raisons ?? ['', '', ''])
  const [recompenses, setRecompenses] = useState<LigneRecompense[]>(
    // Trois lignes au départ, avec les paliers 3, 7 et 14 jours.
    PALIERS_JOURS.slice(0, 3).map((p) => ({ nom: '', prix: '', palier: String(p) })),
  )

  /** Modifie un champ d'une ligne de récompense. */
  function changerRecompense(index: number, champ: keyof LigneRecompense, valeur: string) {
    setRecompenses(recompenses.map((r, i) => (i === index ? { ...r, [champ]: valeur } : r)))
  }

  /** Appelé quand on appuie sur « Commencer » (le navigateur a déjà vérifié les champs obligatoires). */
  function valider(evenement: FormEvent) {
    evenement.preventDefault() // empêche le rechargement de la page
    const prixSaisi = Number(prix)
    const profil = {
      produit,
      consoParJour: Number(conso),
      prixParUnite: parPaquet ? prixSaisi / Number(unitesParPaquet) : prixSaisi,
      dateArret: arretMaintenant ? Date.now() : new Date(dateArret).getTime(),
      raisons: raisons.map((r) => r.trim()),
    }
    // Modification : on ne change que le profil, tout le reste est conservé.
    if (existant) return onTermine({ ...existant, profil })
    onTermine({
      version: 1,
      profil,
      recompenses: recompenses.map((r) => ({
        id: crypto.randomUUID(),
        nom: r.nom.trim(),
        prix: Number(r.prix),
        palierJours: Number(r.palier),
      })),
      rechutes: [],
      envies: [],
      checkins: [],
      batiments: [],
    })
  }

  const unite = NOM_UNITE[produit]

  return (
    <main>
      <h1>{existant ? 'Modifier mes données' : 'Bienvenue'}</h1>
      <p className="discret">
        {existant
          ? 'La cagnotte, la série et l’île seront recalculées avec ces nouvelles valeurs.'
          : 'Quelques questions pour préparer ta cagnotte. Tout reste sur cet appareil.'}
      </p>

      <form onSubmit={valider}>
        <fieldset>
          <legend>Ton produit</legend>
          <div className="choix">
            {PRODUITS.map((p) => (
              <label key={p.valeur} className={produit === p.valeur ? 'choisi' : ''}>
                <input
                  type="radio"
                  name="produit"
                  checked={produit === p.valeur}
                  onChange={() => setProduit(p.valeur)}
                />
                {p.nom}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Ta consommation</legend>
          <label>
            Nombre de {unite} par jour, en moyenne
            <input
              type="number"
              inputMode="decimal"
              min="0.1"
              step="any"
              required
              value={conso}
              onChange={(e) => setConso(e.target.value)}
            />
          </label>
          <div className="choix">
            <label className={!parPaquet ? 'choisi' : ''}>
              <input type="radio" name="modePrix" checked={!parPaquet} onChange={() => setParPaquet(false)} />
              Prix par unité
            </label>
            <label className={parPaquet ? 'choisi' : ''}>
              <input type="radio" name="modePrix" checked={parPaquet} onChange={() => setParPaquet(true)} />
              Prix du paquet
            </label>
          </div>
          <label>
            {parPaquet ? 'Prix du paquet (CHF)' : 'Prix par unité (CHF)'}
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="any"
              required
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
            />
          </label>
          {parPaquet && (
            <label>
              Nombre de {unite} par paquet
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                required
                value={unitesParPaquet}
                onChange={(e) => setUnitesParPaquet(e.target.value)}
              />
            </label>
          )}
        </fieldset>

        <fieldset>
          <legend>Ta date d'arrêt</legend>
          <div className="choix">
            <label className={arretMaintenant ? 'choisi' : ''}>
              <input type="radio" name="arret" checked={arretMaintenant} onChange={() => setArretMaintenant(true)} />
              Maintenant
            </label>
            <label className={!arretMaintenant ? 'choisi' : ''}>
              <input type="radio" name="arret" checked={!arretMaintenant} onChange={() => setArretMaintenant(false)} />
              Autre date
            </label>
          </div>
          {!arretMaintenant && (
            <label>
              Date et heure (passée ou future)
              <input
                type="datetime-local"
                required
                value={dateArret}
                onChange={(e) => setDateArret(e.target.value)}
              />
            </label>
          )}
        </fieldset>

        <fieldset>
          <legend>Tes 3 raisons d'arrêter</legend>
          {raisons.map((raison, i) => (
            <input
              key={i}
              type="text"
              required
              aria-label={`Raison ${i + 1}`}
              placeholder={`Raison ${i + 1}`}
              value={raison}
              onChange={(e) => setRaisons(raisons.map((r, j) => (j === i ? e.target.value : r)))}
            />
          ))}
        </fieldset>

        {/* Les récompenses ne sont demandées qu'au premier lancement ; ensuite, elles ont leur propre écran. */}
        <fieldset hidden={!!existant} disabled={!!existant}>
          <legend>Tes récompenses (3 au minimum)</legend>
          <p className="discret">
            Une récompense se débloque quand tu as tenu le nombre de jours ET que la cagnotte couvre son prix.
          </p>
          {recompenses.map((r, i) => (
            <div key={i} className="carte">
              <label>
                Récompense {i + 1}
                <input
                  type="text"
                  required
                  placeholder="Ex. un bon restaurant"
                  value={r.nom}
                  onChange={(e) => changerRecompense(i, 'nom', e.target.value)}
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
                    value={r.prix}
                    onChange={(e) => changerRecompense(i, 'prix', e.target.value)}
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
                    value={r.palier}
                    onChange={(e) => changerRecompense(i, 'palier', e.target.value)}
                  />
                </label>
              </div>
              {recompenses.length > 3 && (
                <button
                  type="button"
                  className="secondaire"
                  onClick={() => setRecompenses(recompenses.filter((_, j) => j !== i))}
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
          {/* Suggestions de paliers proposées par le champ « Après (jours) ». */}
          <datalist id="paliers">
            {PALIERS_JOURS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <button
            type="button"
            className="secondaire"
            onClick={() =>
              setRecompenses([
                ...recompenses,
                // Palier suggéré : le suivant dans la liste 3, 7, 14, 30, 60, 90.
                { nom: '', prix: '', palier: String(PALIERS_JOURS[recompenses.length] ?? 90) },
              ])
            }
          >
            + Ajouter une récompense
          </button>
        </fieldset>

        <button type="submit">{existant ? 'Enregistrer' : 'Commencer'}</button>
        {onAnnuler && (
          <button type="button" className="secondaire" onClick={onAnnuler}>
            Annuler
          </button>
        )}
      </form>
    </main>
  )
}
