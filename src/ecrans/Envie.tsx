// Mode « Envie » : on choisit une activité, un minuteur de 5 minutes tourne,
// puis on dit si l'envie est passée.
import { useEffect, useState } from 'react'
import type { Ecran } from '../App'
import { CRISTAUX_PAR_ENVIE, DUREE_ENVIE_MS, EXPIRATION_S, INSPIRATION_S } from '../config'
import type { Envie as EnvieNotee, Etat } from '../logique/types'
import { avatarsDe } from '../avatar'
import { son } from '../sons'
import { useMaintenant } from '../useMaintenant'
import { Apercu } from './Avatars'
import MiniJeu from './MiniJeu'
import Rechute, { ChoixDeclencheur } from './Rechute'

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
    // Le téléphone rend le verrou dès qu'on quitte l'app : on le redemande à chaque retour.
    const demander = () => {
      if (document.visibilityState !== 'visible') return
      navigator.wakeLock
        ?.request('screen')
        .then((v) => {
          // Si on a déjà quitté le minuteur entre-temps, on rend le verrou tout de suite.
          if (termine) v.release()
          else verrou = v
        })
        .catch(() => {}) // refusé ou non disponible : tant pis, le minuteur reste juste
    }
    demander()
    document.addEventListener('visibilitychange', demander)
    return () => {
      termine = true
      document.removeEventListener('visibilitychange', demander)
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

        {/* Une de tes raisons d'arrêter, pour te rappeler pourquoi tu tiens. */}
        <section className="carte raison">
          <p className="discret">Tu as arrêté pour :</p>
          <p className="valeur">« {raison} »</p>
        </section>

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

        <ChoixDeclencheur valeur={declencheur} onChange={setDeclencheur} />

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
        {/* Tes deux avatars fêtent ça, de part et d'autre du cristal gagné. */}
        <div className="fete" aria-hidden="true">
          {avatarsDe(etat).map((avatar, i) => (
            <Apercu key={i} avatar={avatar} content decalage={i * 2} />
          ))}
          <p className="victoire">💎</p>
        </div>
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
            // Si l'un des avatars a un saxophone, c'est lui qui joue l'air de la victoire.
            son(avatarsDe(etat).some((a) => a.saxophone) ? 'sax' : 'victoire')
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
        <progress value={ecouleMs} max={DUREE_ENVIE_MS} aria-hidden="true" />
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
      <progress value={ecouleMs} max={DUREE_ENVIE_MS} aria-hidden="true" />

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
