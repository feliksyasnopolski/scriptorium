import { expect, test } from '@playwright/test'

declare global {
  interface Window { setMockSystemDark: (dark: boolean) => void }
}

function credentials() {
  return { username: `theme-${Date.now()}-${Math.random().toString(16).slice(2)}`, password: 'password123' }
}

async function mockSystemTheme(page: import('@playwright/test').Page, dark = false) {
  await page.addInitScript((initialDark) => {
    let isDark = initialDark
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    const query = {
      get matches() { return isDark }, media: '(prefers-color-scheme: dark)', onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => true,
    } as unknown as MediaQueryList
    window.matchMedia = () => query
    Object.defineProperty(window, 'setMockSystemDark', { value: (next: boolean) => {
      isDark = next
      listeners.forEach((listener) => listener({ matches: next, media: query.media } as MediaQueryListEvent))
    } })
  }, dark)
}

async function signup(page: import('@playwright/test').Page) {
  const account = credentials()
  await page.goto('/')
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Username').fill(account.username)
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(account.password)
  await page.getByLabel('Confirm password').fill(account.password)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
}

test('defaults to System and follows a changing system preference', async ({ page }) => {
  await mockSystemTheme(page)
  await signup(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByLabel('Theme')).toHaveValue('system')

  await page.evaluate(() => window.setMockSystemDark(true))
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('selects light or dark locally and preserves the choice through reload', async ({ page }) => {
  await mockSystemTheme(page, true)
  await signup(page)

  await page.getByLabel('Theme').selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.getByLabel('Theme').selectOption('light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('theme selection does not change the authenticated project state', async ({ page }) => {
  await mockSystemTheme(page)
  await signup(page)
  const title = `Theme project ${Date.now()}`
  await page.getByLabel('New project title').fill(title)
  await page.getByRole('button', { name: '+ New project' }).click()
  await expect(page.getByLabel('Project title')).toHaveValue(title)
  await page.getByLabel('Theme').selectOption('dark')
  await page.reload()
  await expect(page.getByLabel('Project title')).toHaveValue(title)
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
})
