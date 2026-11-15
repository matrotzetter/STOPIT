import { useEffect, useState } from 'react'

/** Renvoie l'heure actuelle et la rafraîchit régulièrement (chaque seconde par défaut). */
export function useMaintenant(intervalleMs = 1000): number {
  const [maintenant, setMaintenant] = useState(Date.now())
  useEffect(() => {
    const minuterie = setInterval(() => setMaintenant(Date.now()), intervalleMs)
    return () => clearInterval(minuterie) // on arrête la minuterie en quittant l'écran
  }, [intervalleMs])
  return maintenant
}
