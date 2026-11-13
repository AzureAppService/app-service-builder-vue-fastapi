import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify, stripVTControlCharacters } from 'node:util'

function startServer(t, command, args, options) {
  const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] })
  const closed = new Promise((resolve) => child.once('close', resolve))
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM')
    }
    await closed
  })

  return new Promise((resolve, reject) => {
    let output = ''
    const timeout = setTimeout(() => reject(new Error(`Server did not become ready: ${output}`)), 10000)
    const finish = (error, origin) => {
      clearTimeout(timeout)
      if (error) reject(error)
      else resolve(origin)
    }
    const receive = (chunk) => {
      output += chunk.toString()
      const origin = stripVTControlCharacters(output).match(/http:\/\/127\.0\.0\.1:\d+(?=[/\s])/)?.[0]
      if (origin) finish(null, origin)
    }
    child.once('error', (error) => finish(error))
    child.once('close', (code) => finish(new Error(`Server exited (${code}): ${output}`)))
    child.stdout.on('data', receive)
    child.stderr.on('data', receive)
  })
}

test('manifest keeps separate frontend and API roots and routes', async () => {
  const manifest = await readFile(new URL('./builder.yaml', import.meta.url), 'utf8')
  assert.equal(manifest.replaceAll('\r\n', '\n'), `components:
  - name: web
    rootDirectory: web
    path: /

  - name: api
    rootDirectory: api
    role: web
    platform: python
    path: /api
    run:
      port: 8080
      start: python main.py
      healthCheckPath: /api/health
`)
})

test('frontend build contains only static assets and public metadata', async () => {
  const entries = await readdir(new URL('./web/dist/', import.meta.url))
  assert.deepEqual(entries.sort(), ['assets', 'brand', 'index.html', 'version.json'])
  const version = JSON.parse(await readFile(new URL('./web/dist/version.json', import.meta.url), 'utf8'))
  assert.deepEqual(version, {
    app: 'app-service-builder-vue-fastapi-web',
    version: '1.0.0',
    framework: 'Vue 3 with Vite 8',
  })
  const assets = await readdir(new URL('./web/dist/assets/', import.meta.url))
  assert.ok(assets.some((name) => name.endsWith('.js')))
  assert.ok(assets.some((name) => name.endsWith('.css')))
  assert.ok(assets.every((name) => /^[\w-]+\.(js|css)$/.test(name)))
})

test('built frontend and real API share one local origin', { timeout: 30000 }, async (t) => {
  const python = process.env.PYTHON ?? 'python'
  const { stdout } = await promisify(execFile)(python, [
    '-c', "from importlib.metadata import version; print(version('fastapi'))",
  ], {
    cwd: new URL('./api/', import.meta.url),
  })
  const fastapiVersion = stdout.trim()
  assert.ok(fastapiVersion, 'The API interpreter must report an installed FastAPI version')

  const apiOrigin = await startServer(t, python, [
    '-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '0', '--no-access-log',
  ], {
    cwd: new URL('./api/', import.meta.url),
  })
  const origin = await startServer(t, process.execPath, [
    fileURLToPath(new URL('./web/node_modules/vite/bin/vite.js', import.meta.url)),
    'preview', '--host', '127.0.0.1', '--port', '0', '--strictPort',
  ], {
    cwd: new URL('./web/', import.meta.url),
    env: { ...process.env, API_PROXY_TARGET: apiOrigin },
  })

  const root = await fetch(origin)
  assert.equal(root.status, 200)
  assert.match(root.headers.get('content-type'), /text\/html/)
  const html = await root.text()
  assert.ok(html.includes('<title>App Service Builder: Vue + FastAPI sample</title>'))
  assert.match(html, /<div id="app"><\/div>/)
  assert.doesNotMatch(html, /\/src\/|node_modules/)
  for (const route of ['/products/widget-1', '/unknown-client-route']) {
    const response = await fetch(new URL(route, origin))
    assert.equal(response.status, 200)
    assert.equal(await response.text(), html)
  }

  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1])
  const styles = [...html.matchAll(/<link\b[^>]*\bhref="([^"]+\.css)"/g)].map((match) => match[1])
  assert.equal(scripts.length, 1)
  assert.equal(styles.length, 2)
  for (const [asset, contentType] of [
    ...scripts.map((asset) => [asset, /javascript/]),
    ...styles.map((asset) => [asset, /text\/css/]),
    ['/brand/builder.svg', /image\/svg\+xml/],
    ['/brand/vue.svg', /image\/svg\+xml/],
    ['/brand/fastapi.svg', /image\/svg\+xml/],
  ]) {
    assert.match(asset, /^\/(?:assets\/[\w-]+\.(?:js|css)|brand\/[\w.-]+\.(?:css|svg))$/)
    const response = await fetch(new URL(asset, origin))
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), contentType)
    assert.ok((await response.arrayBuffer()).byteLength > 0)
  }

  for (const [path, expected] of [
    ['/version.json', { app: 'app-service-builder-vue-fastapi-web' }],
    ['/api/health', { status: 'ok', app: 'app-service-builder-vue-fastapi-api' }],
    ['/api/status', { status: 'available', message: 'The Vue frontend reached FastAPI on the same origin.' }],
    ['/api/version', { app: 'app-service-builder-vue-fastapi-api', framework: `FastAPI ${fastapiVersion}` }],
    ['/api/request', { method: 'GET', path: '/api/request' }],
  ]) {
    const response = await fetch(new URL(path, origin))
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /application\/json/)
    const body = await response.json()
    for (const [key, value] of Object.entries(expected)) {
      assert.equal(body[key], value, `${path}: ${key}`)
    }
  }

  const echo = await fetch(new URL('/api/echo', origin), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'hello' }),
  })
  assert.equal(echo.status, 200)
  assert.deepEqual(await echo.json(), { received: { message: 'hello' } })

  const missing = await fetch(new URL('/api/missing', origin))
  assert.equal(missing.status, 404)
  assert.match(missing.headers.get('content-type'), /application\/json/)
  assert.deepEqual(await missing.json(), {
    error: 'not_found',
    message: 'The requested API route does not exist.',
  })
})
