import { defineConfig } from 'vite';

const branchName = process.env.BRANCH_NAME ? `/${process.env.BRANCH_NAME}` : '';

export default defineConfig({
    base: `/pn-junc-three${branchName}`,  // Ensure no trailing slash issue
    publicDir: 'public',
    build: {  // <-- This was missing
        rollupOptions: {
            input: 'index.html',  // Ensures all scripts in index.html are kept
            external: ['/pn-junc-three/solarcell.js'],  // Prevent Rollup from processing solarcell.js
        },
        assetsInclude: ['**/*.hdr'],  // Ensure HDR files are included in the build
    },
});