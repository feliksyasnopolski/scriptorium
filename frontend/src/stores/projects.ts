import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { DOCUMENT_SCHEMA_VERSION, type Project, type ProjectDocument } from '../types'

type ProjectField = 'title' | 'target_duration_seconds'
type SubsectionField = 'title' | 'viewer_sees' | 'explanation_notes' | 'script' | 'estimated_seconds'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { headers: { 'Content-Type': 'application/json' }, ...options })
  const body = response.status === 204 ? undefined : await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(Object.values(body?.errors ?? {}).flat().join(', ') || body?.error || 'Request failed') as Error & { status?: number }
    error.status = response.status
    throw error
  }
  return body as T
}

function newId() { return crypto.randomUUID() }

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([]); const error = ref(''); const saving = ref(0); const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const saveStateLabel = computed(() => saving.value ? 'Saving…' : error.value ? 'Error saving' : 'Saved')
  function replaceProject(project: Project) { const index = projects.value.findIndex((item) => item.id === project.id); if (index >= 0) projects.value[index] = project; else projects.value.push(project) }
  async function loadProjects() { projects.value = await request<Project[]>('/projects') }
  function replaceDocument(document: ProjectDocument) { document.project.revision = document.revision; replaceProject(document.project); return document.project }
  async function openProject(id: string) { replaceDocument(await request<ProjectDocument>(`/projects/${id}/document`)) }
  async function createProject(title: string) { const document = await request<ProjectDocument>('/projects', { method: 'POST', body: JSON.stringify({ project: { title } }) }); return replaceDocument(document) }
  async function deleteProject(id: string) { if (!window.confirm('Delete this project?')) return; await request(`/projects/${id}`, { method: 'DELETE' }); projects.value = projects.value.filter((project) => project.id !== id) }
  function schedule(project: Project) {
    if (timers.has(project.id)) clearTimeout(timers.get(project.id));
    timers.set(project.id, setTimeout(async () => { saving.value++; error.value = ''; try { const document: ProjectDocument = { schema_version: DOCUMENT_SCHEMA_VERSION, revision: project.revision, project }; replaceDocument(await request<ProjectDocument>(`/projects/${project.id}/document`, { method: 'PUT', body: JSON.stringify(document) })) } catch (reason) { error.value = reason instanceof Error && (reason as Error & { status?: number }).status === 409 ? 'Conflict: reload to continue' : reason instanceof Error ? reason.message : 'Request failed' } finally { saving.value--; timers.delete(project.id) } }, 650))
  }
  function projectFor(id: string) { return projects.value.find((project) => project.id === id) }
  function updateProjectField(id: string, field: ProjectField, value: string | number | null) { const project = projectFor(id); if (!project) return; project[field] = value as never; schedule(project) }
  function updateSectionField(projectId: string, sectionId: string, title: string) { const project = projectFor(projectId); const section = project?.sections.find((item) => item.id === sectionId); if (!project || !section) return; section.title = title; schedule(project) }
  function updateSubsectionField(projectId: string, sectionId: string, subsectionId: string, field: SubsectionField, value: string | number | null) { const project = projectFor(projectId); const subsection = project?.sections.find((item) => item.id === sectionId)?.subsections.find((item) => item.id === subsectionId); if (!project || !subsection) return; subsection[field] = value as never; schedule(project) }
  function addSection(projectId: string) { const project = projectFor(projectId); if (!project) return; project.sections.push({ id: newId(), title: 'New section', subsections: [] }); schedule(project) }
  function deleteSection(projectId: string, sectionId: string) { const project = projectFor(projectId); if (!project || !window.confirm('Delete this section and its subsections?')) return; project.sections = project.sections.filter((section) => section.id !== sectionId); schedule(project) }
  function moveSection(projectId: string, sectionId: string, direction: 'up' | 'down') { const project = projectFor(projectId); if (!project) return; const index = project.sections.findIndex((section) => section.id === sectionId); const next = index + (direction === 'up' ? -1 : 1); if (index < 0 || next < 0 || next >= project.sections.length) return; const [section] = project.sections.splice(index, 1); project.sections.splice(next, 0, section); schedule(project) }
  function addSubsection(projectId: string, sectionId: string) { const project = projectFor(projectId); const section = project?.sections.find((item) => item.id === sectionId); if (!project || !section) return; section.subsections.push({ id: newId(), title: null, viewer_sees: '', explanation_notes: '', script: '', estimated_seconds: null }); schedule(project) }
  function deleteSubsection(projectId: string, sectionId: string, subsectionId: string) { const project = projectFor(projectId); const section = project?.sections.find((item) => item.id === sectionId); if (!project || !section || !window.confirm('Delete this subsection?')) return; section.subsections = section.subsections.filter((subsection) => subsection.id !== subsectionId); schedule(project) }
  function moveSubsection(projectId: string, sectionId: string, subsectionId: string, direction: 'up' | 'down') { const project = projectFor(projectId); const section = project?.sections.find((item) => item.id === sectionId); if (!project || !section) return; const index = section.subsections.findIndex((subsection) => subsection.id === subsectionId); const next = index + (direction === 'up' ? -1 : 1); if (index < 0 || next < 0 || next >= section.subsections.length) return; const [subsection] = section.subsections.splice(index, 1); section.subsections.splice(next, 0, subsection); schedule(project) }
  return { projects, error, saveStateLabel, loadProjects, openProject, createProject, deleteProject, updateProjectField, updateSectionField, updateSubsectionField, addSection, deleteSection, moveSection, addSubsection, deleteSubsection, moveSubsection }
})
