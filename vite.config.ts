import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Splits the three large dependencies out of the app bundle
        // (27/8/26 - see the sweep report, finding 9). Everything used to
        // land in one 582 kB chunk, which tripped Vite's own size warning
        // and meant any change to app code invalidated the whole download
        // for returning visitors.
        //
        // Split this way, the app's own code is about 71 kB and the three
        // vendor chunks are cached independently: editing a component no
        // longer forces a re-download of React, Supabase and
        // framer-motion. The groups are listed most-specific first, since
        // the first matching group wins.
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'vendor-motion', test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/ },
            { name: 'vendor-supabase', test: /node_modules[\\/]@supabase[\\/]/ },
          ],
        },
      },
    },
  },
})
