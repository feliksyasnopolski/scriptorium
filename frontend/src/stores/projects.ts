import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { DOCUMENT_SCHEMA_VERSION, parseProjectDocument, type Project, type ProjectDocument } from '../types'
import { apiRequest as request, openScriptoriumDb, type RequestError } from '../services/api'
import { useAuthStore } from './auth'

type ProjectField = 'title' | 'target_duration_seconds'
type SubsectionField = 'title' | 'viewer_sees' | 'explanation_notes' | 'script' | 'estimated_seconds'
export type SyncState = 'synced' | 'dirty' | 'syncing' | 'conflict' | 'error' | 'offline'
type LocalRecord = { document: ProjectDocument; state: SyncState; localOnly?: boolean; error?: string }
const STORE_NAME = 'projects'; const timers = new Map<string, ReturnType<typeof setTimeout>>(); const writes = new Map<string, Promise<void>>(); const syncing = new Set<string>(); const syncDone = new Map<string, Promise<void>>(); const resolveSyncDone = new Map<string, () => void>()
function newId() { return crypto.randomUUID() }
function uniqueId(candidate: string, used: Set<string>) { if (!used.has(candidate)) { used.add(candidate); return candidate }; let generated = newId(); while (used.has(generated)) generated = newId(); used.add(generated); return generated }
function userId() { const id = useAuthStore().user?.id; if (!id) throw new Error('Authentication required'); return String(id) }
function key(id: string) { return `${userId()}:${id}` }
async function localRecords(owner = userId()): Promise<LocalRecord[]> { const d = await openScriptoriumDb(); return new Promise((resolve, reject) => { const r = d.transaction(STORE_NAME).objectStore(STORE_NAME).getAll(); r.onsuccess = () => resolve((r.result as (LocalRecord & { user_id?: string })[]).filter((record) => record.user_id === owner)); r.onerror = () => reject(r.error) }) }
async function localPut(record: LocalRecord) { const d = await openScriptoriumDb(); const owned = { ...record, user_id: userId() }; return new Promise<void>((resolve, reject) => { const r = d.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(owned, key(record.document.project.id)); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error) }) }
async function localGet(id: string): Promise<LocalRecord | undefined> { const d = await openScriptoriumDb(); return new Promise((resolve, reject) => { const r = d.transaction(STORE_NAME).objectStore(STORE_NAME).get(key(id)); r.onsuccess = () => resolve(r.result as LocalRecord | undefined); r.onerror = () => reject(r.error) }) }
async function localDelete(id: string) { const d = await openScriptoriumDb(); return new Promise<void>((resolve, reject) => { const r = d.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(key(id)); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error) }) }

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([]); const error = ref(''); const states = ref<Record<string, SyncState>>({}); const conflicts = ref<Record<string, ProjectDocument>>({}); const activeId = ref<string | null>(null); let loadGeneration = 0
  const saveStateLabel = computed(() => { const state = activeId.value ? states.value[activeId.value] : undefined; return state === 'offline' ? 'Saved locally' : state === 'syncing' ? 'Syncing…' : state === 'dirty' ? 'Saved locally' : state === 'conflict' ? 'Conflict' : state === 'error' ? 'Sync error' : 'Synced' })
  function replaceProject(project: Project) { const index = projects.value.findIndex((item) => item.id === project.id); if (index >= 0) projects.value[index] = project; else projects.value.push(project) }
  function setRecord(record: LocalRecord) { record.document.project.revision = record.document.revision; replaceProject(record.document.project); states.value[record.document.project.id] = record.state }
  async function loadProjects() {
    const generation = ++loadGeneration
    const expectedUser = useAuthStore().user?.id
    const current = () => generation === loadGeneration && useAuthStore().user?.id === expectedUser
    try {
      const remote = await request<Project[]>('/projects')
      if (!current()) return
      const records = await localRecords(String(expectedUser))
      if (!current()) return
      const byId = new Map(records.map((r) => [r.document.project.id, r])); projects.value = remote.map((p) => byId.get(p.id)?.document.project ?? p)
      records.forEach((r) => { if (!remote.some((p) => p.id === r.document.project.id) || r.state !== 'synced') setRecord(r) })
      if (current()) await syncDirty()
    } catch {
      if (!current()) return
      try { (await localRecords(String(expectedUser))).forEach(setRecord); if (!projects.value.length) error.value = 'No projects are available offline' } catch { if (current()) error.value = 'Unable to load projects' }
    }
  }
  async function persist(project: Project, state: SyncState, localOnly = false) { const copy = JSON.parse(JSON.stringify(project)) as Project; const record: LocalRecord = { document: { schema_version: DOCUMENT_SCHEMA_VERSION, revision: copy.revision, project: copy }, state, localOnly }; await localPut(record); setRecord(record) }
  async function openProject(id: string, loadRemote = true) { activeId.value = id; if (!loadRemote) return; const cached = await localGet(id).catch(() => undefined); if (cached) setRecord(cached); if (!cached || cached.state === 'synced') { try { const document = await request<ProjectDocument>(`/projects/${id}/document`); await localPut({ document, state: 'synced' }); setRecord({ document, state: 'synced' }) } catch { if (!cached) error.value = 'Project is unavailable offline' } }; await syncProject(id) }
  async function createProject(title: string) { const project: Project = { id: newId(), title, target_duration_seconds: null, sections: [], revision: 0 }; if (!navigator.onLine) { await persist(project, 'offline', true); return project }; try { const document = await request<ProjectDocument>('/projects', { method: 'POST', body: JSON.stringify({ project: { title, id: project.id } }) }); await localPut({ document, state: 'synced' }); setRecord({ document, state: 'synced' }); return document.project } catch { await persist(project, 'offline', true); return project } }
  async function importProject(raw: unknown, replaceId?: string) {
    const imported = parseProjectDocument(raw)
    const current = replaceId ? projectFor(replaceId) : undefined
    if (replaceId && !current) throw new Error('The current project is no longer available')
    const projectIds = new Set(projects.value.filter((project) => project.id !== replaceId).map((project) => project.id))
    const sectionIds = new Set(projects.value.filter((project) => project.id !== replaceId).flatMap((project) => project.sections.map((section) => section.id)))
    const subsectionIds = new Set(projects.value.filter((project) => project.id !== replaceId).flatMap((project) => project.sections.flatMap((section) => section.subsections.map((subsection) => subsection.id))))
    const projectId = replaceId ?? uniqueId(imported.project.id, projectIds)
    const sections = imported.project.sections.map((section) => ({ ...section, id: uniqueId(section.id, sectionIds), subsections: section.subsections.map((subsection) => ({ ...subsection, id: uniqueId(subsection.id, subsectionIds) })) }))
    const project: Project = { id: projectId, title: imported.project.title, target_duration_seconds: imported.project.target_duration_seconds, sections, revision: current?.revision ?? 0 }
    const localOnly = !replaceId
    await persist(project, navigator.onLine ? 'dirty' : 'offline', localOnly)
    if (navigator.onLine) await syncProject(project.id)
    return project
  }
  async function deleteProject(id: string) { if (!window.confirm('Delete this project?')) return; if (!navigator.onLine) { error.value = 'Project deletion requires a connection'; return }; await request(`/projects/${id}`, { method: 'DELETE' }); await localDelete(id); projects.value = projects.value.filter((p) => p.id !== id) }
  async function syncProject(id: string, force = false) {
    if (syncing.has(id)) return
    syncing.add(id)
    syncDone.set(id, new Promise((resolve) => resolveSyncDone.set(id, resolve)))
    try { await writes.get(id)?.catch(() => undefined); const record = await localGet(id).catch(() => undefined); if (!record || (record.state === 'synced' && !force)) return; const sentDocument = JSON.stringify(record.document); record.state = 'syncing'; await localPut(record); setRecord(record); try { if (!navigator.onLine && !force) { record.state = 'offline'; await localPut(record); setRecord(record); return } const localOnly = record.localOnly === true; const path = localOnly ? '/projects' : `/projects/${id}/document${force ? '?force=true' : ''}`; const body = localOnly ? { project: record.document.project } : record.document; const accepted = await request<ProjectDocument>(path, { method: localOnly ? 'POST' : 'PUT', body: JSON.stringify(body) }); const latest = await localGet(id).catch(() => undefined); if (latest && JSON.stringify(latest.document) !== sentDocument) { latest.state = navigator.onLine ? 'dirty' : 'offline'; await localPut(latest); setRecord(latest); return } await localPut({ document: accepted, state: 'synced' }); setRecord({ document: accepted, state: 'synced' }); delete conflicts.value[id]; error.value = '' } catch (reason) { const issue = reason as RequestError; const latest = await localGet(id).catch(() => undefined) ?? record; if (issue.status === 409 && issue.document) { conflicts.value[id] = issue.document; latest.state = 'conflict' } else { latest.state = navigator.onLine ? 'error' : 'offline'; error.value = issue.message }; await localPut(latest); setRecord(latest) } } finally { syncing.delete(id); resolveSyncDone.get(id)?.(); resolveSyncDone.delete(id); syncDone.delete(id); const latest = await localGet(id).catch(() => undefined); if (latest && latest.state === 'dirty') setTimeout(() => void syncProject(id), 0) }
  }
  async function syncDirty() { for (const record of await localRecords().catch(() => [])) if (record.state !== 'synced') await syncProject(record.document.project.id) }
  function schedule(project: Project) { const id = project.id; if (timers.has(id)) clearTimeout(timers.get(id)); const copy = JSON.parse(JSON.stringify(project)) as Project; const immediate: LocalRecord = { document: { schema_version: DOCUMENT_SCHEMA_VERSION, revision: copy.revision, project: copy }, state: navigator.onLine ? 'dirty' : 'offline' }; void localPut(immediate).then(() => setRecord(immediate)); const previous = writes.get(id) ?? Promise.resolve(); const write = previous.catch(() => undefined).then(async () => { const record = await localGet(id); const state = navigator.onLine ? 'dirty' : 'offline'; const saved: LocalRecord = { document: { schema_version: DOCUMENT_SCHEMA_VERSION, revision: copy.revision, project: copy }, state, localOnly: record?.localOnly === true }; await localPut(saved); setRecord(saved) }); writes.set(id, write); void write.catch((reason) => { error.value = reason instanceof Error ? reason.message : 'Local save failed' }); timers.set(id, setTimeout(() => { timers.delete(id); void syncProject(id) }, 650)) }
  function projectFor(id: string) { return projects.value.find((p) => p.id === id) }
  function updateProjectField(id: string, field: ProjectField, value: string | number | null) { const p = projectFor(id); if (!p) return; p[field] = value as never; schedule(p) }
  function updateSectionField(id: string, sectionId: string, title: string) { const p = projectFor(id); const s = p?.sections.find((x) => x.id === sectionId); if (!p || !s) return; s.title = title; schedule(p) }
  function updateSubsectionField(id: string, sectionId: string, subsectionId: string, field: SubsectionField, value: string | number | null) { const p = projectFor(id); const s = p?.sections.find((x) => x.id === sectionId)?.subsections.find((x) => x.id === subsectionId); if (!p || !s) return; s[field] = value as never; schedule(p) }
  function addSection(id: string) { const p = projectFor(id); if (!p) return; p.sections.push({ id: newId(), title: 'New section', subsections: [] }); schedule(p) }
  function deleteSection(id: string, sectionId: string) { const p = projectFor(id); if (!p || !window.confirm('Delete this section and its subsections?')) return; p.sections = p.sections.filter((s) => s.id !== sectionId); schedule(p) }
  function moveSection(id: string, sectionId: string, direction: 'up' | 'down') { const p = projectFor(id); if (!p) return; const i = p.sections.findIndex((s) => s.id === sectionId); const n = i + (direction === 'up' ? -1 : 1); if (i < 0 || n < 0 || n >= p.sections.length) return; const [s] = p.sections.splice(i, 1); p.sections.splice(n, 0, s); schedule(p) }
  function reorderSection(id: string, sectionId: string, targetIndex: number) { const p = projectFor(id); if (!p) return; const from = p.sections.findIndex((s) => s.id === sectionId); if (from < 0) return; const [section] = p.sections.splice(from, 1); const index = Math.max(0, Math.min(targetIndex, p.sections.length)); p.sections.splice(index, 0, section); schedule(p) }
  function addSubsection(id: string, sectionId: string) { const p = projectFor(id); const s = p?.sections.find((x) => x.id === sectionId); if (!p || !s) return; s.subsections.push({ id: newId(), title: null, viewer_sees: '', explanation_notes: '', script: '', estimated_seconds: null }); schedule(p) }
  function deleteSubsection(id: string, sectionId: string, subsectionId: string) { const p = projectFor(id); const s = p?.sections.find((x) => x.id === sectionId); if (!p || !s || !window.confirm('Delete this subsection?')) return; s.subsections = s.subsections.filter((x) => x.id !== subsectionId); schedule(p) }
  function moveSubsection(id: string, sectionId: string, subsectionId: string, direction: 'up' | 'down') { const p = projectFor(id); const s = p?.sections.find((x) => x.id === sectionId); if (!p || !s) return; const i = s.subsections.findIndex((x) => x.id === subsectionId); const n = i + (direction === 'up' ? -1 : 1); if (i < 0 || n < 0 || n >= s.subsections.length) return; const [sub] = s.subsections.splice(i, 1); s.subsections.splice(n, 0, sub); schedule(p) }
  function moveSubsectionTo(id: string, sourceSectionId: string, subsectionId: string, targetSectionId: string, targetIndex: number) { const p = projectFor(id); const source = p?.sections.find((section) => section.id === sourceSectionId); const target = p?.sections.find((section) => section.id === targetSectionId); if (!p || !source || !target) return; const sourceIndex = source.subsections.findIndex((subsection) => subsection.id === subsectionId); if (sourceIndex < 0) return; const [subsection] = source.subsections.splice(sourceIndex, 1); const index = Math.max(0, Math.min(targetIndex, target.subsections.length)); target.subsections.splice(index, 0, subsection); schedule(p) }
  async function loadOnline(id: string) { const document = await request<ProjectDocument>(`/projects/${id}/document`); await localPut({ document, state: 'synced' }); setRecord({ document, state: 'synced' }); delete conflicts.value[id] }
  async function overwriteOnline(id: string) { await syncDone.get(id); await syncProject(id, true) }
  function clear() { loadGeneration++; projects.value = []; activeId.value = null; error.value = ''; states.value = {}; conflicts.value = {} }
  window.addEventListener('online', () => void syncDirty()); window.addEventListener('offline', () => Object.keys(states.value).forEach((id) => { if (states.value[id] !== 'synced') states.value[id] = 'offline' }))
  return { projects, error, conflicts, saveStateLabel, loadProjects, openProject, createProject, importProject, deleteProject, updateProjectField, updateSectionField, updateSubsectionField, addSection, deleteSection, moveSection, reorderSection, addSubsection, deleteSubsection, moveSubsection, moveSubsectionTo, loadOnline, overwriteOnline, clear }
})
