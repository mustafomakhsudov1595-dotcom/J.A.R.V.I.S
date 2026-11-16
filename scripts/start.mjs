/**
 * One command to run JARVIS: the bridge (brain) and the Vite dev server (face)
 * together, so a student types `npm start` and nothing else.
 *
 * Two long-running processes normally mean two terminals. This launcher spawns
 * both as children, tags their output so you can tell them apart, and shuts
 * them down together on Ctrl-C — no extra dependency, just Node.
 *
 * Pass --writes to allow JARVIS to take real actions (drive the phone, the
 * browser, send things): `npm start -- --writes`.
 */

import { spawn } from 'node:child_process'
import process from 'node:process'
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { lanAddresses, loadKey } from './phone-gate.mjs'

/**
 * Put MediaPipe's WebAssembly where the page can actually load it.
 *
 * Hand tracking needs a WASM runtime, and the usual recipe fetches it from a
 * CDN. That fails here twice over. The page's CSP names no CDN in `script-src`,
 * and the runtime arrives as a script — so it is blocked, and the failure
 * surfaces as gesture control simply never starting. And a CDN import is a live
 * supply-chain dependency: executable code, re-resolved on every load, that we
 * do not control and cannot pin against being changed under us.
 *
 * Copying it out of node_modules solves both. It is served from our own origin,
 * so `'self'` covers it; and it is the exact bytes of the version in the
 * lockfile. It stays out of git — 34 MB of build output does not belong in a
 * repository — and is re-copied whenever it is missing, which costs nothing
 * after the first run.
 */
function vendorWasm() {
  const from = 'node_modules/@mediapipe/tasks-vision/wasm'
  const to = 'public/mediapipe'
  if (!existsSync(from)) return // gesture control is optional; carry on without it
  if (existsSync(`${to}/vision_wasm_internal.wasm`)) return
  try {
    mkdirSync(to, { recursive: true })
    cpSync(from, to, { recursive: true })
    console.log('  vendored the hand-tracking runtime into public/mediapipe.')
  } catch (err) {
    console.warn(`  could not vendor the hand-tracking runtime: ${err.message}`)
  }
}

const writes = process.argv.includes('--writes')
// --phone serves the face over HTTPS on the local network, behind an access
// key, so a phone on the same Wi-Fi can open it. See scripts/phone-gate.mjs.
// --public does the same and also opens a Cloudflare quick tunnel, so the phone
// reaches it from any network, not only the laptop's own Wi-Fi.
const publicLink = process.argv.includes('--public')
const phone = process.argv.includes('--phone') || publicLink

// A dim label per process, so the interleaved logs stay readable.
const paint = (tag, colour) => (line) =>
  line
    .toString()
    .split('\n')
    .filter((l) => l.length)
    .map((l) => `\x1b[${colour}m${tag}\x1b[0m ${l}`)
    .join('\n')

const children = []

function run(name, command, args, colour, env) {
  const label = paint(name, colour)
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    shell: false,
  })
  child.stdout.on('data', (d) => process.stdout.write(label(d) + '\n'))
  child.stderr.on('data', (d) => process.stderr.write(label(d) + '\n'))
  child.on('exit', (code) => {
    // If either half dies the other is useless, so take the whole thing down
    // rather than leave a half-running app that looks alive but cannot answer.
    console.log(`\x1b[${colour}m${name}\x1b[0m exited (${code}); stopping the rest.`)
    shutdown(code ?? 0)
  })
  children.push(child)
  return child
}

