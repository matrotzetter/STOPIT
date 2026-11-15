import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Configuration de Vite, l'outil qui lance l'app en développement
// et qui fabrique la version finale à mettre en ligne.
export default defineConfig({
  // Chemins relatifs : l'app fonctionne quel que soit le nom du dépôt GitHub Pages.
  base: './',
  plugins: [
    react(),
    // Rend l'app installable et utilisable hors ligne : à la première visite,
    // tous les fichiers sont copiés sur l'appareil par un « service worker ».
    VitePWA({
      registerType: 'autoUpdate', // une nouvelle version en ligne remplace l'ancienne toute seule
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Cagnotte',
        short_name: 'Cagnotte',
        description: 'Arrêter la nicotine : cagnotte, récompenses et île dans la brume.',
        lang: 'fr',
        display: 'standalone', // s'ouvre comme une app, sans barre d'adresse
        start_url: './',
        scope: './',
        theme_color: '#0f1419',
        background_color: '#0f1419',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
