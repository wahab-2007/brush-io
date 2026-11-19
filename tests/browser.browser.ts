import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { test } from 'node:test'
import { chromium } from 'playwright-core'

test('the static Pages build edits, saves, copies, and downloads a blank canvas', { timeout: 45_000 }, async (t) => {
  const server = createServer(async (req, res) => {
    const file = req.url?.slice('/brush-io/'.length) || 'index.html'
    if (req.url?.startsWith('/brush-io/') &&
        /^(index\.html|favicon\.svg|assets\/[\w.-]+\.(js|css|mp3))$/.test(file)) {
      const types: Record<string, string> = { html: 'text/html', svg: 'image/svg+xml', js: 'text/javascript', css: 'text/css', mp3: 'audio/mpeg' }
      try {
        res.setHeader('Content-Type', types[file.split('.').at(-1)!])
        res.end(await readFile(new URL('../dist/' + file, import.meta.url)))
        return
      } catch {
        res.writeHead(500).end()
        return
      }
    }
    res.writeHead(404).end()
  }).listen(0, '127.0.0.1')
  t.after(() => server.close())
  await once(server, 'listening')
  const port = (server.address() as AddressInfo).port
  const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
  const browser = await chromium.launch({ executablePath })
  t.after(() => browser.close())
  const page = await browser.newPage({ permissions: ['clipboard-read', 'clipboard-write'], viewport: { width: 1200, height: 800 } })
  const failed: string[] = []
  const requests: string[] = []
  page.on('pageerror', (error) => failed.push(error.message))
  page.on('response', (response) => { if (response.status() >= 400) failed.push(response.url()) })
  page.on('request', (request) => requests.push(request.url()))
  await page.clock.setFixedTime(new Date('2026-11-19T18:00:00Z'))
  const origin = 'http://127.0.0.1:' + port + '/brush-io/'
  await page.goto(origin)
  const downloadButton = page.getByRole('button', { name: 'Download Python' })
  await page.getByText('0 planned commits in 2026').waitFor()
  assert.equal(await downloadButton.isDisabled(), true)
  assert.equal(await page.getByLabel('GitHub username').count(), 0)
  assert.equal(await page.getByText('Brush IO', { exact: true }).count(), 0)
  assert.equal(await page.locator('.script-actions').getByLabel('Site theme').count(), 1)
  assert.equal(await page.getByRole('link', { name: 'Made by @wahab-2007' }).getAttribute('href'), 'https://github.com/wahab-2007')
  assert.equal(await page.getByRole('button', { name: 'Clear canvas' }).isDisabled(), true)
  const countSquares = () => page.locator('.cell, .palette-preview span, .legend-cell').evaluateAll((elements) =>
    elements.every((element) => {
      const { width, height } = element.getBoundingClientRect()
      return width > 0 && width === height
    }))
  assert.equal(await countSquares(), true)

  await page.getByRole('button', { name: '0 planned commits on November 19, 2026' }).click()
  const dialog = page.getByRole('dialog', { name: 'November 19, 2026' })
  await dialog.getByLabel('Planned commits').fill('61')
  await dialog.getByRole('button', { name: 'Apply' }).click()
  await page.getByText('61 planned commits in 2026').waitFor()
  await page.getByRole('button', { name: 'Expanded', exact: true }).click()
  const selected = page.getByRole('button', { name: '61 planned commits on November 19, 2026' })
  assert.equal(await selected.textContent(), '61')
  assert.equal(await countSquares(), true)
  const green = await selected.evaluate((node) => getComputedStyle(node).backgroundColor)
  await page.getByLabel('Palette').selectOption('halloween')
  assert.notEqual(await selected.evaluate((node) => getComputedStyle(node).backgroundColor), green)
  await page.getByLabel('Site theme').selectOption('dark')
  assert.equal(await page.locator('html').getAttribute('data-scheme'), 'dark')

  await page.getByRole('button', { name: 'Clear canvas' }).click()
  await page.getByText('0 planned commits in 2026').waitFor()
  assert.equal(await downloadButton.isDisabled(), true)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await page.getByText('61 planned commits in 2026').waitFor()
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await page.getByText('0 planned commits in 2026').waitFor()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await page.getByText('61 planned commits in 2026').waitFor()
  await page.getByLabel('Year').selectOption('2025')
  await page.getByText('0 planned commits in 2025').waitFor()
  await page.getByLabel('Year').selectOption('2026')
  await page.reload()
  await page.getByText('61 planned commits in 2026').waitFor()

  const [script] = await Promise.all([page.waitForEvent('download'), downloadButton.click()])
  assert.equal(script.suggestedFilename(), 'github_contributions.py')
  const content = await readFile(await script.path(), 'utf8')
  assert.match(content, /PLAN = \[\["2026-11-19",61\]\]/)
  await page.getByRole('button', { name: 'Copy Python' }).click()
  await page.getByText('Copied the Python script for 61 commits.').waitFor()
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), content)

  await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', {
    value: () => Promise.reject(new Error('Permission denied')),
  }))
  await page.getByRole('button', { name: 'Copy Python' }).click()
  assert.equal(await page.getByRole('textbox', { name: 'Python script' }).inputValue(), content)
  await page.getByRole('button', { name: 'Close', exact: true }).click()


  await page.evaluate(() => {
    const original = AudioContext.prototype.createOscillator
    document.documentElement.dataset.soundCount = '0'
    AudioContext.prototype.createOscillator = function (this: AudioContext) {
      const root = document.documentElement
      root.dataset.soundCount = String(Number(root.dataset.soundCount) + 1)
      return original.call(this)
    }
  })
  const brush = page.getByLabel('Brush', { exact: true })
  const sound = page.getByRole('button', { name: 'ASMR sound' })
  await brush.selectOption('5')
  await page.getByRole('button', { name: '61 planned commits on November 19, 2026' }).click()
  await page.getByRole('button', { name: '66 planned commits on November 19, 2026' }).waitFor()
  await page.waitForFunction(() => document.documentElement.dataset.soundCount === '1')
  assert.equal(await page.getByRole('dialog').count(), 0)

  await sound.click()
  assert.equal(await sound.getAttribute('aria-pressed'), 'false')
  await brush.selectOption('custom')
  await page.getByRole('spinbutton', { name: 'Add per click' }).fill('3')
  await page.getByRole('button', { name: '66 planned commits on November 19, 2026' }).click()
  await page.getByRole('button', { name: '69 planned commits on November 19, 2026' }).waitFor()
  assert.equal(await page.locator('html').getAttribute('data-sound-count'), '1')

  const density = page.getByRole('slider', { name: 'Random fill density' })
  await density.press('Home')
  assert.equal(await density.getAttribute('aria-valuetext'), '0%')
  await page.getByRole('button', { name: 'Randomize' }).click()
  await page.getByText('0 planned commits in 2026').waitFor()
  await density.press('End')
  await page.getByRole('button', { name: 'Randomize' }).click()
  assert.equal(await page.getByRole('button', { name: /^0 planned commits on / }).count(), 0)

  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await page.getByLabel('Palette').selectOption('winter')
  await page.getByRole('button', { name: 'Full green' }).click()
  assert.equal(await page.getByRole('button', { name: /^0 planned commits on / }).count(), 0)
  assert.equal(await page.getByLabel('Palette').inputValue(), 'green')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await page.getByText('0 planned commits in 2026').waitFor()


  const appearance = page.getByLabel('Site theme', { exact: true })
  const palette = page.getByLabel('Palette', { exact: true })
  assert.equal(await palette.locator('option').count(), 17)
  await palette.selectOption('mono')
  const mono = await page.locator('.palette-preview').innerHTML()
  await palette.selectOption('blackWhite')
  assert.notEqual(await page.locator('.palette-preview').innerHTML(), mono)
  await appearance.selectOption('paper')
  assert.equal(await page.locator('html').getAttribute('data-site-theme'), 'paper')
  await appearance.selectOption('lagoon')
  assert.equal(await page.locator('html').getAttribute('data-scheme'), 'dark')
  assert.equal(await palette.inputValue(), 'blackWhite')

  await appearance.selectOption('disco')
  const music = page.getByRole('button', { name: 'Disco music' })
  await page.waitForFunction(() => (document.querySelector('audio')?.currentTime ?? 0) > 0)
  assert.equal(await page.locator('html').getAttribute('data-site-theme'), 'disco')
  assert.equal(await page.evaluate(() => document.querySelector('audio')?.loop), true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await page.evaluate(() => getComputedStyle(document.body, '::before').animationName), 'none')
  await music.click()
  await page.waitForFunction(() => document.querySelector('audio')?.paused)
  await music.click()
  await page.waitForFunction(() => document.querySelector('audio')?.paused === false)
  await appearance.selectOption('orchid')
  assert.equal(await music.count(), 0)
  assert.equal(await page.evaluate(() => {
    const player = document.querySelector('audio')
    return player?.paused && player.currentTime === 0
  }), true)
  assert.equal(await palette.inputValue(), 'blackWhite')

  await page.setViewportSize({ width: 375, height: 750 })
  assert.equal(await page.locator('.graph-scroll').evaluate((node) => node.scrollWidth > node.clientWidth), true)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  assert.ok(requests.every((url) => url.startsWith(origin) || url.startsWith('blob:')))
  assert.deepEqual(failed, [])
})