let stopping = false
function shutdown(code) {
  if (stopping) return
  stopping = true
  for (const c of children) {
    try {
      c.kill('SIGTERM')
    } catch {
      /* already gone */
    }
  }
  setTimeout(() => process.exit(code), 300)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

/**
 * Tell the bridge which port the face will actually be on.
 *
 * The bridge only trusts WebSocket origins on localhost:5173-5199 and
 * 4173-4199, which is the right default — a socket that any local page can open
 * is a socket that drives every MCP server on the machine. But a launcher that
 * assigns a port outside that range produces the single most confusing failure
 * this project has: the interface loads, the reactor spins, the microphone
 * hears you, and the brain answers nothing, because the handshake is being 403'd
 * somewhere neither half reports. Passing the port through closes that gap
 * without widening what the bridge trusts by default.
 */
const port = process.env.PORT
const bridgeEnv = writes ? { JARVIS_ALLOW_WRITES: '1' } : {}
if (port) {
  bridgeEnv.JARVIS_ALLOWED_ORIGINS = `http://localhost:${port},http://127.0.0.1:${port}`
  console.log(`  serving the face on port ${port}; the bridge will accept it.\n`)
}

/**
 * Ask for the ElevenLabs key once, and keep it in .env.local.
 *
 * The key is what gives JARVIS his own voice and Uzbek hearing; without it he
 * falls back to the browser's speech. It cannot ship in the repository — a key
 * in git is a key anyone can spend — so the first run asks for it and writes it
 * to a git-ignored file that the bridge reads on every start. An empty answer
 * is remembered too, so the question is asked exactly once. To change it
 * later, edit or delete the ELEVENLABS_API_KEY line in .env.local.
 */
async function askForVoiceKey() {
  if (process.env.ELEVENLABS_API_KEY) return
  let saved = ''
  try {
    saved = readFileSync('.env.local', 'utf8')
  } catch {
    /* no file yet */
  }
  if (/^\s*ELEVENLABS_API_KEY\s*=/m.test(saved)) return
  if (!process.stdin.isTTY) return

  console.log(
    '\nOvoz sozlamasi (bir marta soʻraladi)\n' +
      '  JARVIS oʻz ovozida va oʻzbekcha gapirishi uchun ElevenLabs API kaliti kerak.\n' +
      '  Kalit faqat shu kompyuterdagi .env.local faylida saqlanadi.\n' +
      '  Kalit boʻlmasa, shunchaki Enter bosing — brauzer ovozi ishlatiladi.\n',
  )
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = (await rl.question('  ElevenLabs API kaliti (sk_...): ')).trim()
  rl.close()
  if (answer && !/^[A-Za-z0-9_-]{20,200}$/.test(answer)) {
    console.log('  Bu kalitga oʻxshamadi — oʻtkazib yuborildi. Keyingi safar yana soʻraladi.\n')
    return
  }
  try {
    const lead = saved && !saved.endsWith('\n') ? '\n' : ''
    appendFileSync('.env.local', `${lead}ELEVENLABS_API_KEY=${answer}\n`, { mode: 0o600 })
    console.log(answer ? '  Saqlandi.\n' : '  Oʻtkazib yuborildi.\n')
  } catch (err) {
    console.warn(`  .env.local ga yozib boʻlmadi: ${err.message}\n`)
  }
}

await askForVoiceKey()

const faceEnv = {}
let phoneKey = ''
if (phone) {
  phoneKey = loadKey()
  // The bridge stays on 127.0.0.1; JARVIS_PHONE only lets it trust the
  // proxy's note about which address the phone reached it at.
  bridgeEnv.JARVIS_PHONE = '1'
  faceEnv.JARVIS_PHONE = '1'
  faceEnv.JARVIS_PHONE_KEY = phoneKey
}

/**
 * A public address for the phone: a Cloudflare quick tunnel.
 *
 * `cloudflared` dials out to Cloudflare and Cloudflare hands back a random
 * https://….trycloudflare.com name that forwards to this laptop — no router
 * settings, no account. It reaches past the cases where the Wi-Fi keeps
 * devices apart. The cost is that the link is on the internet, so the access
 * key in it is the only lock, and anyone who has the whole link has the agent.
 * The name changes on every start.
 */
async function openTunnel(facePort, key) {
  const tunnel = spawn(
    'cloudflared',
    ['tunnel', '--no-autoupdate', '--no-tls-verify', '--url', `https://localhost:${facePort}`],
    { shell: false },
  )
  children.push(tunnel)
  let shown = false
  const seen = (data) => {
    const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(data.toString())
    if (!m || shown) return
    shown = true
    const url = `${m[0]}/?key=${key}`
    console.log('\n\x1b[1mInternet orqali / Public link\x1b[0m')
    console.log(`\n  Telefonda ochish uchun (open on your phone, any network):\n    ${url}\n`)
    import('qrcode-terminal')
      .then(({ default: qrcode }) =>
        qrcode.generate(url, { small: true }, (code) => console.log(code.replace(/^/gm, '    '))),
      )
      .catch(() => {})
  }
  tunnel.stdout.on('data', seen)
  tunnel.stderr.on('data', seen)
  tunnel.on('error', (err) => {
    console.log(
      err.code === 'ENOENT'
        ? '\n  cloudflared topilmadi. Oʻrnating: winget install Cloudflare.cloudflared\n' +
            '  (macOS: brew install cloudflared), soʻng qayta ishga tushiring.\n'
        : `\n  Tunnel ochilmadi: ${err.message}\n`,
    )
  })
  tunnel.on('exit', (code) => {
    if (!stopping) console.log(`\n  Tunnel yopildi (${code}); havola endi ishlamaydi.\n`)
  })
}

vendorWasm()

console.log('\nJ.A.R.V.I.S. starting — the brain and the face.\n')
run('bridge', 'node', ['bridge/server.mjs'], '36', bridgeEnv)
// npm is a shell script on most systems; call the vite binary directly so we do
// not need shell:true (which would break the argument handling above).
run('face', process.execPath, ['node_modules/vite/bin/vite.js'], '35', faceEnv)

if (phone) {
  const facePort = port || 5173
  const link = (host) => `https://${host}:${facePort}/?key=${phoneKey}`
  const addresses = lanAddresses()
  console.log('\n\x1b[1mPhone mode / Telefon rejimi\x1b[0m')
  console.log(`\n  Noutbukda (on this laptop):\n    ${link('localhost')}`)
  if (addresses.length === 0) {
    console.log('\n  No network address found — connect this laptop to Wi-Fi first.')
  } else {
    console.log('\n  Telefonda (on your phone, same Wi-Fi):')
    for (const a of addresses) console.log(`    ${link(a)}`)
    try {
      const { default: qrcode } = await import('qrcode-terminal')
      console.log('\n  Telefon kamerasi bilan skanerlang (scan with the phone camera):\n')
      qrcode.generate(link(addresses[0]), { small: true }, (code) =>
        console.log(code.replace(/^/gm, '    ')),
      )
    } catch {
      /* no QR package: the link above is enough */
    }
  }
  if (publicLink) await openTunnel(facePort, phoneKey)
  console.log(
    '\n  The browser will warn about the certificate once — it is this laptop\'s\n' +
      '  own self-signed one. Choose Advanced → Proceed. The link holds the access\n' +
      '  key: anyone who has it can talk to your JARVIS, so do not share it.\n' +
      '  Ctrl-C stops everything.\n',
  )
} else {
  console.log(
    '\nWhen it says the dev server is ready, open the URL it prints in Chrome,\n' +
      'click INITIALISE, and say "Hey Jarvis". Ctrl-C stops everything.\n',
  )
}
