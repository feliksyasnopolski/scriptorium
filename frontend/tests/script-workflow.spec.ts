import { expect, test as base, type APIRequestContext } from '@playwright/test'

type AuthContext = { context: APIRequestContext; token: string; user: { id: string; username: string } }
const test = base.extend<{ auth: AuthContext }>({
  auth: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3000' })
    const response = await context.post('/api/v1/auth/signup', { data: { username: `playwright-${Date.now()}-${Math.random().toString(16).slice(2)}`, password: 'password123', password_confirmation: 'password123' } })
    const body = await response.json()
    await context.dispose()
    const authenticatedContext = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3000', extraHTTPHeaders: { Authorization: `Bearer ${body.token}` } })
    await use({ context: authenticatedContext, token: body.token, user: body.user })
    await authenticatedContext.dispose()
  },
  request: async ({ auth }, use) => use(auth.context),
  page: async ({ page, auth }, use) => {
    await page.addInitScript((stored) => {
      const open = indexedDB.open('scriptorium', 2)
      open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains('projects')) open.result.createObjectStore('projects'); if (!open.result.objectStoreNames.contains('auth')) open.result.createObjectStore('auth') }
      open.onsuccess = () => open.result.transaction('auth', 'readwrite').objectStore('auth').put(stored, 'current')
    }, { token: auth.token, user: auth.user })
    await use(page)
  },
})

