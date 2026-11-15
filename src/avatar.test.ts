import { describe, expect, it } from 'vitest'
import { CALQUES, HAUTEUR_AVATAR, LARGEUR_AVATAR, avatarsDe } from './avatar'
import { AVATARS_DEFAUT } from './config'
import type { Etat } from './logique/types'

const etat = { avatars: undefined } as Etat

describe('avatarsDe', () => {
  it('renvoie les deux avatars par défaut quand rien n’est réglé', () => {
    expect(avatarsDe(etat)).toEqual(AVATARS_DEFAUT)
  })

  it('complète un avatar incomplet ou absent (fichier importé abîmé)', () => {
    const avatars = avatarsDe({ ...etat, avatars: [{ nom: 'Mat', barbe: true }] } as Etat)
    expect(avatars).toHaveLength(2)
    expect(avatars[0]).toEqual({ ...AVATARS_DEFAUT[0], nom: 'Mat', barbe: true })
    expect(avatars[1]).toEqual(AVATARS_DEFAUT[1])
  })
})

describe('dessins en pixels', () => {
  it('chaque ligne de chaque calque a la bonne largeur et tient dans l’image', () => {
    for (const calque of Object.values(CALQUES)) {
      for (const [ligne, texte] of calque) {
        expect(texte).toHaveLength(LARGEUR_AVATAR)
        expect(ligne).toBeLessThan(HAUTEUR_AVATAR)
        expect(texte).toMatch(/^[.oscmpkhlngG]+$/) // uniquement des lettres qui ont une couleur
      }
    }
  })
})
