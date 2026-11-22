// De petites icônes dessinées au trait, à la place des émojis dans les boutons.
// Elles prennent la couleur du texte autour d'elles (« currentColor »).

/** Le tracé de chaque icône, sur une grille de 24 × 24. */
const TRACES = {
  ile: 'M4 17h16M6 17c1-4 4-6 6-6s5 2 6 6M12 11V5m0 0c-2 0-4 1-5 3m5-3c2 0 4 1 5 3',
  cadeau: 'M4 9h16v11H4zM3 9h18M12 9v11M12 9c-1-3-5-4-5-1s5 1 5 1zm0 0c1-3 5-4 5-1s-5 1-5 1z',
  stats: 'M5 20v-8M12 20V5M19 20v-9',
  reglages:
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
  retour: 'M15 5l-7 7 7 7',
}

export type NomIcone = keyof typeof TRACES

export default function Icone({ nom, taille = 20 }: { nom: NomIcone; taille?: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={TRACES[nom]} />
    </svg>
  )
}
