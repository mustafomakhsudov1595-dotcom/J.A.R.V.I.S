import { defineConfig, type Plugin, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { gateMiddleware, judge, mediaKey } from './scripts/phone-gate.mjs'

const port = Number(process.env.PORT) || 5173

/**
 * Phone mode — `npm run phone`.
 *
 * The launcher sets JARVIS_PHONE and hands over the access key. In this mode
 * the face is served over HTTPS on every interface (a phone will not give a
 * plain-http page the microphone), every request must carry the key, and the
 * bridge — still listening on 127.0.0.1 only — is reached through `/bridge` on
 * this same origin. Without the flag nothing below applies and the dev server
 * is exactly what it was: http, localhost only.
 */
const phoneKey = process.env.JARVIS_PHONE === '1' ? (process.env.JARVIS_PHONE_KEY ?? '') : ''
if (process.env.JARVIS_PHONE === '1' && !/^[a-f0-9]{48}$/.test(phoneKey)) {
  throw new Error('phone mode needs its access key — start it with `npm run phone`')
}
const bridgePort = Number(process.env.JARVIS_BRIDGE_PORT ?? 8787)

function phoneGate(key: string): Plugin {
  return {
    name: 'jarvis-phone-gate',
    // Registered before Vite's own middlewares, so nothing — not the page, not
    // a source file, not the proxy — is served to a request without the key.
    configureServer(server) {
      server.middlewares.use(gateMiddleware(key))
    },
    configurePreviewServer(server) {
      server.middlewares.use(gateMiddleware(key))
    },
  }
}

const bridgeProxy = (key: string): ProxyOptions => ({
  target: `http://127.0.0.1:${bridgePort}`,
  ws: true,
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/bridge/, '') || '/',
  // The bridge trusts the local dev origin and nothing else. The gate has
  // already checked the real one, so the proxy speaks for the page.
  headers: { origin: `http://localhost:${port}` },
  // WebSocket upgrades never reach the middleware stack, so the socket is
  // judged here. `false` makes Vite answer 404 and drop the connection.
  bypass: (req, res) => {
    if (res) return undefined
    return judge(req, key, { upgrade: true }).allow ? undefined : false
  },
  configure: (proxy) => {
    proxy.on('proxyReq', (proxyReq, req) => {
      // The key stays on this side of the proxy.
      proxyReq.removeHeader('cookie')
      // Tell the bridge where the phone reaches it, for links inside reader
      // pages. Set unconditionally so a client cannot supply its own.
      proxyReq.setHeader('x-jarvis-public-base', `https://${req.headers.host ?? ''}/bridge`)
      proxyReq.setHeader('x-jarvis-media-key', mediaKey(key))
    })
    proxy.on('proxyReqWs', (proxyReq) => proxyReq.removeHeader('cookie'))
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ...(phoneKey ? [basicSsl({ name: 'jarvis' }), phoneGate(phoneKey)] : [])],
  server: {
    // Honour PORT so a second instance can run alongside the first. The bridge
    // only accepts sockets from localhost:5173-5199, so stay inside that range
    // or set JARVIS_ALLOWED_ORIGINS to match.
    port,
    ...(phoneKey
      ? {
          host: true,
          strictPort: true,
          // Vite refuses requests addressed to any hostname it does not know,
          // which is what stops DNS rebinding. The public link (`npm run
          // public`) arrives under a trycloudflare.com name, so that one
          // suffix is allowed — and the access key still gates every request.
          allowedHosts: ['.trycloudflare.com'],
          proxy: { '/bridge': bridgeProxy(phoneKey) },
        }
      : {}),
  },
  optimizeDeps: {
    // kokoro-js pulls in `phonemizer`, which carries espeak-ng as inline WASM.
    // Vite's dependency pre-bundler rewrites that initialisation and the
    // language table ends up empty — the symptom is
    // `Invalid language identifier: "en". Should be one of: .` at generate()
    // time, long after the model has loaded successfully. Serving these
    // untouched fixes it.
    exclude: ['kokoro-js', 'phonemizer', '@huggingface/transformers'],
  },
})
