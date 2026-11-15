import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration de Vite, l'outil qui lance l'app en développement
// et qui fabrique la version finale à mettre en ligne.
export default defineConfig({
  plugins: [react()],
  // Chemins relatifs : l'app fonctionne quel que soit le nom du dépôt GitHub Pages.
  base: './',
})