test('author can create, edit, reorder, reload, and delete a project', async ({ page, request }) => {
  const title = `Browser acceptance ${Date.now()}`
  const editedTitle = `A Weekend in the Mountains ${Date.now()}`
  let projectId: string | undefined
  const documentSave = async () => { await page.waitForTimeout(1500); await expect(page.getByText('Synced')).toBeVisible() }
  const projectPatch = () => documentSave()

  try {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
    const createResponse = page.waitForResponse((response) => response.url().endsWith('/api/v1/projects') && response.request().method() === 'POST')
    await page.getByLabel('New project title').fill(title)
    await page.getByRole('button', { name: '+ New project' }).click()
    projectId = (await (await createResponse).json()).project.id
    await expect(page.getByLabel('Project title')).toHaveValue(title)

    const projectTitle = page.getByLabel('Project title')
    let saved = projectPatch(); await projectTitle.fill(editedTitle); await saved
    const target = page.getByLabel('Target duration')
    saved = projectPatch(); await target.fill('900'); await saved

    await page.getByRole('button', { name: '+ Add section' }).click()
    const sections = page.getByTestId('section-card')
    await expect(sections).toHaveCount(1)
    saved = projectPatch(); await sections.nth(0).getByLabel('Section title').fill('Opening: the question'); await saved
    await page.getByRole('button', { name: '+ Add section' }).click()
    await expect(sections).toHaveCount(2)
    saved = projectPatch(); await sections.nth(1).getByLabel('Section title').fill('The practical answer'); await saved
    await page.locator('.tree-row').filter({ hasText: 'The practical answer' }).dragTo(page.locator('.tree-row').filter({ hasText: 'Opening: the question' }))
    await expect(sections.nth(0).getByLabel('Section title')).toHaveValue('The practical answer')
    await expect(sections.nth(1).getByLabel('Section title')).toHaveValue('Opening: the question')

    const opening = sections.nth(1)
    await opening.getByRole('button', { name: '+ Add subsection' }).click()
    await opening.getByRole('button', { name: '+ Add subsection' }).click()
    const subsections = opening.getByTestId('subsection-card')
    await expect(subsections).toHaveCount(2)
    let subsectionSaved = documentSave(); await subsections.nth(0).getByPlaceholder('Subsection title (optional)').fill('Set the scene'); await subsectionSaved
    subsectionSaved = documentSave(); await subsections.nth(1).getByPlaceholder('Subsection title (optional)').fill('Make the case'); await subsectionSaved

    const firstSubsection = subsections.nth(0)
    subsectionSaved = documentSave(); await firstSubsection.getByLabel('Viewer sees').fill('A quiet trail, a packed notebook, and the first light over the ridge.'); await subsectionSaved
    subsectionSaved = documentSave(); await firstSubsection.getByLabel('Explanation / intent').fill('Establish why this story matters before introducing the route.'); await subsectionSaved
    subsectionSaved = documentSave(); await firstSubsection.getByRole('textbox', { name: 'Script' }).fill('The best ideas usually arrive before the day gets noisy.'); await subsectionSaved
    subsectionSaved = documentSave(); await firstSubsection.getByLabel('Estimated seconds').fill('120'); await subsectionSaved
    await expect(page.getByText('Planned: 2:00')).toBeVisible()

    const reorderSaved = documentSave(); await page.locator('.tree-row').filter({ hasText: 'Make the case' }).dragTo(page.locator('.tree-row').filter({ hasText: 'Set the scene' })); await reorderSaved
    await expect(opening.getByTestId('subsection-card').nth(0).getByPlaceholder('Subsection title (optional)')).toHaveValue('Make the case')
    await expect(opening.getByTestId('subsection-card').nth(1).getByPlaceholder('Subsection title (optional)')).toHaveValue('Set the scene')
    const finalSave = page.waitForResponse((response) => response.url().includes('/document') && response.request().method() === 'PUT' && response.status() === 200)
    await projectTitle.fill(editedTitle)
    await finalSave
    await page.reload()
    await expect(page.getByLabel('Project title')).toHaveValue(editedTitle)
    await expect(page.getByLabel('Target duration')).toHaveValue('900')
    const reloadedSections = page.getByTestId('section-card')
    await expect(reloadedSections.nth(0).getByLabel('Section title')).toHaveValue('The practical answer')
    await expect(reloadedSections.nth(1).getByLabel('Section title')).toHaveValue('Opening: the question')
    const reloadedOpening = reloadedSections.nth(1)
    await expect(reloadedOpening.getByTestId('subsection-card').nth(0).getByPlaceholder('Subsection title (optional)')).toHaveValue('Make the case')
    const editedSubsection = reloadedOpening.getByTestId('subsection-card').nth(1)
    await expect(editedSubsection.getByPlaceholder('Subsection title (optional)')).toHaveValue('Set the scene')
    await expect(editedSubsection.getByLabel('Viewer sees')).toHaveValue('A quiet trail, a packed notebook, and the first light over the ridge.')
    await expect(editedSubsection.getByLabel('Explanation / intent')).toHaveValue('Establish why this story matters before introducing the route.')
    await expect(editedSubsection.getByRole('textbox', { name: 'Script' })).toHaveValue('The best ideas usually arrive before the day gets noisy.')
    await expect(editedSubsection.getByLabel('Estimated seconds')).toHaveValue('120')
    await expect(page.getByText('Planned: 2:00')).toBeVisible()

    await page.getByRole('button', { name: '← Projects' }).click()
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
    const card = page.getByTestId('project-card').filter({ hasText: editedTitle })
    await expect(card).toBeVisible()
    page.once('dialog', (dialog) => dialog.accept())
    await card.getByRole('button', { name: 'Delete project' }).click()
    await expect(card).toHaveCount(0)
    projectId = undefined
  } finally {
    if (projectId) await request.delete(`/api/v1/projects/${projectId}`)
  }
})

