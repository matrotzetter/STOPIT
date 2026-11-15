// Écran d'accueil : temps écoulé, cagnotte, prochaine récompense,
// check-in quotidien et bouton « J'ai une envie ».
import type { Ecran } from '../App'
import { NOM_UNITE, chf, duree } from '../format'
import {
  cagnotte,
  cleJour,
  cristaux,
  meilleureSerieMs,
  prochaineRecompense,
  serieMs,
  tempsCumuleMs,
  unitesNonConsommees,
} from '../logique/calculs'
import type { Etat } from '../logique/types'
import { useMaintenant } from '../useMaintenant'

interface Props {
  etat: Etat
  maj: (etat: Etat) => void
  aller: (ecran: Ecran) => void
}

export default function Accueil({ etat, maj, aller }: Props) {
  const maintenant = useMaintenant()
  const pasEncoreArrete = maintenant < etat.profil.dateArret
  const prochaine = prochaineRecompense(etat, maintenant)
  const aujourdhui = cleJour(maintenant)
  const checkinFait = etat.checkins.includes(aujourdhui)

  return (
    <main className="avec-bouton-fixe">
      <h1>Cagnotte</h1>

      {pasEncoreArrete ? (
        <section className="carte centre">
          <p className="discret">Arrêt dans</p>
          <p className="grand">{duree(etat.profil.dateArret - maintenant, true)}</p>
        </section>
      ) : (
        <section className="carte centre">
          <p className="discret">Sans nicotine depuis</p>
          <p className="grand">{duree(tempsCumuleMs(etat, maintenant), true)}</p>
        </section>
      )}

      <section className="tuiles">
        <div className="carte">
          <p className="discret">Cagnotte</p>
          <p className="valeur or">{chf(cagnotte(etat, maintenant))}</p>
        </div>
        <div className="carte">
          <p className="discret">Non consommé</p>
          <p className="valeur">
            {Math.floor(unitesNonConsommees(etat, maintenant))} {NOM_UNITE[etat.profil.produit]}
          </p>
        </div>
        <div className="carte">
          <p className="discret">Série en cours</p>
          <p className="valeur">{duree(serieMs(etat, maintenant))}</p>
        </div>
        <div className="carte">
          <p className="discret">Meilleure série</p>
          <p className="valeur">{duree(meilleureSerieMs(etat, maintenant))}</p>
        </div>
      </section>

      {prochaine && (
        <section className="carte">
          <p className="discret">Prochaine récompense</p>
          <p className="valeur">
            {prochaine.recompense.nom} · {chf(prochaine.recompense.prix)}
          </p>
          <progress value={prochaine.progression} max={1} aria-label="Progression vers la récompense" />
          <p className="discret">
            {prochaine.progression >= 1
              ? 'Débloquée !'
              : // On n'affiche que ce qui manque vraiment (jours, CHF, ou les deux).
                'Il manque ' +
                [
                  prochaine.joursManquants > 0 && `${Math.ceil(prochaine.joursManquants)} j`,
                  prochaine.chfManquants > 0 && chf(prochaine.chfManquants),
                ]
                  .filter(Boolean)
                  .join(' et ')}
          </p>
        </section>
      )}

      {!pasEncoreArrete && (
        <section className="carte">
          {checkinFait ? (
            <p>✅ Check-in fait aujourd'hui · 💎 {cristaux(etat, maintenant)} cristaux</p>
          ) : (
            <>
              <p>Toujours sans nicotine aujourd'hui ?</p>
              <div className="rangee">
                <button onClick={() => maj({ ...etat, checkins: [...etat.checkins, aujourdhui] })}>Oui</button>
                <button className="secondaire" onClick={() => aller('rechute')}>
                  Non
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* Bouton fixé en bas de l'écran : atteignable du pouce, sans défiler. */}
      <button className="bouton-envie" onClick={() => aller('envie')}>
        J'ai une envie
      </button>
    </main>
  )
}
