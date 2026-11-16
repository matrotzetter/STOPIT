// Écran « Mes avatars » : régler l'apparence des deux personnages.
import { useEffect, useRef } from 'react'
import type { Ecran } from '../App'
import { animer, avatarsDe, balancement, dessinerAvatar } from '../avatar'
import { COIFFURES } from '../config'
import type { Avatar, Etat } from '../logique/types'

interface Props {
  etat: Etat
  maj: (etat: Etat) => void
  aller: (ecran: Ecran) => void
}

/** Taille de l'aperçu, en pixels. */
const APERCU = 120

interface PropsApercu {
  avatar: Avatar
  /** Décale le balancement, pour que deux avatars côte à côte ne bougent pas ensemble. */
  decalage?: number
  /** true : il sourit, les yeux plissés. */
  content?: boolean
}

/** Petit dessin animé de l'avatar : il se tourne doucement d'un côté puis de l'autre. */
export function Apercu({ avatar, decalage = 0, content = false }: PropsApercu) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!
    // L'animation s'arrête d'elle-même quand l'avatar change ou disparaît.
    return animer((t) => {
      // On dessine deux fois plus grand que l'affichage, pour rester net sur téléphone.
      ctx.clearRect(0, 0, APERCU * 2, APERCU * 2)
      dessinerAvatar(ctx, avatar, APERCU, APERCU * 2 - 8, APERCU * 2 - 44, content, balancement(t, decalage))
    })
  })
  return <canvas ref={ref} className="apercu-avatar" width={APERCU * 2} height={APERCU * 2} aria-hidden="true" />
}

export default function Avatars({ etat, maj, aller }: Props) {
  const avatars = avatarsDe(etat)

  /** Enregistre un changement sur l'avatar n° i. */
  function changer(i: number, changement: Partial<Avatar>) {
    maj({ ...etat, avatars: avatars.map((a, j) => (j === i ? { ...a, ...changement } : a)) })
  }

  return (
    <main>
      <h1>Mes avatars</h1>
      <p className="discret">Ils apparaissent sur la plage de l'île, au coin du feu du mini-jeu et quand tu surmontes une envie. Chaque changement est enregistré tout de suite.</p>

      {avatars.map((a, i) => (
        <section className="carte" key={i}>
          <Apercu avatar={a} />
          <div className="couleurs">
            <label>
              Peau
              <input type="color" value={a.peau} onChange={(e) => changer(i, { peau: e.target.value })} />
            </label>
            <label>
              Cheveux
              <input type="color" value={a.cheveux} onChange={(e) => changer(i, { cheveux: e.target.value })} />
            </label>
            <label>
              Pull
              <input type="color" value={a.pull} onChange={(e) => changer(i, { pull: e.target.value })} />
            </label>
          </div>
          <p className="discret">Coiffure</p>
          <div className="puces">
            {Object.entries(COIFFURES).map(([id, nom]) => (
              <button
                key={id}
                className={a.coiffure === id ? 'puce choisie' : 'puce'}
                aria-pressed={a.coiffure === id}
                onClick={() => changer(i, { coiffure: id })}
              >
                {nom}
              </button>
            ))}
          </div>
          <label className="interrupteur">
            <input type="checkbox" checked={!!a.lunettes} onChange={(e) => changer(i, { lunettes: e.target.checked })} />
            Lunettes
          </label>
          <label className="interrupteur">
            <input type="checkbox" checked={!!a.barbe} onChange={(e) => changer(i, { barbe: e.target.checked })} />
            Barbe
          </label>
          <label className="interrupteur">
            <input type="checkbox" checked={!!a.saxophone} onChange={(e) => changer(i, { saxophone: e.target.checked })} />
            Saxophone
          </label>
          <label className="interrupteur">
            <input type="checkbox" checked={!!a.dab} onChange={(e) => changer(i, { dab: e.target.checked })} />
            Fait un dab de temps en temps
          </label>
        </section>
      ))}

      <button onClick={() => aller('reglages')}>Retour</button>
    </main>
  )
}
