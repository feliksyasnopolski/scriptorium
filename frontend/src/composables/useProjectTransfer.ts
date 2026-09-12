import { ref, type ComputedRef } from 'vue'
import { DOCUMENT_SCHEMA_VERSION, type Project, type ProjectDocument } from '../types'
import { formatDuration } from '../utils/duration'
import { useProjectsStore } from '../stores/projects'

export function useProjectTransfer(currentProject: ComputedRef<Project | null>, openProject?: (id: string) => Promise<void>) {
  const store = useProjectsStore()
  const importInput = ref<HTMLInputElement | null>(null)
  const importMode = ref<'global' | 'replace'>('global')
  const importError = ref('')

  function safeName(title: string) { return (title.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase() || 'scriptorium-project').slice(0, 80) }
  function download(content: string, extension: string, type: string) {
    const blob = new Blob([content], { type })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${safeName(currentProject.value?.title ?? '')}.${extension}`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  function exportJson() {
    if (!currentProject.value) return
    const document: ProjectDocument = { schema_version: DOCUMENT_SCHEMA_VERSION, revision: currentProject.value.revision, project: currentProject.value }
    download(JSON.stringify(document, null, 2), 'json', 'application/json')
  }
  function exportMarkdown() {
    const project = currentProject.value
    if (!project) return
    const lines = ['# ' + project.title, '', ...(project.target_duration_seconds == null ? [] : ['Target duration: ' + formatDuration(project.target_duration_seconds), '']), ...project.sections.flatMap((section) => ['## ' + section.title, '', ...section.subsections.flatMap((subsection) => ['### ' + (subsection.title || 'Untitled subsection'), '', 'Viewer sees:', subsection.viewer_sees || '—', '', 'Explanation / intent:', subsection.explanation_notes || '—', '', 'Script:', subsection.script || '—', ...(subsection.estimated_seconds == null ? [] : ['', 'Estimated duration: ' + formatDuration(subsection.estimated_seconds)]), ''])])]
    download(lines.join('\n'), 'md', 'text/markdown')
  }
  function chooseImport(mode: 'global' | 'replace') { importMode.value = mode; importError.value = ''; importInput.value?.click() }
  async function importJson(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    try {
      if (importMode.value === 'replace' && !window.confirm('Replace this project completely with the imported document?')) return
      const imported = JSON.parse(await file.text())
      const project = await store.importProject(imported, importMode.value === 'replace' ? currentProject.value?.id : undefined)
      importError.value = ''
      if (importMode.value === 'global') await openProject?.(project.id)
    } catch (error) { importError.value = error instanceof Error ? error.message : 'Unable to import JSON' }
  }

  function setImportInput(element: unknown) { importInput.value = element instanceof HTMLInputElement ? element : null }

  return { importError, exportJson, exportMarkdown, chooseImport, importJson, setImportInput }
}