test('keeps a synchronized project editable across blocked API traffic and reload', async ({ page, request }) => {
  const title = `Offline acceptance ${Date.now()}`
  let projectId: string | undefined
  try {
    await page.goto('/')
    const createResponse = page.waitForResponse((response) => response.url().endsWith('/api/v1/projects') && response.request().method() === 'POST')
    await page.getByLabel('New project title').fill(title)
    await page.getByRole('button', { name: '+ New project' }).click()
    projectId = (await (await createResponse).json()).project.id
    await expect(page.getByLabel('Project title')).toHaveValue(title)
    await page.route('**/api/**', (route) => route.abort())
    await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, value: false }))

    await page.getByLabel('Project title').fill(`${title} locally`)
    await page.getByRole('button', { name: '+ Add section' }).click()
    await page.getByTestId('section-card').getByLabel('Section title').fill('Offline opening')
    await page.getByTestId('section-card').getByRole('button', { name: '+ Add subsection' }).click()
    await page.getByTestId('subsection-card').getByRole('textbox', { name: 'Script' }).fill('Writing continues without the server.')
    await expect(page.getByText('Saved locally')).toBeVisible()
    await page.waitForTimeout(2500)
    await page.reload()
    await expect(page.getByLabel('Project title')).toHaveValue(`${title} locally`)
    await expect(page.getByLabel('Section title')).toHaveValue('Offline opening')
    await expect(page.getByRole('textbox', { name: 'Script' })).toHaveValue('Writing continues without the server.')

    await page.unroute('**/api/**')
    await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }))
    const synced = page.waitForResponse((response) => response.url().includes('/document') && response.request().method() === 'PUT')
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await synced
    await expect(page.getByText('Synced')).toBeVisible()
    const serverDocument = await (await request.get(`/api/v1/projects/${projectId}/document`)).json()
    expect(serverDocument.project.title).toBe(`${title} locally`)
    expect(serverDocument.project.sections[0].subsections[0].script).toBe('Writing continues without the server.')
  } finally {
    if (projectId) await request.delete(`/api/v1/projects/${projectId}`)
  }
})

test('times a subsection reading and keeps stopwatch state ephemeral', async ({ page, request }) => {
  const title = `Stopwatch acceptance ${Date.now()}`
  let projectId: string | undefined
  try {
    await page.goto('/')
    const createResponse = page.waitForResponse((response) => response.url().endsWith('/api/v1/projects') && response.request().method() === 'POST')
    await page.getByLabel('New project title').fill(title)
    await page.getByRole('button', { name: '+ New project' }).click()
    projectId = (await (await createResponse).json()).project.id
    await page.getByRole('button', { name: '+ Add section' }).click()
    const section = page.getByTestId('section-card')
    await section.getByRole('button', { name: '+ Add subsection' }).click()

    const subsection = page.getByTestId('subsection-card')
    const stopwatch = subsection.getByTestId('stopwatch')
    await expect(stopwatch.getByText('00:00')).toBeVisible()
    await stopwatch.getByRole('button', { name: 'Start' }).click()
    await expect(stopwatch.getByRole('button', { name: 'Stop' })).toBeVisible()
    await page.waitForTimeout(1100)
    await expect(stopwatch.getByText('00:01')).toBeVisible()

    await stopwatch.getByRole('button', { name: 'Stop' }).click()
    await expect(stopwatch.getByRole('button', { name: 'Use as estimate' })).toBeVisible()
    const stoppedDisplay = await stopwatch.locator('.stopwatch-display').textContent()
    await page.waitForTimeout(500)
    await expect(stopwatch.locator('.stopwatch-display')).toHaveText(stoppedDisplay ?? '')

    await stopwatch.getByRole('button', { name: 'Reset' }).click()
    await expect(stopwatch.getByText('00:00')).toBeVisible()
    await expect(stopwatch.getByRole('button', { name: 'Start' })).toBeVisible()

    await stopwatch.getByRole('button', { name: 'Start' }).click()
    await page.waitForTimeout(1100)
    await stopwatch.getByRole('button', { name: 'Stop' }).click()
    await stopwatch.getByRole('button', { name: 'Use as estimate' }).click()
    await expect(subsection.getByLabel('Estimated seconds')).toHaveValue('1')

    await page.waitForTimeout(1000)
    await page.reload()
    const reloadedStopwatch = page.getByTestId('subsection-card').getByTestId('stopwatch')
    await expect(reloadedStopwatch.getByText('00:00')).toBeVisible()
    await expect(reloadedStopwatch.getByRole('button', { name: 'Start' })).toBeVisible()
    await expect(page.getByTestId('subsection-card').getByLabel('Estimated seconds')).toHaveValue('1')
  } finally {
    if (projectId) await request.delete(`/api/v1/projects/${projectId}`)
  }
})

