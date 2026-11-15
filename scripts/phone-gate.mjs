/**
 * The lock on the door in phone mode.
 *
 * `npm run phone` puts the face on the local network so a phone can open it.
 * The bridge itself never leaves 127.0.0.1 — the dev server proxies `/bridge`
 * to it — but a proxy with nothing in front of it would hand the agent to
 * every device on the Wi-Fi. So every request has to carry an access key.
 *
 * The key arrives once, in the link the launcher prints (and draws as a QR
 * code): `https://<laptop>:5173/?key=…`. That visit trades it for a cookie and
 * drops the key out of the address bar; from then on the cookie is the proof.
 * There is no loopback exemption on purpose: a tunnel (ngrok, cloudflared)
 * makes every visitor look like 127.0.0.1.
 *
 * Kept free of Vite imports so `node --test` can exercise it directly.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, networkInterfaces } from 'node:os'
import { dirname, join } from 'node:path'

export const COOKIE = 'jarvis_key'
const KEY_SHAPE = /^[a-f0-9]{48}$/

/** Read the saved key, or mint one. Saved so a home-screen shortcut keeps working. */
export function loadKey(file = join(homedir(), '.jarvis', 'phone-key')) {
  try {
    if (existsSync(file)) {
      const saved = readFileSync(file, 'utf8').trim()
      if (KEY_SHAPE.test(saved)) return saved
    }
  } catch {
    /* unreadable: fall through and mint a fresh one */
  }
  const key = randomBytes(24).toString('hex')
  try {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, key + '\n', { mode: 0o600 })
  } catch {
    /* a key that only lives for this run still works */
  }
  return key
}

/**
 * A second, weaker key that opens only the image and media proxies.
 *
 * Reader pages are shown in a sandboxed frame with an opaque origin, and the
 * browser sends no cookies from there, so their images need another way in.
 * This is derived from the real key and useless for anything else: it cannot
 * open the agent socket, the file endpoint or the page itself.
 */
export const mediaKey = (key) =>
  createHmac('sha256', key).update('jarvis-media').digest('hex').slice(0, 40)

function same(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}

function cookieValue(header, name) {
  for (const part of String(header ?? '').split(';')) {
    const at = part.indexOf('=')
    if (at > 0 && part.slice(0, at).trim() === name) return part.slice(at + 1).trim()
  }
  return ''
}

/**
 * Decide one request. Returns:
 *   { allow: true }                      let it through
 *   { allow: false, grant: true }        a correct ?key= link: set the cookie
 *   { allow: false }                     turn it away
 *
 * @param {{ url?: string, method?: string, headers: Record<string, any> }} req
 * @param {string} key
 * @param {{ upgrade?: boolean }} [opts]
 */
export function judge(req, key, opts = {}) {
  const url = new URL(req.url ?? '/', 'https://x')
  const path = url.pathname

  // A cross-site page must not be able to ride the cookie: anything that
  // changes state or opens a socket has to come from our own origin.
  const origin = req.headers.origin
  if (origin && (opts.upgrade || (req.method && req.method !== 'GET'))) {
    let host = ''
    try {
      host = new URL(origin).host
    } catch {
      /* malformed: host stays empty and fails the comparison */
    }
    if (!host || host !== req.headers.host) return { allow: false }
  }

  if (same(cookieValue(req.headers.cookie, COOKIE), key)) return { allow: true }

  if (
    !opts.upgrade &&
    req.method === 'GET' &&
    (path === '/bridge/img' || path === '/bridge/media') &&
    same(url.searchParams.get('mk') ?? '', mediaKey(key))
  ) {
    return { allow: true }
  }

  if (!opts.upgrade && req.method === 'GET' && path === '/' && same(url.searchParams.get('key') ?? '', key)) {
    return { allow: false, grant: true }
  }
  return { allow: false }
}

const LOCKED = `<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>J.A.R.V.I.S. — locked</title>
<body style="margin:0;height:100vh;display:grid;place-items:center;background:#01060c;color:#4fd6ff;font-family:system-ui,sans-serif;text-align:center">
<div style="padding:24px;max-width:26rem">
<div style="letter-spacing:.4em;font-weight:600">J.A.R.V.I.S.</div>
<p style="opacity:.75;line-height:1.6">Kirish yopiq. Noutbukdagi terminalda chiqqan QR kodni skanerlang yoki kalitli havolani oching.</p>
<p style="opacity:.45;font-size:.85em;line-height:1.6">Access locked. Scan the QR code shown in the laptop's terminal, or open the link with the key.</p>
</div></body>`

// Not a redirect: a SameSite cookie set on a redirect that began on another
// site (a QR scanner, a chat app) is not sent on the hop that follows.
const GRANTED = `<!doctype html><meta charset="utf-8"><title>J.A.R.V.I.S.</title>
<body style="background:#01060c"><script>location.replace('/')</script></body>`

/** Connect-style middleware: everything the dev server serves goes through it. */
export function gateMiddleware(key) {
  return (req, res, next) => {
    const verdict = judge(req, key)
    if (verdict.allow) return next()
    if (verdict.grant) {
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'referrer-policy': 'no-referrer',
        'set-cookie': `${COOKIE}=${key}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
      })
      return res.end(GRANTED)
    }
    res.writeHead(401, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(LOCKED)
  }
}

/** This machine's addresses on the local network, the likeliest first. */
export function lanAddresses() {
  const found = []
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) found.push(net.address)
    }
  }
  const rank = (a) => (a.startsWith('192.168.') ? 0 : a.startsWith('10.') ? 1 : 2)
  return found.sort((a, b) => rank(a) - rank(b))
}
