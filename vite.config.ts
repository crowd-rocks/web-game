import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/graphql': {
        target: 'https://webapi.crowdedkingdoms.com:6443',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}); 