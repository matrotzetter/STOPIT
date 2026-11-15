import { describe, expect, it } from 'vitest'
import { avatarsDe } from './avatar'
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
