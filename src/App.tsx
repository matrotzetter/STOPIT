// Composant racine : garde les données en mémoire et choisit l'écran affiché.
import { useState } from 'react'
import Accueil from './ecrans/Accueil'
import Envie from './ecrans/Envie'
import Ile from './ecrans/Ile'
import PremierLancement from './ecrans/PremierLancement'
import Rechute from './ecrans/Rechute'
import Recompenses from './ecrans/Recompenses'
import type { Etat } from './logique/types'
import { charger, sauvegarder } from './stockage'

/** Les écrans de l'app (d'autres arriveront aux étapes suivantes). */
export type Ecran = 'accueil' | 'envie' | 'rechute' | 'recompenses' | 'ile'

export default function App() {
  // « etat » contient toutes les données. null = premier lancement.
  const [etat, setEtat] = useState<Etat | null>(charger)
  const [ecran, setEcran] = useState<Ecran>('accueil')

  /** Toute modification passe par ici : on enregistre, puis on rafraîchit l'affichage. */
  function maj(nouvelEtat: Etat) {
    if (!sauvegarder(nouvelEtat)) {
      alert(
        "Impossible d'enregistrer sur cet appareil (stockage plein ou bloqué). " +
          'Ce changement sera perdu à la fermeture de l’app.',
      )
    }
    setEtat(nouvelEtat)
  }

  if (!etat) return <PremierLancement onTermine={maj} />

  // Les mêmes informations sont transmises à tous les écrans.
  const props = { etat, maj, aller: setEcran }
  if (ecran === 'envie') return <Envie {...props} />
  if (ecran === 'rechute') return <Rechute {...props} />
  if (ecran === 'recompenses') return <Recompenses {...props} />
  if (ecran === 'ile') return <Ile {...props} />
  return <Accueil {...props} />
}
