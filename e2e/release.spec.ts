import { expect, test } from '@playwright/test'

const browserErrors: string[] = []
const browserRequestFailures: string[] = []

test.beforeEach(async ({ page }) => {
  browserErrors.length = 0
  browserRequestFailures.length = 0
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  page.on('pageerror', (error) => browserErrors.push(error.message))
  page.on('requestfailed', (request) => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') {
      browserRequestFailures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`)
    }
  })
})

test.afterEach(async () => {
  expect(browserErrors, `Unexpected browser errors:\n${browserErrors.join('\n')}`).toEqual([])
  expect(browserRequestFailures, `Unexpected failed requests:\n${browserRequestFailures.join('\n')}`).toEqual([])
})

const routes = [
  ['/', 'Know your numbers.'],
  ['/calculators/sensitivity', 'Mouse sensitivity converter'],
  ['/calculators/edpi', 'eDPI calculator'],
  ['/calculators/dpi', 'DPI conversion'],
  ['/calculators/fov', 'FOV calculator'],
  ['/calculators/monitor', 'Monitor calculator'],
  ['/calculators/performance', 'PC performance context'],
  ['/tools/sensitivity-lab', 'Aim trainer'],
  ['/learn', 'Learn the numbers'],
  ['/favorites', 'Favorites'],
  ['/recent', 'Recent calculations'],
  ['/setups', 'My setups'],
] as const

test('direct-loads every major route with a primary heading', async ({ page }) => {
  for (const [path, heading] of routes) {
    const response = await page.goto(path)
    expect(response?.ok(), `Route ${path} should load`).toBeTruthy()
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${path} should not overflow horizontally`).toBe(true)
  }
})

