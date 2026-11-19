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
  async function waitForTotal(expected: number) {
    await page.waitForFunction((total) => {
      const cells = [...document.querySelectorAll('button.cell')]
      return cells.length > 0 && cells.reduce((sum, cell) =>
        sum + Number(cell.getAttribute('aria-label')?.split(' ')[0].replaceAll(',', '')), 0) === total
    }, expected)
  }

  async function openTools() {
    if (!await page.getByRole('dialog', { name: 'Tools', exact: true }).isVisible()) {
      await page.getByRole('button', { name: 'Tools', exact: true }).click()
    }
  }

  await waitForTotal(0)
  assert.equal(await page.getByText('Year', { exact: true }).count(), 0)
  assert.equal(await page.locator('.canvas-total, .brush-bar').count(), 0)
  assert.equal(await page.getByLabel('Brush', { exact: true }).isVisible(), false)
  const expandedBox = await page.getByRole('button', { name: 'Expanded', exact: true }).boundingBox()
  const yearBox = await page.getByLabel('Year', { exact: true }).boundingBox()
  assert.ok(expandedBox && yearBox && yearBox.x >= expandedBox.x + expandedBox.width)

  assert.equal(await page.getByRole('heading', { name: /Contribution (canvas|calendar)/i }).count(), 0)
  assert.equal(await page.locator('.workspace').evaluate((panel) => getComputedStyle(panel).overflow), 'clip')
  assert.equal(await page.locator('.action-bar').evaluate((bar) => getComputedStyle(bar).borderBottomLeftRadius), '0px')
  assert.equal(await downloadButton.isDisabled(), true)
  assert.equal(await page.getByLabel('GitHub username').count(), 0)
  assert.equal(await page.getByText('Brush IO', { exact: true }).count(), 0)
  assert.equal(await page.locator('.script-actions').getByLabel('Site theme').count(), 1)
  assert.equal(await page.getByRole('link', { name: 'Made by @wahab-2007' }).getAttribute('href'), 'https://github.com/wahab-2007')
  assert.equal(await page.getByRole('button', { name: 'Clear canvas' }).isDisabled(), true)
  const countSquares = () => page.locator('.cell, .palette-preview .palette-cubes span, .legend-cell').evaluateAll((elements) =>
    elements.every((element) => {
      const { width, height } = element.getBoundingClientRect()
      return width > 0 && width === height
    }))
  assert.equal(await countSquares(), true)

  await page.getByRole('button', { name: '0 planned commits on November 19, 2026' }).click()
  const dialog = page.getByRole('dialog', { name: 'November 19, 2026' })
  await dialog.getByLabel('Planned commits').fill('61')
  await dialog.getByRole('button', { name: 'Apply' }).click()
  await waitForTotal(61)
  await page.getByRole('button', { name: 'Expanded', exact: true }).click()
  const selected = page.getByRole('button', { name: '61 planned commits on November 19, 2026' })
  assert.equal(await selected.textContent(), '61')
  await selected.hover()
  const readout = page.locator('.cell-readout')
  assert.match(await readout.innerText(), /November 19, 2026.*61.*commits/s)
  const fillColor = await selected.evaluate((node) => getComputedStyle(node).backgroundColor)
  assert.equal(await readout.locator('.readout-number').evaluate((node) => getComputedStyle(node).color), fillColor)
  await page.mouse.move(1, 1)
  assert.equal(await readout.textContent(), '')

  assert.equal(await countSquares(), true)
  const green = await selected.evaluate((node) => getComputedStyle(node).backgroundColor)
  async function choosePalette(label: string, name: string) {
    await page.getByRole('button', { name: label, exact: true }).click()
    await page.getByRole('dialog', { name: label + ' choices' }).getByRole('button', { name, exact: true }).click()
  }
  await choosePalette('Palette', 'Halloween')
  assert.notEqual(await selected.evaluate((node) => getComputedStyle(node).backgroundColor), green)
  await page.getByLabel('Site theme').selectOption('dark')
  assert.equal(await page.locator('html').getAttribute('data-scheme'), 'dark')

  await page.getByRole('button', { name: 'Clear canvas' }).click()
  await waitForTotal(0)
  assert.equal(await downloadButton.isDisabled(), true)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await waitForTotal(61)
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await waitForTotal(0)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await waitForTotal(61)
  await page.getByLabel('Year').selectOption('2025')
  await waitForTotal(0)
  await page.getByLabel('Year').selectOption('2026')
  await page.reload()
  await waitForTotal(61)

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
    AudioContext.prototype.createOscillator = function (this: AudioContext) {
      const tone = original.call(this)
      const parameter = tone.frequency
      const setValueAtTime = parameter.setValueAtTime.bind(parameter)
      parameter.setValueAtTime = (value, time) => {
        const cue = value === 470 ? 'clickSounds' : value === 610 ? 'hoverSounds' : 'sliderSounds'
        const data = document.documentElement.dataset
        data[cue] = String(Number(data[cue] ?? '0') + 1)
        return setValueAtTime(value, time)
      }
      return tone
    }
  })
  const brush = page.getByLabel('Brush', { exact: true })
  const sound = page.getByRole('button', { name: 'ASMR sound' })
  await openTools()
  await brush.selectOption('5')
  await page.getByRole('button', { name: '61 planned commits on November 19, 2026' }).click()
  await page.getByRole('button', { name: '66 planned commits on November 19, 2026' }).waitFor()
  await page.waitForFunction(() => Number(document.documentElement.dataset.clickSounds) > 0)
  const hoverCount = () => page.locator('html').getAttribute('data-hover-sounds')
  const beforeControlHover = await hoverCount()
  await openTools()
  await page.getByRole('button', { name: 'FILL ALL' }).hover()
  assert.equal(await hoverCount(), beforeControlHover)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(55)
  await page.locator('button.cell').first().hover()
  assert.notEqual(await hoverCount(), beforeControlHover)
  await page.waitForFunction(() => Number(document.documentElement.dataset.hoverSounds) > 0)
  await openTools()
  await page.getByRole('slider', { name: 'Random fill density' }).press('ArrowRight')
  await page.waitForFunction(() => Number(document.documentElement.dataset.sliderSounds) > 0)
  assert.equal(await page.getByRole('dialog', { name: /November/ }).count(), 0)

  await sound.click()
  assert.equal(await sound.getAttribute('aria-pressed'), 'false')
  const mutedClickCount = await page.locator('html').getAttribute('data-click-sounds')
  await brush.selectOption('custom')
  await page.getByRole('spinbutton', { name: 'Add per click' }).fill('3')
  await page.getByRole('button', { name: '66 planned commits on November 19, 2026' }).click()
  await page.getByRole('button', { name: '69 planned commits on November 19, 2026' }).waitFor()
  assert.equal(await page.locator('html').getAttribute('data-click-sounds'), mutedClickCount)

  assert.deepEqual(await page.locator('.weekday').allTextContents(), ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
  for (const label of ['Undo', 'Redo']) {
    const button = page.getByRole('button', { name: label, exact: true })
    assert.equal(await button.textContent(), '')
    assert.equal(await button.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect()
      return width === height && getComputedStyle(element).borderRadius === '50%'
    }), true)
  }
  assert.equal(await page.getByText('Site theme', { exact: true }).count(), 0)

  await openTools()
  const density = page.getByRole('slider', { name: 'Random fill density' })
  await density.press('Home')
  assert.equal(await density.getAttribute('aria-valuetext'), '0%')
  await page.getByRole('button', { name: 'Randomize' }).click()
  await waitForTotal(0)
  await density.press('End')
  await page.getByRole('button', { name: 'Randomize' }).click()
  assert.equal(await page.getByRole('button', { name: /^0 planned commits on / }).count(), 0)

  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await choosePalette('Palette', 'Winter')
  await openTools()
  const fillAllButton = page.getByRole('button', { name: 'FILL ALL' })
  const dayCount = await page.locator('button.cell').count()
  await fillAllButton.click()
  await waitForTotal(dayCount + 0)
  await fillAllButton.click()
  await waitForTotal(dayCount * 2 + 0)
  await page.getByRole('button', { name: '2 planned commits on January 15, 2026', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: /^0 planned commits on / }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Palette', exact: true }).getAttribute('data-palette'), 'winter')
  const january = page.getByRole('button', { name: '1 planned commit on January 15, 2026', exact: true })
  const february = page.getByRole('button', { name: '1 planned commit on February 15, 2026', exact: true })
  const januaryBefore = await january.evaluate((element) => getComputedStyle(element).backgroundColor)
  const februaryBefore = await february.evaluate((element) => getComputedStyle(element).backgroundColor)
  await choosePalette('Odd months', 'Green')
  assert.notEqual(await january.evaluate((element) => getComputedStyle(element).backgroundColor), januaryBefore)
  assert.equal(await february.evaluate((element) => getComputedStyle(element).backgroundColor), februaryBefore)
  assert.deepEqual(await page.locator('.legend-months').allTextContents(), ['Even months', 'Odd months'])
  await choosePalette('Odd months', 'Same palette')
  assert.equal(await january.evaluate((element) => getComputedStyle(element).backgroundColor), januaryBefore)

  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await waitForTotal(0)


  const appearance = page.getByLabel('Site theme', { exact: true })
  for (const [name, scheme, color] of [
    ['True Light', 'light', 'rgb(246, 248, 250)'],
    ['True Dark', 'dark', 'rgb(13, 17, 23)'],
    ['White High Contrast', 'light', 'rgb(255, 255, 255)'],
    ['Black High Contrast', 'dark', 'rgb(0, 0, 0)'],
  ]) {
    await appearance.selectOption({ label: name })
    assert.equal(await page.locator('html').getAttribute('data-scheme'), scheme)
    assert.equal(await page.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor), color)
  }

  const palette = page.getByRole('button', { name: 'Palette', exact: true })
  await palette.click()
  const picker = page.getByRole('dialog', { name: 'Palette choices' })
  await picker.waitFor()
  assert.equal(await picker.getByRole('button').count(), 17)
  assert.equal(await picker.innerText(), '')
  await page.keyboard.press('Escape')
  await picker.waitFor({ state: 'hidden' })
  await choosePalette('Palette', 'Mono')
  const mono = await palette.innerHTML()
  await choosePalette('Palette', 'Black & White')
  assert.notEqual(await palette.innerHTML(), mono)
  await appearance.selectOption('paper')
  assert.equal(await page.locator('html').getAttribute('data-site-theme'), 'paper')
  await appearance.selectOption('lagoon')
  assert.equal(await page.locator('html').getAttribute('data-scheme'), 'dark')
  assert.equal(await palette.getAttribute('data-palette'), 'blackWhite')

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
  assert.equal(await palette.getAttribute('data-palette'), 'blackWhite')

  await openTools()
  await page.getByRole('button', { name: 'FILL ALL' }).click()
  const savedTotal = await page.locator('button.cell').count() + 0
  await waitForTotal(savedTotal)
  await choosePalette('Palette', 'Winter')
  await choosePalette('Odd months', 'Green')
  await page.getByRole('button', { name: 'Expanded', exact: true }).click()
  const presets = page.getByRole('dialog', { name: 'Presets', exact: true })
  await page.getByRole('button', { name: 'Presets', exact: true }).click()
  await presets.getByLabel('Preset name').fill('Saved calendar')
  await presets.getByRole('button', { name: 'Save', exact: true }).click()
  await presets.getByText('Preset saved.').waitFor()
  await page.getByRole('button', { name: 'Clear canvas' }).click()
  await waitForTotal(0)
  await page.getByLabel('Year', { exact: true }).selectOption('2025')
  await page.reload()
  await waitForTotal(0)
  await page.getByRole('button', { name: 'Presets', exact: true }).click()
  await presets.getByLabel('Saved presets', { exact: true }).selectOption('Saved calendar')
  await presets.getByRole('button', { name: 'Load', exact: true }).click()
  await presets.getByText('Preset loaded.').waitFor()
  await waitForTotal(savedTotal)
  assert.equal(await page.getByLabel('Year', { exact: true }).inputValue(), '2026')
  assert.equal(await palette.getAttribute('data-palette'), 'winter')
  assert.equal(await page.getByRole('button', { name: 'Odd months', exact: true }).getAttribute('data-palette'), 'green')
  assert.equal(await page.getByRole('button', { name: 'Expanded', exact: true }).getAttribute('aria-pressed'), 'true')
  await presets.getByRole('button', { name: 'Delete', exact: true }).click()
  await presets.getByText('Preset deleted.').waitFor()
  assert.equal(await presets.getByLabel('Saved presets').locator('option').count(), 1)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Normal', exact: true }).click()

  const size = (selector: string) => page.locator(selector).evaluate((node) => node.getBoundingClientRect().width)
  const tileWidth = await size('button.cell:first-of-type')
  await page.setViewportSize({ width: 1500, height: 800 })
  assert.equal(await size('.app'), 1320)
  assert.equal(await size('.graph-board'), 1118)
  assert.equal(await size('button.cell:first-of-type'), tileWidth)
  assert.ok(await palette.locator('.palette-cubes span').first().evaluate((cube) => cube.getBoundingClientRect().width > 12))

  await page.setViewportSize({ width: 375, height: 750 })
  assert.equal(await page.locator('.graph-scroll').evaluate((node) => node.scrollWidth > node.clientWidth), true)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  assert.ok(requests.every((url) => url.startsWith(origin) || url.startsWith('blob:')))
  assert.deepEqual(failed, [])
})
