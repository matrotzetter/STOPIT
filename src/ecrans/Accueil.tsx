// Écran d'accueil : la série en cours, l'île en grand, la cagnotte, la prochaine
// récompense, la question du jour et le bouton « J'ai une envie ».
import type { Ecran } from '../App'
import Icone from '../Icone'
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
  JOUR_MS,
} from '../logique/calculs'
import { energie, soldeCristaux } from '../logique/ile'
import type { Etat } from '../logique/types'
import { useMaintenant } from '../useMaintenant'
import { CarteIle } from './CarteIle'

interface Props {
  etat: Etat
  maj: (etat: Etat) => void
  aller: (ecran: Ecran) => void
}

export default function Accueil({ etat, maj, aller }: Props) {
  const maintenant = useMaintenant()
  const pasEncoreArrete = maintenant < etat.profil.dateArret
  const serie = serieMs(etat, maintenant)
  /** Ce qui manque pour que la cagnotte repasse au-dessus de zéro (0 s'il n'y a pas de retard). */
  const retard = Math.max(0, -soldeCagnotte(etat, maintenant))
  const prochaine = prochaineRecompense(etat, maintenant)
  const aujourdhui = cleJour(maintenant)
  const checkinFait = etat.checkins.includes(aujourdhui)
  const rechuteAujourdhui = etat.rechutes.some((r) => cleJour(r.date) === aujourdhui)

  return (
    <main className="avec-bouton-fixe">
      <header className="entete">
        <div>
          <p className="label">{pasEncoreArrete ? 'Arrêt dans' : 'Sans nicotine depuis'}</p>
          {pasEncoreArrete ? (
            <p className="grand petit">{duree(etat.profil.dateArret - maintenant, true)}</p>
          ) : (
            // Le compteur repart de zéro à chaque rechute ; le temps total reste juste en dessous.
            <p className="grand">
              {Math.floor(serie / JOUR_MS)} j <span className="leger">{Math.floor((serie % JOUR_MS) / 3600000)} h</span>
            </p>
          )}
          {!pasEncoreArrete && (
            <p className="discret">
              Record {dureeCourte(meilleureSerieMs(etat, maintenant))} · {dureeCourte(tempsCumuleMs(etat, maintenant))} au total
            </p>
          )}
        </div>
        <nav className="actions">
          <button className="icone-seule" aria-label="Statistiques" onClick={() => aller('stats')}>
            <Icone nom="stats" />
          </button>
          <button className="icone-seule" aria-label="Réglages" onClick={() => aller('reglages')}>
            <Icone nom="reglages" />
          </button>
        </nav>
      </header>

      {/* L'île est le cœur de la page : la toucher ouvre l'écran Île, pour construire. */}
      <button className="ile-accueil" onClick={() => aller('ile')}>
        <CarteIle etat={etat} maintenant={maintenant} ilot={false} />
        <span className="discret">
          Mon île · ⚡ {Math.floor(energie(etat, maintenant))} · 💎 {soldeCristaux(etat, maintenant)}
        </span>
      </button>

      <section className="tuiles">
        <div className="carte">
          <p className="label">Cagnotte</p>
          <p className="valeur or">{chf(cagnotte(etat, maintenant))}</p>
          {/* Après une rechute plus chère que la cagnotte : on dit combien il reste à rattraper. */}
          {retard > 0 && <p className="discret">{chf(retard)} à rattraper</p>}
        </div>
        <div className="carte">
          <p className="label">Évité</p>
          <p className="valeur">
            {Math.floor(unitesNonConsommees(etat, maintenant))} <span className="unite">{NOM_UNITE[etat.profil.produit]}</span>
          </p>
        </div>
        {prochaine ? (
          // Toute la carte est un bouton : elle ouvre la liste des récompenses.
          <button className="carte large" onClick={() => aller('recompenses')}>
            <span className="ligne-titre">
              <span className="label">Prochaine récompense</span>
              <span className="discret">{Math.floor(prochaine.progression * 100)} %</span>
            </span>
            <span className="nom-recompense">
              {prochaine.recompense.nom} · {chf(prochaine.recompense.prix)}
            </span>
            <progress value={prochaine.progression} max={1} aria-label="Progression vers la récompense" />
            <span className="discret">
              {prochaine.progression >= 1 ? 'Débloquée !' : texteManque(prochaine.joursManquants, prochaine.chfManquants)}
            </span>
          </button>
        ) : (
          <button className="secondaire large" onClick={() => aller('recompenses')}>
            <Icone nom="cadeau" /> Mes récompenses
          </button>
        )}
      </section>

      {/* La question du jour : c'est le geste quotidien. */}
      {!pasEncoreArrete && (
        <section className="carte question">
          {rechuteAujourdhui || checkinFait ? (
            <>
              <span>{rechuteAujourdhui ? 'Rechute notée. Tu repars de là.' : "✓ Check-in fait aujourd'hui"}</span>
              {/* La journée n'est pas finie : on peut encore noter une rechute (ou une de plus). */}
              <button className="secondaire petit" onClick={() => aller('rechute')}>
                J'en ai pris une
              </button>
            </>
          ) : (
            <>
              <span>Sans nicotine aujourd'hui&nbsp;?</span>
              <button className="petit oui" onClick={() => maj({ ...etat, checkins: [...etat.checkins, aujourdhui] })}>
                Oui
              </button>
              <button className="secondaire petit" onClick={() => aller('rechute')}>
                Non
              </button>
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
