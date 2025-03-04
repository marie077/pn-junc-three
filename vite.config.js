import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pn-junc-three/', // Change this to your actual GitHub repo name
  build: {
    rollupOptions: {
      input: 'index.html',  // Ensures all scripts in index.html are kept
    },
  },
});