test('offers load-online and overwrite-online choices for a revision conflict', async ({ page, request }) => {
  const title = `Conflict acceptance ${Date.now()}`
  let projectId: string | undefined
  try {
    await page.goto('/')
    const createResponse = page.waitForResponse((response) => response.url().endsWith('/api/v1/projects') && response.request().method() === 'POST')
    await page.getByLabel('New project title').fill(title)
    await page.getByRole('button', { name: '+ New project' }).click()
    projectId = (await (await createResponse).json()).project.id
    await expect(page.getByLabel('Project title')).toHaveValue(title)

    let release!: () => void
    const heldRequest = new Promise<void>((resolve) => { release = resolve })
    await page.route('**/api/**', (route) => route.request().method() === 'PUT' ? heldRequest.then(() => route.continue()) : route.continue())
    await page.getByLabel('Project title').fill('Local copy')
    await page.waitForTimeout(1000)
    const remote = await (await request.get(`/api/v1/projects/${projectId}/document`)).json()
    remote.project.title = 'Online copy'
    await request.put(`/api/v1/projects/${projectId}/document`, { data: remote })
    release()
    await page.getByLabel('Project title').fill('Local copy')
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Load online copy' }).click()
    await expect(page.getByLabel('Project title')).toHaveValue('Online copy')

    await page.unroute('**/api/**')
    let releaseSecond!: () => void
    const heldSecondRequest = new Promise<void>((resolve) => { releaseSecond = resolve })
    await page.route('**/api/**', (route) => route.request().method() === 'PUT' ? heldSecondRequest.then(() => route.continue()) : route.continue())
    await page.getByLabel('Project title').fill('Local winner')
    await page.waitForTimeout(1000)
    const latest = await (await request.get(`/api/v1/projects/${projectId}/document`)).json()
    latest.project.title = 'Another online copy'
    await request.put(`/api/v1/projects/${projectId}/document`, { data: latest })
    releaseSecond()
    await page.getByLabel('Project title').fill('Local winner')
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Overwrite online with my copy' }).click()
    await expect(page.getByText('Synced')).toBeVisible()
    expect((await (await request.get(`/api/v1/projects/${projectId}/document`)).json()).project.title).toBe('Local winner')
    await page.unroute('**/api/**')
  } finally {
    if (projectId) await request.delete(`/api/v1/projects/${projectId}`)
  }
})

test('moves subsections across sections and exports the local document', async ({ page, request }) => {
  const title = `Export acceptance ${Date.now()}`
  let projectId: string | undefined
  try {
    await page.goto('/')
    const createResponse = page.waitForResponse((response) => response.url().endsWith('/api/v1/projects') && response.request().method() === 'POST')
    await page.getByLabel('New project title').fill(title)
    await page.getByRole('button', { name: '+ New project' }).click()
    projectId = (await (await createResponse).json()).project.id
    await page.getByRole('button', { name: '+ Add section' }).click()
    await page.getByTestId('section-card').nth(0).getByLabel('Section title').fill('First section')
    await page.getByRole('button', { name: '+ Add section' }).click()
    await page.getByTestId('section-card').nth(1).getByLabel('Section title').fill('Second section')
    await page.getByTestId('section-card').nth(0).getByRole('button', { name: '+ Add subsection' }).click()
    await page.getByTestId('subsection-card').getByPlaceholder('Subsection title (optional)').fill('Moved subsection')
    await page.locator('.tree-row').filter({ hasText: 'Moved subsection' }).dragTo(page.locator('.tree-row').filter({ hasText: 'Second section' }))
    await expect(page.getByRole('button', { name: 'Moved subsection', exact: true })).toBeVisible()
    await expect(page.getByTestId('section-card').nth(1).getByPlaceholder('Subsection title (optional)')).toHaveValue('Moved subsection')
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export Markdown' }).click()
    expect((await download).suggestedFilename()).toBe(`${title.toLowerCase().replaceAll(' ', '-')}.md`)
    await page.waitForTimeout(1000)
    const server = await (await request.get(`/api/v1/projects/${projectId}/document`)).json()
    expect(server.project.sections[1].subsections[0].title).toBe('Moved subsection')
  } finally {
    if (projectId) await request.delete(`/api/v1/projects/${projectId}`)
  }
})

