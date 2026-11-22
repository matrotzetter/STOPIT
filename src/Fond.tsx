// Le décor de toutes les pages : la nuit, des étoiles, un soleil lointain et une géante
// gazeuse qui se lève en bas de l'écran. Un seul dessin SVG, fixé derrière le contenu.
import { hasard } from './pixels'

/** Bandes de la géante, du haut vers le bas (position de 0 à 1, couleur). */
const BANDES: [number, string][] = [
  [0, '#f6d3a8'],
  [0.08, '#edb98a'],
  [0.14, '#f3cb9e'],
  [0.22, '#de9a6b'],
  [0.3, '#e9b084'],
  [0.38, '#cf8560'],
  [0.47, '#e2a67c'],
  [0.56, '#c2734f'],
  [0.66, '#d99470'],
  [0.78, '#b16447'],
  [1, '#9a5340'],
]

/** Les étoiles : toujours au même endroit (tirage reproductible), plus nombreuses en haut. */
const alea = hasard(21)
const ETOILES = Array.from({ length: 48 }, () => ({
  x: alea() * 390,
  y: alea() ** 1.6 * 560,
  r: [0.6, 0.8, 1][Math.floor(alea() * 3)],
  o: 0.25 + alea() * 0.45,
}))

/** discret = true : la géante est plus basse et le soleil plus pâle, pour ne pas gêner la lecture. */
export default function Fond({ discret = false }: { discret?: boolean }) {
  return (
    // « xMidYMax slice » : le dessin remplit tout l'écran et reste calé en bas, quelle que soit sa taille.
    <svg className="fond" viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="fond-nuit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e1026" />
          <stop offset="0.55" stopColor="#17163a" />
          <stop offset="1" stopColor="#221b3f" />
        </linearGradient>
        <radialGradient id="fond-soleil">
          <stop offset="0" stopColor="#fff6dc" />
          <stop offset="0.25" stopColor="#ffe3a3" />
          <stop offset="0.6" stopColor="#ffb86b" stopOpacity="0.25" />
          <stop offset="1" stopColor="#ffb86b" stopOpacity="0" />
        </radialGradient>
        {/* Les bandes de la géante, réparties sur la partie visible (300 pixels sous son sommet). */}
        <linearGradient id="fond-bandes" gradientUnits="userSpaceOnUse" x1="0" y1="540" x2="0" y2="840">
          {BANDES.map(([position, couleur]) => (
            <stop key={position} offset={position} stopColor={couleur} />
          ))}
        </linearGradient>
        {/* Ombre sur le bord de la géante : elle paraît ronde. */}
        <radialGradient id="fond-relief" cx="0.38" cy="0.22" r="0.85">
          <stop offset="0.5" stopColor="#0e1026" stopOpacity="0" />
          <stop offset="1" stopColor="#0e1026" stopOpacity="0.7" />
        </radialGradient>
        <filter id="fond-flou">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
        <filter id="fond-halo" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <clipPath id="fond-disque">
          <circle cx="195" cy="1010" r="470" />
        </clipPath>
      </defs>

      <rect width="390" height="844" fill="url(#fond-nuit)" />
      {ETOILES.map((e, n) => (
        <circle key={n} cx={e.x} cy={e.y} r={e.r} fill="#fff" opacity={e.o} />
      ))}
      {/* Le soleil, au loin */}
      <g opacity={discret ? 0.45 : 1}>
        <circle cx="300" cy="150" r="56" fill="url(#fond-soleil)" />
        <circle cx="300" cy="150" r="7" fill="#fff6dc" />
      </g>
      {/* La géante : un halo, puis le disque à bandes, puis l'ombre de son bord */}
      <g transform={discret ? 'translate(0 190)' : undefined} opacity={discret ? 0.55 : 1}>
        <circle cx="195" cy="1010" r="476" fill="#f3c99a" opacity="0.35" filter="url(#fond-halo)" />
        <g clipPath="url(#fond-disque)">
          <rect x="-275" y="540" width="940" height="940" fill="url(#fond-bandes)" filter="url(#fond-flou)" />
          <ellipse cx="327" cy="766" rx="75" ry="24" fill="#f6d3a8" opacity="0.5" filter="url(#fond-flou)" />
          <circle cx="195" cy="1010" r="470" fill="url(#fond-relief)" />
        </g>
      </g>
    </svg>
  )
}
