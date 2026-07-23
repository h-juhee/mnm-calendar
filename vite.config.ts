import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error Vercel function is plain ESM JavaScript and is also used by the local dev server.
import notionRequestHandler from './api/notion-custom-request.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The Notion token is used only by the local Node middleware, never exposed to Vite client code.
  Object.assign(process.env, loadEnv(mode, process.cwd(), 'NOTION_'))

  return {
    plugins: [
      react(),
      {
        name: 'local-notion-api',
        configureServer(server) {
          server.middlewares.use('/api/notion-custom-request', (req, res) => {
            void notionRequestHandler(req, res)
          })
        },
      },
    ],
  }
})
