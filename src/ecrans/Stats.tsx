// Écran « Statistiques » : envies par jour, déclencheurs, heures à risque.
import type { Ecran } from '../App'
import { chf } from '../format'
import { JOUR_MS, economieParJour, tempsCumuleMs } from '../logique/calculs'
import { declencheursFrequents, enviesParHeure, enviesParJour } from '../logique/stats'
import type { Etat } from '../logique/types'

interface Props {
  etat: Etat
  aller: (ecran: Ecran) => void
}

interface Barre {
  /** Texte complet de la barre, lu par les lecteurs d'écran et affiché au survol. */
  description: string
  valeur: number
  /** Petit texte sous la barre (vide = pas d'étiquette, pour ne pas surcharger). */
  etiquette: string
}

/** Un petit graphique en barres verticales, dessiné avec de simples blocs. */
function Barres({ barres }: { barres: Barre[] }) {
  const max = Math.max(1, ...barres.map((b) => b.valeur))
  return (
    <div className="barres" role="list">
      {barres.map((b, i) => (
        <div key={i} className="colonne" role="listitem" title={b.description} aria-label={b.description}>
          {/* On n'écrit le nombre qu'au-dessus de la plus haute barre. */}
          <span className="nombre">{b.valeur === max && b.valeur > 0 ? b.valeur : ''}</span>
          {/* La « piste » occupe la hauteur restante ; la barre en remplit une partie. */}
          <div className="piste">
            <div className="barre" style={{ height: `${(b.valeur / max) * 100}%` }} />
          </div>
          <span className="etiquette">{b.etiquette}</span>
        </div>
      ))}
    </div>
  )
}

export default function Stats({ etat, aller }: Props) {
  const maintenant = Date.now()
  const surmontees = etat.envies.filter((e) => e.surmontee).length
  const joursCumules = tempsCumuleMs(etat, maintenant) / JOUR_MS
  const jours = enviesParJour(etat.envies, maintenant)
  const declencheurs = declencheursFrequents(etat.envies)
  const heures = enviesParHeure(etat.envies)
  const maxDeclencheur = Math.max(1, ...declencheurs.map((d) => d.total))

  return (
    <main>
      <h1>Statistiques</h1>

      <section className="tuiles">
        <div className="carte">
          <span className="icone" aria-hidden="true">📅</span>
          <p className="discret">Jours</p>
          <p className="grand">{Math.floor(joursCumules)}</p>
        </div>
        <div className="carte">
          <span className="icone" aria-hidden="true">💰</span>
          {/* Tout l'argent non dépensé depuis l'arrêt, récompenses encaissées comprises. */}
          <p className="discret">Gardé</p>
          <p className="valeur or">{chf(joursCumules * economieParJour(etat.profil))}</p>
        </div>
        <div className="carte">
          <span className="icone" aria-hidden="true">💪</span>
          <p className="discret">Surmontées</p>
          <p className="grand">{surmontees}</p>
        </div>
        <div className="carte">
          <span className="icone" aria-hidden="true">📝</span>
          <p className="discret">Envies</p>
          <p className="grand">{etat.envies.length}</p>
        </div>
      </section>

      {etat.envies.length === 0 ? (
        <p className="discret">Les graphiques apparaîtront après ta première envie notée.</p>
      ) : (
        <>
          <section className="carte">
            <h2>Envies par jour (14 derniers jours)</h2>
            <Barres
              barres={jours.map((j, i) => ({
                description: `${j.jour} : ${j.total} envie(s)`,
                valeur: j.total,
                // Une étiquette tous les 3 jours, au format « 15.11 ».
                etiquette: (jours.length - 1 - i) % 3 === 0 ? `${j.jour.slice(8)}.${j.jour.slice(5, 7)}` : '',
              }))}
            />
          </section>

          <section className="carte">
            <h2>Heures à risque</h2>
            <Barres
              barres={heures.map((total, h) => ({
                description: `${h} h : ${total} envie(s)`,
                valeur: total,
                etiquette: h % 6 === 0 ? `${h} h` : '',
              }))}
            />
          </section>

          <section className="carte">
            <h2>Déclencheurs les plus fréquents</h2>
            {declencheurs.length === 0 ? (
              <p className="discret">Aucun déclencheur noté pour l'instant.</p>
            ) : (
              declencheurs.map((d) => (
                <div key={d.nom} className="ligne-declencheur">
                  <span>{d.nom}</span>
                  <div className="barre" style={{ width: `${(d.total / maxDeclencheur) * 100}%` }} />
                  <span className="nombre">{d.total}</span>
                </div>
              ))
            )}
          </section>
        </>
      )}

      <button onClick={() => aller('accueil')}>Retour</button>
    </main>
  )
}