test('interactive controls have accessible names across core routes', async ({ page }) => {
  for (const [path] of routes) {
    await page.goto(path)
    const unlabeled = await page.evaluate(() => {
      const unlabeledFields = [...document.querySelectorAll('input, select, textarea')]
        .filter((element) => !(element as HTMLInputElement).labels?.length && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby'))
        .map((element) => `${element.tagName}.${element.className}`)
      const unnamedButtons = [...document.querySelectorAll('button')]
        .filter((button) => !button.getAttribute('aria-label') && !button.innerText.trim() && !button.title)
        .map((button) => `${button.tagName}.${button.className}`)
      return { unlabeledFields, unnamedButtons }
    })
    expect(unlabeled, `Accessible controls on ${path}`).toEqual({ unlabeledFields: [], unnamedButtons: [] })
  }
})

test('homepage navigation, favorites, search ranking, keyboard, theme and empty search', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Know your numbers. Master your setup.' })).toBeVisible()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.locator('.settings-grid')).toContainText('2')
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Add eDPI Calculator to favorites' }).click()
  await expect(page.getByRole('button', { name: 'Remove eDPI Calculator from favorites' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('link', { name: /Favorites/ }).click()
  await expect(page.locator('.compact-row').filter({ hasText: 'eDPI Calculator' })).toBeVisible()
  await page.getByRole('button', { name: 'Search GameMetric' }).click()
  const search = page.getByRole('textbox', { name: 'Search calculators, games, guides...' })
  await search.fill('edpi')
  await expect(page.getByRole('option').first()).toContainText('eDPI Calculator')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/calculators\/edpi/)
  await page.getByRole('button', { name: 'Search GameMetric' }).click()
  await page.getByRole('textbox', { name: 'Search calculators, games, guides...' }).fill('zz-no-such-tool')
  await expect(page.getByText('No matching calculators, games or guides.')).toBeVisible()
  await expect(page.getByText('Suggestions')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const toggle = page.getByRole('button', { name: /Switch to (light|dark) theme/ })
  const previousName = await toggle.getAttribute('aria-label')
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', previousName?.includes('light') ? 'light' : 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', previousName?.includes('light') ? 'light' : 'dark')
  await page.getByRole('link', { name: /Favorites/ }).click()
  await page.getByRole('button', { name: 'Remove' }).first().click()
  await expect(page.locator('.compact-row').filter({ hasText: 'eDPI Calculator' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('Save a calculator or game to access it quickly.').first()).toBeVisible()
})

test('sensitivity URL restores state, match modes change output, copy/share and PNG work', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const url = '/calculators/sensitivity?from=cs2&to=valorant&dpi=800&sens=1.2&mode=360-distance'
  await page.goto(url)
  await expect(page.getByRole('spinbutton', { name: 'Sensitivity' })).toHaveValue('1.2')
  await expect(page.getByRole('spinbutton', { name: 'DPI' })).toHaveValue('800')
  await expect(page.getByRole('button', { name: '360° Distance' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Partially verified')).toBeVisible()
  await expect(page.locator('.data-status')).toHaveAttribute('title', /project assumption/)
  await expect(page.getByText('How was this calculated?')).toBeVisible()
  const baseline = await page.locator('.result-number').innerText()
  await page.getByRole('button', { name: 'Monitor Distance' }).click()
  const monitorValue = await page.locator('.result-number').innerText()
  expect(monitorValue).not.toBe(baseline)
  await page.getByLabel('Match movement over this monitor distance').selectOption('75')
  const customValue = await page.locator('.result-number').innerText()
  expect(customValue).not.toBe(monitorValue)
  await expect(page).toHaveURL(/mode=monitor-distance/)
  await page.reload()
  await expect(page.getByLabel('Match movement over this monitor distance')).toHaveValue('75')
  await page.getByRole('button', { name: 'Custom', exact: true }).click()
  await page.getByLabel('Custom monitor-distance match (%)').selectOption('100')
  await expect(page.getByRole('button', { name: 'Custom', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.result-number')).not.toHaveText(monitorValue)
  await page.getByLabel('Copy format').selectOption('simple')
  await page.getByRole('button', { name: 'Copy', exact: true }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('Counter-Strike 2')
  await page.getByRole('button', { name: 'Share URL' }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('mode=custom')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export PNG' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('gamemetric-sensitivity.png')
})

test('Web Share receives the reproducible calculator URL when available', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (payload: ShareData) => { (window as Window & { __sharedPayload?: ShareData }).__sharedPayload = payload },
    })
  })
  await page.goto('/calculators/sensitivity?from=cs2&to=valorant&dpi=800&sens=1.2&mode=360-distance')
  await page.getByRole('button', { name: 'Share URL' }).click()
  const payload = await page.evaluate(() => (window as Window & { __sharedPayload?: ShareData }).__sharedPayload)
  expect(payload?.url).toContain('from=cs2')
  expect(payload?.url).toContain('mode=360-distance')
  expect(payload?.title).toContain('GameMetric')
})

test('favorites persist, recent calculations reopen and can be deleted', async ({ page }) => {
  await page.goto('/calculators/sensitivity?from=cs2&to=valorant&dpi=800&sens=1.2&mode=360-distance')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Saved to recent')
  await page.getByRole('link', { name: /Favorites/ }).click()
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Mouse Sensitivity to favorites' }).click()
  await page.getByRole('link', { name: /Favorites/ }).click()
  await expect(page.locator('.compact-row').filter({ hasText: 'Mouse Sensitivity' })).toBeVisible()
  await page.reload()
  await expect(page.locator('.compact-row').filter({ hasText: 'Mouse Sensitivity' })).toBeVisible()
  await page.getByRole('link', { name: 'Recent calculations' }).click()
  await expect(page.getByText(/Counter-Strike 2 1.2 sens/)).toBeVisible()
  await page.getByRole('link', { name: 'Open' }).first().click()
  await expect(page.getByRole('spinbutton', { name: 'Sensitivity' })).toHaveValue('1.2')
  await page.getByRole('link', { name: 'Recent calculations' }).click()
  await page.getByRole('button', { name: 'Delete' }).first().click()
  await expect(page.getByText('Your saved calculations will show here. Choose “Save to recent” after a result.')).toBeVisible()
})

test('saved setups create, edit, duplicate, delete, and persist independently', async ({ page }) => {
  await page.goto('/setups')
  await page.getByLabel('Setup name').fill('Release setup')
  await page.getByRole('button', { name: 'Save setup' }).click()
  const original = page.locator('.compact-row').filter({ hasText: 'Release setup' })
  await expect(original).toBeVisible()
  await original.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Mouse DPI').fill('1600')
  const invalidInputs = await page.locator('form').evaluate((form) => [...form.querySelectorAll(':invalid')].map((input) => ({ label: input.getAttribute('aria-label'), value: (input as HTMLInputElement).value, step: (input as HTMLInputElement).step })))
  expect(invalidInputs, `Setup form invalid controls: ${JSON.stringify(invalidInputs)}`).toEqual([])
  await page.getByRole('button', { name: 'Update setup' }).click()
  await expect(page.getByText(/1600 DPI/)).toBeVisible()
  await page.locator('.compact-row').filter({ hasText: 'Release setup' }).getByRole('button', { name: 'Duplicate' }).click()
  const duplicate = page.locator('.compact-row').filter({ hasText: 'Release setup copy' })
  await expect(duplicate).toBeVisible()
  await expect.poll(() => page.evaluate(() => {
    const envelope = JSON.parse(localStorage.getItem('gamemetric.app-state') ?? '{}')
    return new Set((envelope.data?.setups ?? []).map((setup: { id: string }) => setup.id)).size
  })).toBe(2)
  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('.compact-row').first().getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Release setup copy', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Release setup copy', { exact: true })).toBeVisible()
  await expect(page.getByText('Release setup', { exact: true })).toHaveCount(0)
})

test('aim training countdown, hits, save, history and delete', async ({ page }) => {
  await page.goto('/tools/sensitivity-lab')
  await page.getByLabel('Targets to hit').selectOption('10')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByText('3', { exact: true })).toBeVisible()
  for (let hit = 0; hit < 10; hit += 1) {
    await page.getByRole('button', { name: 'Hit target' }).click({ timeout: 8000 })
  }
  await expect(page.getByText('Session complete')).toBeVisible()
  await page.getByRole('button', { name: 'Save result' }).click()
  await expect(page.getByText('Result saved on this device.')).toBeVisible()
  const history = page.locator('.compact-row').filter({ hasText: 'Target Click' })
  await expect(history).toBeVisible()
  await history.getByRole('button', { name: /Delete Target Click session/ }).click()
  await expect(page.getByText('Save an aim session to start building your history.')).toBeVisible()
})

test('monitor metrics and two-display comparison render expected values', async ({ page }) => {
  await page.goto('/calculators/monitor')
  await expect(page.getByText('16:9', { exact: true })).toBeVisible()
  await expect(page.getByText('91.79 PPI')).toBeVisible()
  await expect(page.getByText('0.277 mm')).toBeVisible()
  await expect(page.getByText('4.167 ms')).toBeVisible()
  await expect(page.getByText('1.000 ms')).toBeVisible()
  await page.getByRole('button', { name: 'Add display' }).click()
  await expect(page.getByRole('heading', { name: 'Display B' })).toBeVisible()
  await expect(page.locator('.monitor-panel')).toHaveCount(2)
})

test('corrupt or unavailable localStorage does not prevent the app from loading', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('gamemetric.app-state', '{broken-json'))
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Know your numbers. Master your setup.' })).toBeVisible()
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', { configurable: true, value: () => { throw new DOMException('Storage disabled', 'SecurityError') } })
    Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value: () => { throw new DOMException('Storage disabled', 'SecurityError') } })
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Know your numbers. Master your setup.' })).toBeVisible()
  await page.getByRole('link', { name: 'Open Sensitivity Converter' }).click()
  await expect(page.getByRole('heading', { name: 'Mouse sensitivity converter' })).toBeVisible()
})

test('critical sensitivity flow remains usable at mobile and desktop sizes', async ({ page }) => {
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/calculators/sensitivity?from=cs2&to=valorant&dpi=800&sens=1.2&mode=360-distance')
    await expect(page.locator('.result-number')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  }
})
