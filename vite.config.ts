import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // Project Pages serve from /<repo>/. Keep dev at root, prefix only on build.
  base: command === 'build' ? '/gittree/' : '/',
  plugins: [react()],
  define: {
    // isomorphic-git references `global` (Node.js) — alias to `globalThis` for browser
    global: 'globalThis',
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    // Optimize bundle size
    target: 'es2020',
    minify: 'esbuild', // Use esbuild for faster builds
    // Code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code
          'react-vendor': ['react', 'react-dom'],
          'git-vendor': ['isomorphic-git'],
          'date-vendor': ['date-fns'],
        },
      },
    },
    // Increase chunk size warning limit (we optimized it)
    chunkSizeWarningLimit: 600,
  },
  // Performance optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'isomorphic-git', 'date-fns'],
  },
}))
