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
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
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
  const toolbar = page.getByRole('group', { name: 'Calendar toolbar' })
  assert.equal(await page.getByLabel('Year', { exact: true }).count(), 0)
  assert.deepEqual(await toolbar.locator(':scope > button, :scope > .theme-controls select').evaluateAll((controls) =>
    controls.map((control) => control.getAttribute('aria-label') ?? control.textContent?.trim())),
  ['Undo', 'Redo', 'Clear canvas', 'Palette', 'Download Script', 'Help', 'Site theme'])
  assert.equal(await toolbar.evaluate((element) => {
    const { x, width } = element.getBoundingClientRect()
    return Math.abs(x + width / 2 - innerWidth / 2) < 2
  }), true)
  assert.equal(await toolbar.getByLabel('Site theme').evaluate((element) => element.getBoundingClientRect().width), 104)
  assert.equal(await page.getByText('Less', { exact: true }).count(), 0)
  assert.equal(await page.getByText('More', { exact: true }).count(), 0)
  await cell(firstDay, 2025).waitFor()
  assert.equal(await viewport.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return [...element.querySelectorAll('section')].slice(0, 2).every((row) => {
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
  assert.equal(tile?.width, 18)
  assert.equal(tile?.height, 18)
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
  await choosePalette('Palette', 'Plum')
  const appearance = page.getByLabel('Site theme', { exact: true })
  await appearance.selectOption('true-dark')
  await page.reload()
  await cell(lastDay).waitFor()
  assert.equal(await count(lastDay), initial + 1)
  assert.equal(await appearance.inputValue(), 'true-dark')
  assert.equal(await page.locator('html').getAttribute('data-scheme'), 'dark')
  assert.equal(await page.getByRole('button', { name: 'Palette', exact: true }).getAttribute('data-palette'), 'plum')

  await cell(lastDay).hover()
  const readout = yearRow(2026).locator('.cell-readout')
  assert.match(await readout.innerText(), /November 19, 2026/)
  const cellColor = await cell(lastDay).evaluate((element) => getComputedStyle(element).backgroundColor)
  assert.equal(await readout.locator('.readout-number').evaluate((element) => getComputedStyle(element).color), cellColor)
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

  await viewport.evaluate((element) => {
    element.scrollTop = element.firstElementChild!.getBoundingClientRect().height
  })
  const previousYear = yearRow(2025).getByRole('button', { name: '2025', exact: true })
  await page.locator('.year-marker[aria-pressed="true"]').filter({ hasText: '2025' }).waitFor()
  assert.equal(await previousYear.getAttribute('aria-pressed'), 'true')
  await cell(firstDay, 2025).click()
  assert.equal(await count(firstDay, 2025), 1)
  assert.equal(await count(lastDay, 2026), initial + 1)
  const [previousScript] = await Promise.all([
    page.waitForEvent('download'),
    toolbar.getByRole('button', { name: 'Download Script', exact: true }).click(),
  ])
  assert.match(await readFile(await previousScript.path(), 'utf8'), /PLAN = \[\["2025-01-04",1\]\]/)
  await viewport.evaluate((element) => { element.scrollTop = 0 })
  await page.locator('.year-marker[aria-pressed="true"]').filter({ hasText: '2026' }).waitFor()

  await appearance.selectOption('disco')
  await page.getByRole('button', { name: 'Disco music' }).waitFor()
  await page.waitForFunction(() => (document.querySelector('audio')?.currentTime ?? 0) > 0)
  await appearance.selectOption('true-dark')
  assert.equal(await page.locator('audio').evaluate((audio) => (audio as HTMLAudioElement).paused), true)
  await page.setViewportSize({ width: 375, height: 750 })
  assert.equal(await yearRow(2026).locator('.graph-scroll').evaluate((node) => node.scrollWidth > node.clientWidth), true)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  assert.ok(requests.every((url) => url.startsWith(origin) || url.startsWith('blob:')))
  assert.deepEqual(failed, [])
})
