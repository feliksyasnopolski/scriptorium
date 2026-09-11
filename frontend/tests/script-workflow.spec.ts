import { expect, test } from '@playwright/test'

test('author can create, edit, reorder, reload, and delete a project', async ({ page, request }) => {
  const title = `Browser acceptance ${Date.now()}`
  let projectId: number | undefined
  const subsectionPatch = () => page.waitForResponse((response) => response.url().includes('/subsections/') && response.request().method() === 'PATCH')
  const projectPatch = (field: string) => page.waitForResponse((response) => response.url().includes('/api/v1/projects/') && response.request().method() === 'PATCH' && response.request().postData()?.includes(field))

  try {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
    const createResponse = page.waitForResponse((response) => response.url().endsWith('/api/v1/projects') && response.request().method() === 'POST')
    await page.getByLabel('New project title').fill(title)
    await page.getByRole('button', { name: '+ New project' }).click()
    projectId = (await (await createResponse).json()).id
    await expect(page.getByLabel('Project title')).toHaveValue(title)

    const projectTitle = page.getByLabel('Project title')
    let saved = projectPatch('title'); await projectTitle.fill('A Weekend in the Mountains'); await saved
    const target = page.getByLabel('Target duration')
    saved = projectPatch('target_duration_seconds'); await target.fill('900'); await saved

    await page.getByRole('button', { name: '+ Add section' }).click()
    const sections = page.getByTestId('section-card')
    await expect(sections).toHaveCount(1)
    saved = projectPatch('title'); await sections.nth(0).getByLabel('Section title').fill('Opening: the question'); await saved
    await page.getByRole('button', { name: '+ Add section' }).click()
    await expect(sections).toHaveCount(2)
    saved = projectPatch('title'); await sections.nth(1).getByLabel('Section title').fill('The practical answer'); await saved
    await sections.nth(1).getByRole('button', { name: 'Move section up' }).click()
    await expect(sections.nth(0).getByLabel('Section title')).toHaveValue('The practical answer')
    await expect(sections.nth(1).getByLabel('Section title')).toHaveValue('Opening: the question')

    const opening = sections.nth(1)
    await opening.getByRole('button', { name: '+ Add subsection' }).click()
    await opening.getByRole('button', { name: '+ Add subsection' }).click()
    const subsections = opening.getByTestId('subsection-card')
    await expect(subsections).toHaveCount(2)
    let subsectionSaved = subsectionPatch(); await subsections.nth(0).getByPlaceholder('Subsection title (optional)').fill('Set the scene'); await subsectionSaved
    subsectionSaved = subsectionPatch(); await subsections.nth(1).getByPlaceholder('Subsection title (optional)').fill('Make the case'); await subsectionSaved

    const firstSubsection = subsections.nth(0)
    subsectionSaved = subsectionPatch(); await firstSubsection.getByLabel('Viewer sees').fill('A quiet trail, a packed notebook, and the first light over the ridge.'); await subsectionSaved
    subsectionSaved = subsectionPatch(); await firstSubsection.getByLabel('Explanation / intent').fill('Establish why this story matters before introducing the route.'); await subsectionSaved
    subsectionSaved = subsectionPatch(); await firstSubsection.getByLabel('Script').fill('The best ideas usually arrive before the day gets noisy.'); await subsectionSaved
    subsectionSaved = subsectionPatch(); await firstSubsection.getByLabel('Estimated seconds').fill('120'); await subsectionSaved
    await expect(page.getByText('Planned: 2:00')).toBeVisible()

    await subsections.nth(1).getByRole('button', { name: 'Move subsection up' }).click()
    await expect(opening.getByTestId('subsection-card').nth(0).getByPlaceholder('Subsection title (optional)')).toHaveValue('Make the case')
    await expect(opening.getByTestId('subsection-card').nth(1).getByPlaceholder('Subsection title (optional)')).toHaveValue('Set the scene')

    await page.reload()
    await expect(page.getByLabel('Project title')).toHaveValue('A Weekend in the Mountains')
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
    await expect(editedSubsection.getByLabel('Script')).toHaveValue('The best ideas usually arrive before the day gets noisy.')
    await expect(editedSubsection.getByLabel('Estimated seconds')).toHaveValue('120')
    await expect(page.getByText('Planned: 2:00')).toBeVisible()

    await page.getByRole('button', { name: '← Projects' }).click()
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
    const card = page.getByTestId('project-card').filter({ hasText: 'A Weekend in the Mountains' })
    await expect(card).toBeVisible()
    page.once('dialog', (dialog) => dialog.accept())
    await card.getByRole('button', { name: 'Delete project' }).click()
    await expect(card).toHaveCount(0)
    projectId = undefined
  } finally {
    if (projectId) await request.delete(`/api/v1/projects/${projectId}`)
  }
})
