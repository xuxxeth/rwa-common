import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true, // 生成 index.d.ts 入口
      outDir: 'dist/types',   // 类型文件输出位置
    })
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'CaUtilsH5',
      formats: ['es'],
      fileName: (format, entryName) => {
        // 使用 format 作为目录名，实现自动归类
        return `${format}/${entryName}.js`
      }
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: [
        // 配置 1: ESM
        {
          format: 'es',
          dir: 'dist/es', // 所有输出(包括入口 和 chunk) 都在这里
          entryFileNames: 'index.js',
          chunkFileNames: 'chunks/[name]-[hash].js', // chunk 放在 dist/es/chunks/ 下
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM'
          }
        }
      ]
    },
  },
})
