import { defineConfig } from 'vite';

export default defineConfig({
  base: `/pn-junc-three/${process.env.BRANCH_NAME || ''}/`,  // Use dynamic branch name
  publicDir: 'public',
  rollupOptions: {
    input: 'index.html',  // Ensures all scripts in index.html are kept
    external: ['/pn-junc-three/solarcell.js'],
    assetsInclude: ['**/*.hdr'], // Ensure HDR files are included in the build
},
});



