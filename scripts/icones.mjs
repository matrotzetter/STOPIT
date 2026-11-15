// Fabrique les icônes de l'app (une pièce dorée sur fond sombre) sans aucun
// fichier image : chaque pixel est calculé, puis écrit au format PNG.
// Lancé automatiquement par « npm run build ». Résultat dans le dossier public/.
import { mkdirSync, writeFileSync } from 'node:fs'
import { crc32, deflateSync } from 'node:zlib'

const FOND = [15, 20, 25]
const OR = [242, 193, 78]
const OR_FONCE = [201, 154, 46]

/** Couleur d'un point de l'icône ; x et y vont de −0.5 à 0.5, le centre est en (0, 0). */
function couleur(x, y) {
  const distance = Math.hypot(x, y)
  if (distance > 0.36) return FOND // hors de la pièce (marge compatible avec les icônes rondes d'Android)
  if (distance > 0.27 && distance < 0.3) return OR_FONCE // l'anneau gravé
  return OR
}

/** Un « bloc » du format PNG : longueur, nom, contenu, somme de contrôle. */
function bloc(nom, contenu) {
  const corps = Buffer.concat([Buffer.from(nom), contenu])
  const longueur = Buffer.alloc(4)
  longueur.writeUInt32BE(contenu.length)
  const controle = Buffer.alloc(4)
  controle.writeUInt32BE(crc32(corps))
  return Buffer.concat([longueur, corps, controle])
}

/** Construit une image PNG carrée de « taille » pixels de côté. */
function png(taille) {
  const lignes = Buffer.alloc(taille * (1 + taille * 3))
  let i = 0
  for (let py = 0; py < taille; py++) {
    lignes[i++] = 0 // chaque ligne commence par un octet « pas de filtre »
    for (let px = 0; px < taille; px++) {
      // On moyenne 3 × 3 points par pixel pour adoucir les bords du cercle.
      const somme = [0, 0, 0]
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          const c = couleur((px + (sx + 0.5) / 3) / taille - 0.5, (py + (sy + 0.5) / 3) / taille - 0.5)
          somme[0] += c[0]
          somme[1] += c[1]
          somme[2] += c[2]
        }
      }
      lignes[i++] = somme[0] / 9
      lignes[i++] = somme[1] / 9
      lignes[i++] = somme[2] / 9
    }
  }
  const entete = Buffer.alloc(13)
  entete.writeUInt32BE(taille, 0) // largeur
  entete.writeUInt32BE(taille, 4) // hauteur
  entete[8] = 8 // 8 bits par couleur
  entete[9] = 2 // mode rouge-vert-bleu
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // signature de tout fichier PNG
    bloc('IHDR', entete),
    bloc('IDAT', deflateSync(lignes)),
    bloc('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public', { recursive: true })
writeFileSync('public/icone-192.png', png(192))
writeFileSync('public/icone-512.png', png(512))
writeFileSync('public/apple-touch-icon.png', png(180)) // icône de l'écran d'accueil sur iPhone
console.log('Icônes créées dans public/')
