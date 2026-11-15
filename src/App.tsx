// Composant racine : garde les données en mémoire et choisit l'écran affiché.
import { useState } from 'react'
import { avatarsDe } from './avatar'
import Accueil from './ecrans/Accueil'
import Avatars from './ecrans/Avatars'
import Envie from './ecrans/Envie'
import Ile from './ecrans/Ile'
import MiniJeu from './ecrans/MiniJeu'
import PremierLancement from './ecrans/PremierLancement'
import Rechute from './ecrans/Rechute'
import Recompenses from './ecrans/Recompenses'
import Reglages from './ecrans/Reglages'
import Stats from './ecrans/Stats'
import type { Etat } from './logique/types'
import { reglerSons } from './sons'
import { charger, effacer, sauvegarder } from './stockage'

/** Les écrans de l'app. */
export type Ecran =
  | 'accueil'
  | 'envie'
  | 'rechute'
  | 'recompenses'
  | 'ile'
  | 'entrainement'
  | 'stats'
  | 'reglages'
  | 'profil'
  | 'avatars'

export default function App() {
  // « etat » contient toutes les données. null = premier lancement.
  const [etat, setEtat] = useState<Etat | null>(charger)
  const [ecran, setEcran] = useState<Ecran>('accueil')

  // Le réglage des sons est transmis au module qui les joue.
  reglerSons(etat?.sons !== false)

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
  if (ecran === 'stats') return <Stats {...props} />
  if (ecran === 'avatars') return <Avatars {...props} />
  if (ecran === 'reglages') {
    return (
      <Reglages
        {...props}
        reinitialiser={() => {
          effacer()
          setEtat(null)
          setEcran('accueil')
        }}
      />
    )
  }
  if (ecran === 'profil') {
    // Le formulaire du premier lancement sert aussi à modifier ses données.
    return (
      <PremierLancement
        existant={etat}
        onTermine={(modifie) => {
          maj(modifie)
          setEcran('reglages')
        }}
        onAnnuler={() => setEcran('reglages')}
      />
    )
  }
  if (ecran === 'entrainement') {
    return (
      <main className="centre">
        <h1>Entraînement</h1>
        <p className="discret">Pour le plaisir : ici, jouer ne rapporte ni énergie ni cristaux.</p>
        <MiniJeu avatars={avatarsDe(etat)} record={etat.recordPuzzle ?? 0} onRecord={(score) => maj({ ...etat, recordPuzzle: score })} />
        <button className="secondaire" onClick={() => setEcran('ile')}>
          Retour
        </button>
      </main>
    )
  }
  return <Accueil {...props} />
}
