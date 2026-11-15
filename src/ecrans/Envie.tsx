// Mode « Envie » : on choisit une activité, un minuteur de 5 minutes tourne,
// puis on dit si l'envie est passée.
import { useEffect, useState } from 'react'
import type { Ecran } from '../App'
import { CRISTAUX_PAR_ENVIE, DECLENCHEURS, DUREE_ENVIE_MS, EXPIRATION_S, INSPIRATION_S } from '../config'
import type { Envie as EnvieNotee, Etat } from '../logique/types'
import { avatarsDe } from '../avatar'
import { son } from '../sons'
import { useMaintenant } from '../useMaintenant'
import MiniJeu from './MiniJeu'
import Rechute from './Rechute'

interface Props {
  etat: Etat
  maj: (etat: Etat) => void
  aller: (ecran: Ecran) => void
}

/** Les moments de l'écran. La question finale s'affiche quand le minuteur atteint zéro. */
type Phase = 'choix' | 'minuteur' | 'victoire' | 'rechute'

export default function Envie({ etat, maj, aller }: Props) {
  const [phase, setPhase] = useState<Phase>('choix')
  const [mode, setMode] = useState<EnvieNotee['mode']>('jouer')
  const [intensite, setIntensite] = useState<number>()
  const [declencheur, setDeclencheur] = useState<string>()
  /** Heure de départ du minuteur. */
  const [debut, setDebut] = useState(0)
  // Une de tes raisons, tirée au hasard une seule fois à l'ouverture de l'écran.
  const [raison] = useState(() => etat.profil.raisons[Math.floor(Math.random() * etat.profil.raisons.length)])
  // Rafraîchi 4 fois par seconde pour que la respiration change de sens au bon moment.
  const maintenant = useMaintenant(250)

  // Pendant le minuteur, on demande au téléphone de ne pas verrouiller l'écran
  // (sinon l'iPhone s'éteint au bout de 30 secondes sans contact).
  useEffect(() => {
    if (phase !== 'minuteur') return
    let verrou: WakeLockSentinel | undefined
    let termine = false
    navigator.wakeLock
      ?.request('screen')
      .then((v) => {
        // Si on a déjà quitté le minuteur entre-temps, on rend le verrou tout de suite.
        if (termine) v.release()
        else verrou = v
      })
      .catch(() => {}) // refusé ou non disponible : tant pis, le minuteur reste juste
    // shortcut: le verrou n'est pas redemandé si on quitte puis revient dans l'app pendant le minuteur.
    return () => {
      termine = true
      verrou?.release()
    }
  }, [phase])

  /** Ajoute l'envie à l'historique d'un état donné. */
  function avecEnvie(base: Etat, surmontee: boolean): Etat {
    const envie: EnvieNotee = { date: Date.now(), surmontee, mode, intensite, declencheur }
    return { ...base, envies: [...base.envies, envie] }
  }

  // ---------- « J'ai consommé » : on passe la main à l'écran Rechute ----------
  // L'envie non surmontée n'est enregistrée que si la rechute est validée :
  // si on annule, rien n'est écrit.
  if (phase === 'rechute') {
    return <Rechute etat={etat} maj={(avecRechute) => maj(avecEnvie(avecRechute, false))} aller={aller} />
  }

  function demarrer(choix: EnvieNotee['mode']) {
    setMode(choix)
    setDebut(Date.now())
    setPhase('minuteur')
  }

  // ---------- 1. Choix de l'activité ----------
  if (phase === 'choix') {
    return (
      <main>
        <h1>Une envie arrive</h1>
        <p className="discret">Elle va passer. Occupons les 5 prochaines minutes.</p>

        <button onClick={() => demarrer('jouer')}>Jouer</button>
        <button className="secondaire espace" onClick={() => demarrer('respirer')}>
          Respirer
        </button>

        <fieldset>
          <legend>Intensité (facultatif)</legend>
          <div className="puces">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                className={intensite === n ? 'puce choisie' : 'puce'}
                aria-pressed={intensite === n}
                onClick={() => setIntensite(intensite === n ? undefined : n)}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Déclencheur (facultatif)</legend>
          <div className="puces">
            {DECLENCHEURS.map((d) => (
              <button
                key={d}
                className={declencheur === d ? 'puce choisie' : 'puce'}
                aria-pressed={declencheur === d}
                onClick={() => setDeclencheur(declencheur === d ? undefined : d)}
              >
                {d}
              </button>
            ))}
          </div>
        </fieldset>

        <button className="secondaire" onClick={() => aller('accueil')}>
          Annuler
        </button>
      </main>
    )
  }

  // ---------- 4. Victoire ----------
  if (phase === 'victoire') {
    const total = etat.envies.filter((e) => e.surmontee).length
    return (
      <main className="centre">
        <p className="victoire" aria-hidden="true">
          💎
        </p>
        <h1>Envie surmontée !</h1>
        <p>+{CRISTAUX_PAR_ENVIE} cristaux</p>
        <p className="discret">
          {total} {total > 1 ? 'envies surmontées' : 'envie surmontée'} au total.
        </p>
        <button onClick={() => aller('accueil')}>Retour à l'accueil</button>
      </main>
    )
  }

  // Le minuteur est calculé à partir de l'heure de départ : il reste juste
  // même si le téléphone se met en veille.
  // « maintenant » peut avoir un quart de seconde de retard sur « debut » : on évite un temps négatif.
  const ecouleMs = Math.max(0, maintenant - debut)
  const restantMs = DUREE_ENVIE_MS - ecouleMs

  // ---------- 3. Question finale ----------
  if (restantMs <= 0) {
    return (
      <main>
        <h1>L'envie est passée ?</h1>
        <button
          onClick={() => {
            maj(avecEnvie(etat, true))
            son('victoire')
            setPhase('victoire')
          }}
        >
          Oui
        </button>
        <button className="secondaire espace" onClick={() => demarrer(mode)}>
          Pas encore (5 minutes de plus)
        </button>
        <button className="secondaire" onClick={() => setPhase('rechute')}>
          J'ai consommé
        </button>
      </main>
    )
  }

  const secondesRestantes = Math.ceil(restantMs / 1000)
  const minutes = Math.floor(secondesRestantes / 60)
  const secondes = String(secondesRestantes % 60).padStart(2, '0')

  // ---------- 2a. Minuteur + mini-jeu ----------
  if (mode === 'jouer') {
    return (
      <main className="centre">
        <p className="discret" role="timer" aria-label="Temps restant">
          {minutes}:{secondes} · « {raison} »
        </p>
        {/* Le score ne sert qu'au record personnel : il ne rapporte ni énergie ni cristaux. */}
        <MiniJeu avatars={avatarsDe(etat)} record={etat.recordPuzzle ?? 0} onRecord={(score) => maj({ ...etat, recordPuzzle: score })} />
        <button className="secondaire" onClick={() => aller('accueil')}>
          Quitter
        </button>
      </main>
    )
  }

  // ---------- 2b. Minuteur + respiration guidée ----------

  // Où en est-on dans le cycle inspiration + expiration ?
  const dansLeCycle = (ecouleMs / 1000) % (INSPIRATION_S + EXPIRATION_S)
  const inspire = dansLeCycle < INSPIRATION_S

  return (
    <main className="centre">
      <p className="grand" role="timer" aria-label="Temps restant">
        {minutes}:{secondes}
      </p>

      {/* Le cercle grossit à l'inspiration et rétrécit à l'expiration.
          C'est le navigateur qui anime le changement de taille (transition CSS). */}
      <div className="zone-respiration">
        <div
          className="cercle-respiration"
          style={{
            transform: `scale(${inspire ? 1 : 0.45})`,
            transitionDuration: `${inspire ? INSPIRATION_S : EXPIRATION_S}s`,
          }}
        />
        <p className="consigne">{inspire ? 'Inspire' : 'Expire'}</p>
      </div>

      <p className="discret">« {raison} »</p>

      <button className="secondaire" onClick={() => aller('accueil')}>
        Quitter
      </button>
    </main>
  )
}
