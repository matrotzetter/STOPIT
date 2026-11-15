// Composant racine : garde les données en mémoire et choisit l'écran affiché.
import { useState } from 'react'
import Accueil from './ecrans/Accueil'
import Envie from './ecrans/Envie'
import PremierLancement from './ecrans/PremierLancement'
import type { Etat } from './logique/types'
import { charger, sauvegarder } from './stockage'

/** Les écrans de l'app (d'autres arriveront aux étapes suivantes). */
export type Ecran = 'accueil' | 'envie' | 'rechute'

export default function App() {
  // « etat » contient toutes les données. null = premier lancement.
  const [etat, setEtat] = useState<Etat | null>(charger)
  const [ecran, setEcran] = useState<Ecran>('accueil')

  /** Toute modification passe par ici : on enregistre, puis on rafraîchit l'affichage. */
  function maj(nouvelEtat: Etat) {
    sauvegarder(nouvelEtat)
    setEtat(nouvelEtat)
  }

  if (!etat) return <PremierLancement onTermine={maj} />
  if (ecran === 'accueil') return <Accueil etat={etat} maj={maj} aller={setEcran} />

  if (ecran === 'envie') return <Envie etat={etat} maj={maj} aller={setEcran} />

  // Écran pas encore construit (étape c).
  return (
    <main>
      <h1>Rechute</h1>
      <p className="discret">Cet écran arrive à la prochaine étape.</p>
      <button onClick={() => setEcran('accueil')}>Retour</button>
    </main>
  )
}
