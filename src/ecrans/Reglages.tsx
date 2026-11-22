// Écran « Réglages » : données, sons, export/import, réinitialisation, aide.
import type { ChangeEvent } from 'react'
import type { Ecran } from '../App'
import type { Etat } from '../logique/types'
import { exporter, lireEtat } from '../stockage'

interface Props {
  etat: Etat
  maj: (etat: Etat) => void
  aller: (ecran: Ecran) => void
  /** Efface tout et revient au premier lancement. */
  reinitialiser: () => void
}

export default function Reglages({ etat, maj, aller, reinitialiser }: Props) {
  const sonsActifs = etat.sons !== false

  /** Lit le fichier choisi et remplace toutes les données, après confirmation. */
  async function importer(evenement: ChangeEvent<HTMLInputElement>) {
    const champ = evenement.target
    const fichier = champ.files?.[0]
    if (!fichier) return
    const importe = lireEtat(await fichier.text())
    champ.value = '' // permet de rechoisir le même fichier ensuite
    if (!importe) {
      alert("Ce fichier n'est pas un export de Cagnotte valide. Rien n'a été modifié.")
      return
    }
    if (confirm('Remplacer toutes les données actuelles par celles du fichier ?')) {
      maj(importe)
      aller('accueil')
    }
  }

  return (
    <main>
      <h1>Réglages</h1>

      <section className="carte">
        <h2>Mes données</h2>
        <button className="secondaire" onClick={() => aller('profil')}>
          Modifier mes données
        </button>
        <button className="secondaire" onClick={() => aller('recompenses')}>
          Modifier mes récompenses
        </button>
        <button className="secondaire" onClick={() => aller('avatars')}>
          Mes avatars
        </button>
      </section>

      <section className="carte">
        <h2>Sons</h2>
        <label className="interrupteur">
          <input type="checkbox" checked={sonsActifs} onChange={(e) => maj({ ...etat, sons: e.target.checked })} />
          Sons activés
        </label>
      </section>

      <section className="carte">
        <h2>Sauvegarde</h2>
        <p className="discret">
          Tes données n'existent que sur cet appareil. Exporte-les de temps en temps pour ne pas les perdre.
        </p>
        <button className="secondaire" onClick={() => exporter(etat)}>
          Exporter (fichier JSON)
        </button>
        {/* Le bouton d'import est une étiquette qui ouvre le sélecteur de fichier caché. */}
        <label className="bouton secondaire">
          Importer un fichier JSON
          <input type="file" accept="application/json,.json" hidden onChange={importer} />
        </label>
      </section>

      <section className="carte">
        <h2>Tout réinitialiser</h2>
        <p className="discret">Efface toutes les données de cet appareil, île comprise. Impossible à annuler.</p>
        <button
          className="secondaire danger"
          onClick={() => {
            if (confirm('Effacer définitivement toutes tes données ? Pense à exporter avant.')) reinitialiser()
          }}
        >
          Tout effacer
        </button>
      </section>

      <section className="carte">
        <h2>Aide</h2>
        <p>Pour un accompagnement par des professionnels :</p>
        <p>
          <a href="https://www.stop-tabac.ch" target="_blank" rel="noreferrer">
            stop-tabac.ch
          </a>
        </p>
        <p>
          Ligne stop-tabac : <a href="tel:0848000181">0848 000 181</a>
        </p>
      </section>

      <button className="secondaire" onClick={() => aller('accueil')}>Retour</button>
    </main>
  )
}
