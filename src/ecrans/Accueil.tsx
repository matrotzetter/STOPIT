// Écran d'accueil : l'île en grand, temps écoulé, cagnotte, prochaine récompense,
// check-in quotidien et bouton « J'ai une envie ».
import type { Ecran } from '../App'
import { NOM_UNITE, chf, duree, dureeCourte, texteManque } from '../format'
import {
  cagnotte,
  cleJour,
  meilleureSerieMs,
  prochaineRecompense,
  serieMs,
  soldeCagnotte,
  tempsCumuleMs,
  unitesNonConsommees,
} from '../logique/calculs'
import { energie, soldeCristaux } from '../logique/ile'
import type { Etat } from '../logique/types'
import { CarteIle } from './CarteIle'
import { useMaintenant } from '../useMaintenant'

interface Props {
  etat: Etat
  maj: (etat: Etat) => void
  aller: (ecran: Ecran) => void
}

/** Un petit mot d'accueil selon l'heure. */
function salutation(maintenant: number): string {
  const heure = new Date(maintenant).getHours()
  if (heure < 6) return 'Bonne nuit 🌙'
  if (heure < 12) return 'Bonjour ☀️'
  if (heure < 18) return 'Bon après-midi 🌤️'
  return 'Bonsoir 🕯️'
}

export default function Accueil({ etat, maj, aller }: Props) {
  const maintenant = useMaintenant()
  const pasEncoreArrete = maintenant < etat.profil.dateArret
  /** Ce qui manque pour que la cagnotte repasse au-dessus de zéro (0 s'il n'y a pas de retard). */
  const retard = Math.max(0, -soldeCagnotte(etat, maintenant))
  const prochaine = prochaineRecompense(etat, maintenant)
  const aujourdhui = cleJour(maintenant)
  const checkinFait = etat.checkins.includes(aujourdhui)
  const rechuteAujourdhui = etat.rechutes.some((r) => cleJour(r.date) === aujourdhui)

  return (
    <main className="avec-bouton-fixe">
      {/* Une guirlande lumineuse en haut de la page. */}
      <svg className="guirlande" viewBox="0 0 100 12" aria-hidden="true">
        <path d="M0,2 Q50,14 100,2" />
        {[...Array(11).keys()].map((n) => {
          const p = (n + 0.5) / 11 // position le long du fil, de 0 à 1
          return <rect key={n} className="etoile" x={p * 100 - 1.2} y={0.8 + 2 * p * (1 - p) * 12} width={2.4} height={2.4} style={{ animationDelay: `${n * 0.35}s` }} />
        })}
      </svg>
      <h1>Cagnotte</h1>
      <p className="discret">{salutation(maintenant)}</p>

      {/* L'île est le cœur de la page : un tap l'ouvre pour construire. */}
      <button className="ile-accueil" onClick={() => aller('ile')}>
        <CarteIle etat={etat} maintenant={maintenant} />
        <span>
          Mon île · ⚡ {Math.floor(energie(etat, maintenant))} · 💎 {soldeCristaux(etat, maintenant)}
        </span>
      </button>

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

      {/* La question du jour, juste sous le compteur : c'est le geste quotidien. */}
      {!pasEncoreArrete && (
        <section className="carte">
          {rechuteAujourdhui || checkinFait ? (
            <>
              <p>{rechuteAujourdhui ? "Rechute notée aujourd'hui. Tu repars de là." : "✅ Check-in fait aujourd'hui"}</p>
              {/* La journée n'est pas finie : on peut encore noter une rechute (ou une de plus). */}
              <button className="secondaire" onClick={() => aller('rechute')}>
                J'en ai pris une
              </button>
            </>
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

      <section className="tuiles">
        <div className="carte">
          <span className="icone" aria-hidden="true">💰</span>
          <p className="discret">Cagnotte</p>
          <p className="valeur or">{chf(cagnotte(etat, maintenant))}</p>
          {/* Après une rechute plus chère que la cagnotte : on dit combien il reste à rattraper. */}
          {retard > 0 && <p className="discret">{chf(retard)} à rattraper</p>}
        </div>
        <div className="carte">
          <span className="icone" aria-hidden="true">🚭</span>
          <p className="discret">Évité</p>
          <p className="valeur">
            {Math.floor(unitesNonConsommees(etat, maintenant))} {NOM_UNITE[etat.profil.produit]}
          </p>
        </div>
        <div className="carte">
          <span className="icone" aria-hidden="true">🔥</span>
          <p className="discret">Série</p>
          <p className="valeur">{dureeCourte(serieMs(etat, maintenant))}</p>
        </div>
        <div className="carte">
          <span className="icone" aria-hidden="true">🏅</span>
          <p className="discret">Record</p>
          <p className="valeur">{dureeCourte(meilleureSerieMs(etat, maintenant))}</p>
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
              : texteManque(prochaine.joursManquants, prochaine.chfManquants)}
          </p>
        </section>
      )}

      <button className="secondaire espace" onClick={() => aller('recompenses')}>
        🎁 Mes récompenses
      </button>

      <div className="rangee">
        <button className="secondaire" onClick={() => aller('stats')}>
          📊 Statistiques
        </button>
        <button className="secondaire" onClick={() => aller('reglages')}>
          ⚙️ Réglages
        </button>
      </div>

      {/* Bouton fixé en bas de l'écran : atteignable du pouce, sans défiler. */}
      <button className="bouton-envie" onClick={() => aller('envie')}>
        J'ai une envie
      </button>
    </main>
  )
}
