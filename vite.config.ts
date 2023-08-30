import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import viteCompression from 'vite-plugin-compression'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          antd: ['ant-design-vue'],
          vue: ['vue'],
        }
      }
    }
  },
  plugins: [
    vue(),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false, // css in js
        }),
      ],
    }),
    viteCompression({
      verbose: true,
      deleteOriginFile: false,
      threshold: 0,
      algorithm: 'gzip',
      ext: '.gz'
    })
  ],
  base:'https://static.wkjay.com/sfdb_web_ui/'
})
