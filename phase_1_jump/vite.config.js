//import { defineConfig } from 'vite'
//import vue from '@vitejs/plugin-vue'
//
//// link by https://vitejs.dev/config/
//export default defineConfig({
//  plugins: [vue()],
//  build: {
//    rollupOptions: {
//      input: {index: './index.html'}
//    }
//  }
//})

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  build: {
    rollupOptions: {
      input: { index: './index.html' }
    }
  }
})