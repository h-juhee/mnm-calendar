import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { getCACertificates, setDefaultCACertificates } from 'node:tls'
// @ts-expect-error Vercel function is plain ESM JavaScript and is also used by the local dev server.
import notionRequestHandler from './api/notion-custom-request.mjs'
// @ts-expect-error Vercel function is plain ESM JavaScript and is also used by the local dev server.
import notionUsageLogHandler from './api/notion-usage-log.mjs'
// @ts-expect-error Vercel function is plain ESM JavaScript and is also used by the local dev server.
import notionClinicHoursHandler from './api/notion-clinic-hours.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // On Windows, Node does not always include the OS trust store used by the
  // browser. Include it so the local Notion middleware can establish HTTPS.
  if (process.platform === 'win32') {
    setDefaultCACertificates([
      ...getCACertificates('default'),
      ...getCACertificates('system'),
    ])
  }
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
          server.middlewares.use('/api/notion-usage-log', (req, res) => {
            void notionUsageLogHandler(req, res)
          })
          server.middlewares.use('/api/notion-clinic-hours', (req, res) => {
            void notionClinicHoursHandler(req, res)
          })
        },
      },
    ],
  }
})
