import { defineConfig } from 'vite';

export default defineConfig({
  base: `/pn-junc-three/${process.env.BRANCH_NAME || ''}/`,  // Automatically sets the correct base
});
