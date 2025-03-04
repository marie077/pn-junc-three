import { defineConfig } from 'vite';

export default defineConfig({
  base: `/pn-junc-three/${process.env.BRANCH_NAME || ''}/`,  // Use dynamic branch name
  rollupOptions: {
    input: 'index.html',  // Ensures all scripts in index.html are kept
  },
});
