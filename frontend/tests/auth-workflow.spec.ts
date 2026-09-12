import { expect, test } from '@playwright/test'

function credentials(label: string) {
  return { username: `auth-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`, password: 'password123' }
}

async function signup(page: import('@playwright/test').Page, credentials: { username: string; password: string }) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Username').fill(credentials.username)
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(credentials.password)
  await page.getByLabel('Confirm password').fill(credentials.password)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
}

test('requires an account, preserves login through refresh, and logs out', async ({ page }) => {
  const account = credentials('gate')
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
  await signup(page, account)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
})

test('logs back in and never exposes another account local project', async ({ page }) => {
  const first = credentials('first')
  const second = credentials('second')
  await signup(page, first)
  const privateTitle = `Private project ${Date.now()}`
  await page.getByLabel('New project title').fill(privateTitle)
  await page.getByRole('button', { name: '+ New project' }).click()
  await expect(page.getByLabel('Project title')).toHaveValue(privateTitle)
  await page.getByRole('button', { name: 'Log out' }).click()
  await signup(page, second)
  await expect(page.getByText(privateTitle)).toHaveCount(0)
  await page.getByRole('button', { name: 'Log out' }).click()
  await page.getByLabel('Username').fill(first.username)
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(first.password)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByText(privateTitle)).toBeVisible()
})
