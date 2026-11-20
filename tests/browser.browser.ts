import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { test } from 'node:test'
import { chromium } from 'playwright-core'

test('the static Pages build edits, saves, and downloads a blank canvas', { timeout: 45_000 }, async (t) => {
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
  const page = await browser.newPage({ colorScheme: 'light', viewport: { width: 1200, height: 800 } })
  const failed: string[] = []
  const requests: string[] = []
  page.on('pageerror', (error) => failed.push(error.message))
  page.on('response', (response) => { if (response.status() >= 400) failed.push(response.url()) })
  page.on('request', (request) => requests.push(request.url()))
  await page.clock.setFixedTime(new Date('2026-11-19T18:00:00Z'))
  const origin = 'http://127.0.0.1:' + port + '/brush-io/'
  await page.goto(origin)
  const cell = (date: string, year = 2026) => page.getByRole('button', {
    name: new RegExp(' on ' + date + ', ' + year + '$'),
  })
  const count = async (date: string, year = 2026) => Number((await cell(date, year).getAttribute('aria-label'))?.split(' ')[0].replaceAll(',', ''))
  const firstDay = 'January 4'
  const lastDay = 'November 19'
  const initial = 0
  await cell(firstDay).waitFor()
  const viewport = page.getByRole('region', { name: 'Calendar years', exact: true })
  const yearRow = (year: number) => viewport.getByRole('region', { name: year + ' calendar', exact: true })
  const yearCount = (year: number) => yearRow(year).locator('.year-count')
  const toolbar = page.getByRole('group', { name: 'Calendar toolbar' })
  assert.equal(await page.getByLabel('Year', { exact: true }).count(), 0)
  assert.deepEqual(await toolbar.locator(':scope > button, .toolbar-appearance > button, .theme-trigger').evaluateAll((controls) =>
    controls.map((control) => control.getAttribute('aria-label') ?? control.textContent?.trim())),
  ['Clear canvas', 'Undo', 'Redo', 'Palette', 'Download Script', 'Theme', 'Help'])
  assert.equal(await toolbar.evaluate((element) => {
    const { x, width } = element.getBoundingClientRect()
    return Math.abs(x + width / 2 - innerWidth / 2) < 2
  }), true)
  const themePicker = toolbar.getByRole('button', { name: 'Theme', exact: true })
  const themeMenu = page.getByRole('dialog', { name: 'Site themes', exact: true })
  async function chooseTheme(name: string) {
    if (!await themeMenu.isVisible()) await themePicker.click()
    await themeMenu.getByRole('button', { name, exact: true }).click()
  }
  await themePicker.click()
  await themeMenu.waitFor()
  assert.equal(await themeMenu.getByRole('button', { name: 'System', exact: true }).getAttribute('aria-pressed'), 'true')
  assert.equal(await themeMenu.getByRole('button', { name: 'Light', exact: true }).count(), 0)
  assert.equal(await themeMenu.getByRole('button', { name: 'Dark', exact: true }).count(), 0)
  await page.keyboard.press('Escape')
  await themeMenu.waitFor({ state: 'hidden' })
  assert.equal(await viewport.evaluate((element) =>
    element.parentElement?.classList.contains('workspace') &&
    getComputedStyle(element).borderTopWidth === '0px' &&
    getComputedStyle(element.parentElement).borderTopWidth === '1px'), true)
  const profileLink = page.getByRole('link', { name: '@wahab-2007', exact: true })
  assert.equal(await profileLink.getAttribute('href'), 'https://github.com/wahab-2007')
  assert.equal(await profileLink.evaluate((element) => getComputedStyle(element).color), 'rgb(9, 105, 218)')
  const actionColor = (label: string) => toolbar.getByRole('button', { name: label, exact: true }).evaluate((button) =>
    getComputedStyle(button).backgroundColor)
  assert.equal(await actionColor('Clear canvas'), 'rgb(178, 34, 52)')
  assert.equal(await actionColor('Undo'), await actionColor('Help'))
  assert.equal(await actionColor('Redo'), await actionColor('Help'))
  assert.equal(await actionColor('Download Script'), await actionColor('Help'))
  assert.equal(await page.getByText('Less', { exact: true }).count(), 0)
  assert.equal(await page.getByText('More', { exact: true }).count(), 0)
  await cell(firstDay, 2024).waitFor()
  assert.equal(await yearCount(2026).textContent(), '0')
  assert.equal(await yearCount(2025).textContent(), '0')
  assert.equal(await yearCount(2024).textContent(), '0')
  const yearButtonBox = await yearRow(2026).getByRole('button', { name: '2026', exact: true }).boundingBox()
  const counterBox = await yearCount(2026).boundingBox()
  assert.ok(yearButtonBox && counterBox && counterBox.y > yearButtonBox.y + yearButtonBox.height)

  assert.equal(await viewport.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return [...element.querySelectorAll('section')].slice(0, 3).every((row) => {
      const panel = row.getBoundingClientRect()
      return panel.top >= bounds.top && panel.bottom <= bounds.bottom
    })
  }), true)
  await toolbar.getByRole('button', { name: 'Help', exact: true }).click()
  const help = page.getByRole('dialog', { name: 'Calendar help', exact: true })
  await help.getByText(/Scroll inside the calendar/).waitFor()
  assert.match(await help.getByRole('link', { name: 'Read the tutorial' }).getAttribute('href') ?? '', /#tutorial$/)
  await page.keyboard.press('Escape')
  await help.waitFor({ state: 'hidden' })
  assert.equal(await page.locator('.palette-preview').count(), 1)
  const tile = await cell(firstDay).boundingBox()
  assert.ok(tile && Math.abs(tile.width - 16.2) < 0.05 && tile.height === tile.width)
  for (const label of ['Tools', 'Presets', 'Normal', 'Expanded', 'Odd months', 'Copy Python', 'Import canvas', 'Export canvas']) {
    assert.equal(await page.getByRole('button', { name: label, exact: true }).count(), 0)
  }
  assert.equal(await page.getByText('Palette', { exact: true }).count(), 0)

  await page.evaluate(() => {
    const create = AudioContext.prototype.createOscillator
    AudioContext.prototype.createOscillator = function (this: AudioContext) {
      const data = document.documentElement.dataset
      data.audioCues = String(Number(data.audioCues ?? 0) + 1)
      const oscillator = create.call(this)
      const record = oscillator.frequency.setValueAtTime.bind(oscillator.frequency)
      oscillator.frequency.setValueAtTime = (value, time) => {
        if (value === 360 || value === 305) {
          const data = document.documentElement.dataset
          const key = value === 360 ? 'addCues' : 'removeCues'
          data[key] = String(Number(data[key] ?? 0) + 1)
        }
        return record(value, time)
      }
      return oscillator
    }
  })
  await cell(lastDay).click()
  assert.equal(await count(lastDay), initial + 1)
  await cell(lastDay).click({ button: 'right' })
  assert.equal(await count(lastDay), initial)
  await page.waitForFunction(() => document.documentElement.dataset.addCues && document.documentElement.dataset.removeCues)

  const audioCount = await page.locator('html').getAttribute('data-audio-cues')
  await cell(firstDay).hover()
  await cell(lastDay).hover()
  await page.waitForTimeout(70)
  assert.equal(await page.locator('html').getAttribute('data-audio-cues'), audioCount)

  const days = [firstDay, 'January 5', 'January 6']
  async function drag(button: 'left' | 'right') {
    await cell(firstDay).hover()
    await page.mouse.down({ button })
    for (const day of days.slice(1)) await cell(day).hover()
    await page.mouse.up({ button })
  }
  await drag('left')
  assert.deepEqual(await Promise.all(days.map((day) => count(day))), [1, 1, 1])
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  assert.deepEqual(await Promise.all(days.map((day) => count(day))), [0, 0, 0])
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await drag('right')
  assert.deepEqual(await Promise.all(days.map((day) => count(day))), [0, 0, 0])

  await cell(firstDay).hover()
  await page.mouse.down()
  await page.waitForTimeout(900)
  await page.mouse.up()
  const heldCount = await count(firstDay)
  assert.ok(heldCount >= 4)
  await page.waitForTimeout(330)
  assert.equal(await count(firstDay), heldCount)
  await page.mouse.down({ button: 'right' })
  await page.waitForTimeout(1350)
  await page.mouse.up({ button: 'right' })
  assert.equal(await count(firstDay), 0)
  await cell(firstDay).click({ button: 'right' })
  assert.equal(await count(firstDay), 0)

  await cell(lastDay).focus()
  await page.keyboard.press('Enter')
  assert.equal(await count(lastDay), initial + 1)
  await page.keyboard.press('-')
  assert.equal(await count(lastDay), initial)
  await page.keyboard.press('+')
  assert.equal(await count(lastDay), initial + 1)

  async function choosePalette(label: string, name: string) {
    await page.getByRole('button', { name: label, exact: true }).click()
    await page.getByRole('dialog', { name: label + ' choices' }).getByRole('button', { name, exact: true }).click()
  }
  await choosePalette('Palette', 'Rainbow')
  const paintColor = () => cell(firstDay).evaluate((element) => getComputedStyle(element).backgroundColor)
  assert.equal(await paintColor(), 'rgb(239, 242, 245)')
  await cell(firstDay).click()
  assert.equal(await paintColor(), 'rgb(219, 48, 71)')
  await cell(firstDay).click()
  assert.equal(await paintColor(), 'rgb(227, 106, 22)')
  await toolbar.getByRole('button', { name: 'Undo', exact: true }).click()
  await toolbar.getByRole('button', { name: 'Undo', exact: true }).click()
  assert.equal(await count(firstDay), 0)
  await choosePalette('Palette', 'Plum')
  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ mode: 'dark', theme: 'plum' })),
    'brush-io:appearance:v1')
  await page.reload()
  await cell(lastDay).waitFor()
  assert.equal(await count(lastDay), initial + 1)
  assert.equal(await themePicker.getAttribute('data-theme'), 'true-dark')
  assert.equal(await page.locator('html').getAttribute('data-scheme'), 'dark')
  assert.equal(await page.getByRole('button', { name: 'Palette', exact: true }).getAttribute('data-palette'), 'plum')

  const annualTotal = '1'
  assert.equal(await yearCount(2026).textContent(), annualTotal)
  assert.equal(await yearRow(2026).locator('.cell-readout').count(), 0)
  const background = (date: string) => cell(date).evaluate((element) => getComputedStyle(element).backgroundColor)
  const counterColor = () => yearCount(2026).evaluate((element) => getComputedStyle(element).backgroundColor)
  await cell(lastDay).hover()
  assert.equal(await yearCount(2026).textContent(), String(initial + 1))
  assert.equal(await counterColor(), await background(lastDay))
  await cell(firstDay).hover()
  assert.equal(await yearCount(2026).textContent(), '0')
  assert.equal(await counterColor(), await background(firstDay))
  assert.equal(await yearCount(2025).textContent(), '0')
  await page.mouse.move(1, 1)
  assert.equal(await yearCount(2026).textContent(), annualTotal)
  const [script] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download Script', exact: true }).click(),
  ])
  assert.equal(script.suggestedFilename(), 'github_contributions.py')
  const python = await readFile(await script.path(), 'utf8')
  assert.match(python, /PLAN = \[\["2026-11-19",1\]\]/)

  assert.equal(await page.locator('.notice:visible').count(), 0)

  const clear = page.getByRole('button', { name: 'Clear canvas', exact: true })
  assert.equal(await clear.textContent(), '')
  assert.equal(await clear.evaluate((button) => {
    const { width, height } = button.getBoundingClientRect()
    return width === height && getComputedStyle(button).borderRadius === '50%'
  }), true)
  await clear.click()
  assert.equal(await yearRow(2026).locator('button.cell').evaluateAll((cells) => cells.every((cell) =>
    cell.getAttribute('aria-label')?.startsWith('0 '))), true)
  assert.equal(await page.locator('.notice:visible').count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Download Script', exact: true }).isDisabled(), true)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  assert.equal(await count(lastDay), initial + 1)

  await page.setViewportSize({ width: 1211, height: 800 })
  await viewport.evaluate((element) => {
    element.scrollTop = element.firstElementChild!.getBoundingClientRect().height
  })
  const previousYear = yearRow(2025).getByRole('button', { name: '2025', exact: true })
  await page.locator('.year-marker[aria-pressed="true"]').filter({ hasText: '2025' }).waitFor()
  assert.equal(await previousYear.getAttribute('aria-pressed'), 'true')
  await cell(firstDay, 2025).click()
  assert.equal(await count(firstDay, 2025), 1)
  await page.mouse.move(1, 1)
  assert.equal(await yearCount(2025).textContent(), '1')
  assert.equal(await yearCount(2026).textContent(), annualTotal)
  assert.equal(await count(lastDay, 2026), initial + 1)
  const [previousScript] = await Promise.all([
    page.waitForEvent('download'),
    toolbar.getByRole('button', { name: 'Download Script', exact: true }).click(),
  ])
  assert.match(await readFile(await previousScript.path(), 'utf8'), /PLAN = \[\["2025-01-04",1\]\]/)
  await viewport.evaluate((element) => { element.scrollTop = 0 })
  await page.locator('.year-marker[aria-pressed="true"]').filter({ hasText: '2026' }).waitFor()

  await chooseTheme('Disco')
  await page.waitForFunction(() => (document.querySelector('audio')?.currentTime ?? 0) > 0)
  await themePicker.click()
  await themeMenu.getByRole('button', { name: 'Disco music' }).waitFor()
  await chooseTheme('True Dark')
  assert.equal(await page.locator('audio').evaluate((audio) => (audio as HTMLAudioElement).paused), true)
  await page.setViewportSize({ width: 1200, height: 440 })
  await page.evaluate(() => window.scrollTo(0, 260))
  await page.waitForFunction(() => scrollY > 0 && Math.abs(
    (document.querySelector('.toolbar-wrap')?.getBoundingClientRect().top ?? 0) - 12) < 1)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.setViewportSize({ width: 375, height: 750 })
  const helpBox = await toolbar.getByRole('button', { name: 'Help', exact: true }).boundingBox()
  const themeBox = await themePicker.boundingBox()
  assert.ok(helpBox && themeBox && themeBox.x < helpBox.x && Math.abs(helpBox.y - themeBox.y) < 2)
  for (const year of [2026, 2025, 2024]) {
    assert.equal(await yearRow(year).locator('.graph-scroll').evaluate((node) => {
      const plot = node.querySelector('.plot')!
      return getComputedStyle(node).overflowX === 'clip' &&
        plot.getBoundingClientRect().right <= node.getBoundingClientRect().right &&
        node.scrollWidth <= node.clientWidth + 1
    }), true)
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  assert.ok(requests.every((url) => url.startsWith(origin) || url.startsWith('blob:')))
  assert.deepEqual(failed, [])
})