test('tree navigation reaches the final card position on the first click', async ({ page, request }) => {
  const title = `Navigation acceptance ${Date.now()}`
  let projectId: string | undefined
  try {
    await page.goto('/')
    const createResponse = page.waitForResponse((response) => response.url().endsWith('/api/v1/projects') && response.request().method() === 'POST')
    await page.getByLabel('New project title').fill(title)
    await page.getByRole('button', { name: '+ New project' }).click()
    projectId = (await (await createResponse).json()).project.id

    for (const [index, sectionTitle] of ['Opening', 'Middle', 'Closing'].entries()) {
      await page.getByRole('button', { name: '+ Add section' }).click()
      const section = page.getByTestId('section-card').nth(index)
      await section.getByLabel('Section title').fill(sectionTitle)
      await section.getByRole('button', { name: '+ Add subsection' }).click()
      await section.getByRole('button', { name: '+ Add subsection' }).click()
      await section.getByTestId('subsection-card').nth(0).getByPlaceholder('Subsection title (optional)').fill(`${sectionTitle} first`)
      await section.getByTestId('subsection-card').nth(1).getByPlaceholder('Subsection title (optional)').fill(`${sectionTitle} second`)
    }

    const targetCard = page.getByTestId('subsection-card').nth(3)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.getByRole('button', { name: 'Middle second', exact: true }).click()
    await expect.poll(() => targetCard.evaluate((element) => element.getBoundingClientRect().top)).toBeGreaterThan(68)
    await expect.poll(() => targetCard.evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(125)

    await page.getByRole('button', { name: 'Closing', exact: true }).click()
    await expect.poll(() => page.getByTestId('section-card').nth(2).evaluate((element) => element.getBoundingClientRect().top)).toBeGreaterThan(68)
    await expect.poll(() => page.getByTestId('section-card').nth(2).evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(125)
  } finally {
    if (projectId) await request.delete(`/api/v1/projects/${projectId}`)
  }
})

test('tree drag shows source and exact insertion markers', async ({ page, request }) => {
  const title = `Drag affordance acceptance ${Date.now()}`
  let projectId: string | undefined
  try {
    await page.goto('/')
    const createResponse = page.waitForResponse((response) => response.url().endsWith('/api/v1/projects') && response.request().method() === 'POST')
    await page.getByLabel('New project title').fill(title)
    await page.getByRole('button', { name: '+ New project' }).click()
    projectId = (await (await createResponse).json()).project.id
    await page.getByRole('button', { name: '+ Add section' }).click()
    await page.getByTestId('section-card').nth(0).getByLabel('Section title').fill('First section')
    await page.getByTestId('section-card').nth(0).getByRole('button', { name: '+ Add subsection' }).click()
    await page.getByTestId('section-card').nth(0).getByRole('button', { name: '+ Add subsection' }).click()
    await page.getByTestId('subsection-card').nth(0).getByPlaceholder('Subsection title (optional)').fill('First subsection')
    await page.getByTestId('subsection-card').nth(1).getByPlaceholder('Subsection title (optional)').fill('Second subsection')
    await page.getByRole('button', { name: '+ Add section' }).click()
    await page.getByTestId('section-card').nth(1).getByLabel('Section title').fill('Second section')
    await page.getByTestId('section-card').nth(1).getByRole('button', { name: '+ Add subsection' }).click()
    await page.getByTestId('subsection-card').nth(2).getByPlaceholder('Subsection title (optional)').fill('Destination subsection')

    await page.evaluate(() => {
      const source = [...document.querySelectorAll('.tree-row')].find((row) => row.textContent?.includes('Second subsection')) as HTMLElement
      const destination = [...document.querySelectorAll('.tree-row')].find((row) => row.textContent?.includes('Destination subsection')) as HTMLElement
      const dataTransfer = new DataTransfer()
      dataTransfer.setData('application/x-scriptorium-item', JSON.stringify({ kind: 'subsection', id: source.dataset.id, sectionId: source.dataset.sectionId }))
      source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }))
      destination.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, clientY: destination.getBoundingClientRect().top + 1, dataTransfer }))
    })
    await expect(page.locator('.tree-row.drag-source')).toContainText('Second subsection')
    await expect(page.getByTestId('subsection-insertion-marker')).toHaveCount(1)
    await page.locator('.tree-row').filter({ hasText: 'Destination subsection' }).dispatchEvent('drop')
    await expect(page.locator('.tree-row').filter({ hasText: 'Second subsection' }).locator('xpath=..')).toContainText('Second subsection')
    await expect(page.getByTestId('section-card').nth(1).getByTestId('subsection-card').nth(0).getByPlaceholder('Subsection title (optional)')).toHaveValue('Second subsection')

    await page.evaluate(() => {
      const source = [...document.querySelectorAll('.tree-row')].find((row) => row.textContent?.includes('First section')) as HTMLElement
      const destination = [...document.querySelectorAll('.tree-row')].find((row) => row.textContent?.includes('Second section')) as HTMLElement
      const dataTransfer = new DataTransfer()
      dataTransfer.setData('application/x-scriptorium-item', JSON.stringify({ kind: 'section', id: source.dataset.id }))
      source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }))
      destination.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, clientY: destination.getBoundingClientRect().top + 1, dataTransfer }))
    })
    await expect(page.getByTestId('section-insertion-marker')).toHaveCount(1)
  } finally {
    if (projectId) await request.delete(`/api/v1/projects/${projectId}`)
  }
})

