import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { slackApiPlugin } from './vite.slack-plugin'
import type { Plugin } from 'vite'

/** Converte module→clássico e move <script> para o fim do body (#root primeiro). */
function classicScriptPlugin(): Plugin {
  return {
    name: 'classic-script',
    enforce: 'post',
    generateBundle(_opts, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset' || typeof file.source !== 'string') continue
        if (!file.fileName.endsWith('.html')) continue

        let html = file.source
          .replace(/<script type="module"[^>]*>/g, '<script>')
          .replace(/\bcrossorigin\b/g, '')

        const scripts: string[] = []
        html = html.replace(/<script>[\s\S]*?<\/script>/gi, (match) => {
          scripts.push(match)
          return ''
        })
        if (scripts.length && html.includes('</body>')) {
          html = html.replace('</body>', `${scripts.join('\n')}\n</body>`)
        }

        file.source = html
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), slackApiPlugin(), viteSingleFile(), classicScriptPlugin()],
  base: './',
  publicDir: false,
  build: {
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    modulePreload: false,
    outDir: 'dist-embed',
    target: 'es2017',
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name].js',
      },
    },
  },
})
