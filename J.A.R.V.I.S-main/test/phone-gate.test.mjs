import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { COOKIE, judge, loadKey, mediaKey } from '../scripts/phone-gate.mjs'

const KEY = 'ab'.repeat(24)
const HOST = '192.168.1.5:5173'
const req = (url, extra = {}) => ({
  url,
  method: 'GET',
  ...extra,
  headers: { host: HOST, ...(extra.headers ?? {}) },
})
const withCookie = (url, extra = {}) =>
  req(url, { ...extra, headers: { cookie: `theme=dark; ${COOKIE}=${KEY}`, ...(extra.headers ?? {}) } })

test('a request with no key is turned away, whatever it asks for', () => {
  for (const url of ['/', '/src/main.tsx', '/bridge/health', '/bridge/file?path=/etc/hosts']) {
    assert.deepEqual(judge(req(url), KEY), { allow: false })
  }
})

test('the link with the right key is granted a cookie; a wrong key is not', () => {
  assert.deepEqual(judge(req(`/?key=${KEY}`), KEY), { allow: false, grant: true })
  assert.deepEqual(judge(req(`/?key=${'cd'.repeat(24)}`), KEY), { allow: false })
  assert.deepEqual(judge(req('/?key='), KEY), { allow: false })
  // The key only works on the front page, never as a pass on another path.
  assert.deepEqual(judge(req(`/bridge/health?key=${KEY}`), KEY), { allow: false })
})

test('the cookie opens everything, and a wrong cookie nothing', () => {
  assert.equal(judge(withCookie('/bridge/health'), KEY).allow, true)
  assert.equal(judge(withCookie('/bridge', {}), KEY, { upgrade: true }).allow, true)
  const bad = req('/', { headers: { cookie: `${COOKIE}=${'cd'.repeat(24)}` } })
  assert.equal(judge(bad, KEY).allow, false)
})

test('another site cannot ride the cookie', () => {
  const evil = { origin: 'https://evil.example' }
  assert.equal(judge(withCookie('/bridge/tts', { method: 'POST', headers: evil }), KEY).allow, false)
  assert.equal(judge(withCookie('/bridge', { headers: evil }), KEY, { upgrade: true }).allow, false)
  const own = { origin: `https://${HOST}` }
  assert.equal(judge(withCookie('/bridge/tts', { method: 'POST', headers: own }), KEY).allow, true)
  assert.equal(judge(withCookie('/bridge', { headers: own }), KEY, { upgrade: true }).allow, true)
})

test('the media key opens the image proxies and nothing else', () => {
  const mk = mediaKey(KEY)
  assert.notEqual(mk, KEY)
  assert.equal(judge(req(`/bridge/img?mk=${mk}&url=https%3A%2F%2Fexample.com%2Fa.png`), KEY).allow, true)
  assert.equal(judge(req(`/bridge/media?mk=${mk}&url=x`), KEY).allow, true)
  for (const url of [`/bridge/file?mk=${mk}&path=/x.png`, `/bridge/page?mk=${mk}&url=x`, `/?mk=${mk}`]) {
    assert.equal(judge(req(url), KEY).allow, false)
  }
  assert.equal(judge(req(`/bridge?mk=${mk}`), KEY, { upgrade: true }).allow, false)
})

test('the key is minted once and read back', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'jarvis-key-')), 'nested', 'phone-key')
  const first = loadKey(file)
  assert.match(first, /^[a-f0-9]{48}$/)
  assert.equal(readFileSync(file, 'utf8').trim(), first)
  assert.equal(loadKey(file), first)
})