test('imports canonical JSON globally and replaces an existing project in place', async ({ page, request }) => {
  const title = `Import acceptance ${Date.now()}`
  let originalId: string | undefined
  let importedId: string | undefined
  try {
    await page.goto('/')
    const createResponse = page.waitForResponse((response) => response.url().endsWith('/api/v1/projects') && response.request().method() === 'POST')
    await page.getByLabel('New project title').fill(title)
    await page.getByRole('button', { name: '+ New project' }).click()
    originalId = (await (await createResponse).json()).project.id
    await page.getByRole('button', { name: '+ Add section' }).click()
    await page.getByTestId('section-card').getByLabel('Section title').fill('Imported section')
    await page.getByTestId('section-card').getByRole('button', { name: '+ Add subsection' }).click()
    await page.getByTestId('subsection-card').getByPlaceholder('Subsection title (optional)').fill('Imported subsection')
    await page.getByTestId('subsection-card').getByRole('textbox', { name: 'Script' }).fill('Portable script content.')
    await page.getByLabel('Target duration').fill('600')
    await expect(page.getByText('Synced')).toBeVisible()

    const exported = await (await request.get(`/api/v1/projects/${originalId}/document`)).json()
    const input = page.locator('input[type="file"]')
    await page.getByRole('button', { name: '← Projects' }).click()
    await input.setInputFiles({ name: 'project.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) })
    await expect(page.getByLabel('Project title')).toHaveValue(title)
    importedId = new URL(page.url()).searchParams.get('project') ?? undefined
    expect(importedId).toBeTruthy()
    expect(importedId).not.toBe(originalId)
    await expect(page.getByLabel('Section title')).toHaveValue('Imported section')
    await expect(page.getByRole('textbox', { name: 'Script' })).toHaveValue('Portable script content.')
    await expect(page.getByLabel('Target duration')).toHaveValue('600')

    await page.getByLabel('Project title').fill('Changed before replacement')
    await page.waitForTimeout(700)
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Import JSON' }).click()
    await input.setInputFiles({ name: 'project.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) })
    await expect(page.getByLabel('Project title')).toHaveValue(title)
    expect(new URL(page.url()).searchParams.get('project')).toBe(importedId)

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Import JSON' }).click()
    await input.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"schema_version": 99}') })
    await expect(page.locator('.error-message')).toContainText('Unsupported schema version')
    await expect(page.getByLabel('Project title')).toHaveValue(title)
  } finally {
    if (originalId) await request.delete(`/api/v1/projects/${originalId}`)
    if (importedId) await request.delete(`/api/v1/projects/${importedId}`)
  }
})
