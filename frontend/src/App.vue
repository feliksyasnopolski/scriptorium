<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { DOCUMENT_SCHEMA_VERSION, plannedDurationSeconds, type ProjectDocument } from './types'
import { useProjectsStore } from './stores/projects'
import { formatDuration } from './utils/duration'

const store = useProjectsStore()
const routeProjectId = ref<string | null>(null)
const newTitle = ref('')
const currentProject = computed(() => routeProjectId.value ? store.projects.find((project) => project.id === routeProjectId.value) : null)
const sidebarOpen = ref(false)
const activeItem = ref('')
type DragItem = { kind: 'section' | 'subsection'; id: string; sectionId?: string }
type DropTarget = { kind: 'section' | 'subsection'; sectionId?: string; index: number }
const dragItem = ref<DragItem | null>(null)
const dropTarget = ref<DropTarget | null>(null)
let observer: IntersectionObserver | undefined

onMounted(async () => {
  observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) activeItem.value = entry.target.id.replace(/^editor-(section|subsection)-/, '') }), { rootMargin: '-15% 0px -65% 0px' })
  await store.loadProjects()
  const id = new URLSearchParams(window.location.search).get('project')
  if (id) await openProject(id)
})
onUnmounted(() => observer?.disconnect())

async function createProject() { const project = await store.createProject(newTitle.value || 'Untitled project'); newTitle.value = ''; await openProject(project.id) }
async function openProject(id: string) { routeProjectId.value = id; history.replaceState({}, '', `?project=${id}`); await store.openProject(id) }
function goHome() { routeProjectId.value = null; history.replaceState({}, '', window.location.pathname) }
function conflictProject() { return routeProjectId.value ? store.conflicts[routeProjectId.value] : undefined }
function editorId(kind: 'section' | 'subsection', id: string) { return 'editor-' + kind + '-' + id }
function focusEditor(kind: 'section' | 'subsection', id: string) {
  const element = document.getElementById(editorId(kind, id))
  if (element) {
    const header = document.querySelector('.topbar')?.getBoundingClientRect().height ?? 0
    window.scrollTo({ top: Math.max(0, window.scrollY + element.getBoundingClientRect().top - header - 16), behavior: 'smooth' })
    element.querySelector('input')?.focus({ preventScroll: true })
  }
  activeItem.value = id
  sidebarOpen.value = false
}
function readDragItem(event: DragEvent): DragItem | null {
  const raw = event.dataTransfer?.getData('application/x-scriptorium-item')
  if (!raw) return dragItem.value
  try { return JSON.parse(raw) as DragItem } catch { return null }
}
function startDrag(event: DragEvent, kind: 'section' | 'subsection', id: string, sectionId?: string) {
  dragItem.value = { kind, id, sectionId }
  dropTarget.value = null
  event.dataTransfer?.setData('application/x-scriptorium-item', JSON.stringify(dragItem.value))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
function endDrag() { dragItem.value = null; dropTarget.value = null }
function setDropTarget(event: DragEvent, targetKind: 'section' | 'subsection', targetId: string, targetSectionId?: string) {
  const source = readDragItem(event)
  const project = currentProject.value
  if (!source || !project) return
  if (targetKind === 'section') {
    const sectionIndex = project.sections.findIndex((section) => section.id === targetId)
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const index = sectionIndex + (event.clientY > rect.top + rect.height / 2 ? 1 : 0)
    if (source.kind === 'section' && source.id !== targetId && sectionIndex >= 0) dropTarget.value = { kind: 'section', index }
    else if (source.kind === 'subsection' && source.sectionId && sectionIndex >= 0) dropTarget.value = { kind: 'subsection', sectionId: targetId, index: project.sections[sectionIndex].subsections.length }
    return
  }
  if (source.kind !== 'subsection' || !targetSectionId || source.id === targetId) return
  const section = project.sections.find((item) => item.id === targetSectionId)
  const subsectionIndex = section?.subsections.findIndex((item) => item.id === targetId) ?? -1
  if (!section || subsectionIndex < 0) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  dropTarget.value = { kind: 'subsection', sectionId: targetSectionId, index: subsectionIndex + (event.clientY > rect.top + rect.height / 2 ? 1 : 0) }
}
function setSectionEndTarget(event: DragEvent, sectionId: string) {
  const source = readDragItem(event)
  const section = currentProject.value?.sections.find((item) => item.id === sectionId)
  if (source?.kind === 'subsection' && source.sectionId && section) dropTarget.value = { kind: 'subsection', sectionId, index: section.subsections.length }
}
function dropItem(event: DragEvent, ..._ignored: unknown[]) {
  event.preventDefault()
  const source = readDragItem(event)
  const target = dropTarget.value
  const project = currentProject.value
  if (!source || !target || !project) return
  if (source.kind === 'section' && target.kind === 'section') store.reorderSection(project.id, source.id, target.index)
  else if (source.kind === 'subsection' && target.kind === 'subsection' && source.sectionId && target.sectionId) store.moveSubsectionTo(project.id, source.sectionId, source.id, target.sectionId, target.index)
  endDrag()
}
function dropIntoSection(event: DragEvent, sectionId: string) {
  event.preventDefault()
  const source = readDragItem(event)
  const target = dropTarget.value
  const project = currentProject.value
  if (source?.kind === 'subsection' && source.sectionId && target?.kind === 'subsection' && project) store.moveSubsectionTo(project.id, source.sectionId, source.id, sectionId, target.index)
  endDrag()
}
function safeName(title: string) { return (title.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase() || 'scriptorium-project').slice(0, 80) }
function download(content: string, extension: string, type: string) { const blob = new Blob([content], { type }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = safeName(currentProject.value?.title ?? '') + '.' + extension; link.click(); URL.revokeObjectURL(link.href) }
function exportJson() { if (!currentProject.value) return; const document: ProjectDocument = { schema_version: DOCUMENT_SCHEMA_VERSION, revision: currentProject.value.revision, project: currentProject.value }; download(JSON.stringify(document, null, 2), 'json', 'application/json') }
function exportMarkdown() { const project = currentProject.value; if (!project) return; const lines = ['# ' + project.title, '', ...(project.target_duration_seconds == null ? [] : ['Target duration: ' + formatDuration(project.target_duration_seconds), '']), ...project.sections.flatMap((section) => ['## ' + section.title, '', ...section.subsections.flatMap((subsection) => ['### ' + (subsection.title || 'Untitled subsection'), '', 'Viewer sees:', subsection.viewer_sees || '—', '', 'Explanation / intent:', subsection.explanation_notes || '—', '', 'Script:', subsection.script || '—', ...(subsection.estimated_seconds == null ? [] : ['', 'Estimated duration: ' + formatDuration(subsection.estimated_seconds)]), ''])])]; download(lines.join('\n'), 'md', 'text/markdown') }
function observeEditor(element: unknown) { if (element instanceof Element) nextTick(() => observer?.observe(element)) }
</script>

<template>
  <main class="app-shell">
    <header class="topbar"><button class="wordmark" type="button" @click="goHome">Scriptorium</button><span v-if="currentProject" class="save-state">{{ store.saveStateLabel }}</span></header>
    <section v-if="!currentProject" class="page-content">
      <div class="page-heading"><div><p class="eyebrow">Your scripts</p><h1>Projects</h1></div><div class="new-project-form"><input v-model="newTitle" aria-label="New project title" placeholder="New project title" @keyup.enter="createProject" /><button class="primary-button" type="button" @click="createProject">+ New project</button></div></div>
      <p v-if="store.error" class="error-message">{{ store.error }}</p>
      <div class="project-grid">
        <article v-for="project in store.projects" :key="project.id" data-testid="project-card" class="project-card" @click="openProject(project.id)"><button class="card-delete" type="button" aria-label="Delete project" @click.stop="store.deleteProject(project.id)">×</button><p class="eyebrow">Video project</p><h2>{{ project.title }}</h2><div class="timing-row"><span v-if="project.target_duration_seconds != null">Target {{ formatDuration(project.target_duration_seconds) }}</span><span>Planned {{ formatDuration(plannedDurationSeconds(project)) }}</span></div></article>
        <button class="empty-card" type="button" @click="createProject">+</button>
      </div>
    </section>
    <section v-else class="page-content editor-page">
      <button class="sidebar-toggle" type="button" @click="sidebarOpen = !sidebarOpen">Structure</button>
      <aside class="script-tree" :class="{ 'is-open': sidebarOpen }"><div class="tree-heading"><span>Structure</span><button class="sidebar-close" type="button" aria-label="Close structure" @click="sidebarOpen = false">×</button></div><nav aria-label="Script structure"><div v-for="(section, sectionIndex) in currentProject.sections" :key="section.id" class="tree-section"><div v-if="dropTarget?.kind === 'section' && dropTarget.index === sectionIndex" class="tree-insertion-marker" data-testid="section-insertion-marker" aria-label="Section insertion position"></div><div class="tree-row" :class="{ active: activeItem === section.id, 'drag-source': dragItem?.id === section.id }" draggable="true" @dragstart="startDrag($event, 'section', section.id)" @dragend="endDrag" @dragover.prevent="setDropTarget($event, 'section', section.id)" @drop="dropItem($event, 'section', section.id)"><span class="drag-handle" aria-hidden="true">⠿</span><button class="tree-label" type="button" @click="focusEditor('section', section.id)">{{ section.title || 'Untitled section' }}</button></div><div v-for="(subsection, subsectionIndex) in section.subsections" :key="subsection.id"><div v-if="dropTarget?.kind === 'subsection' && dropTarget.sectionId === section.id && dropTarget.index === subsectionIndex" class="tree-insertion-marker subsection-insertion-marker" data-testid="subsection-insertion-marker" aria-label="Subsection insertion position"></div><div class="tree-row subsection-row" :class="{ active: activeItem === subsection.id, 'drag-source': dragItem?.id === subsection.id }" draggable="true" @dragstart="startDrag($event, 'subsection', subsection.id, section.id)" @dragend="endDrag" @dragover.prevent="setDropTarget($event, 'subsection', subsection.id, section.id)" @drop="dropItem($event, 'subsection', subsection.id, section.id)"><span class="drag-handle" aria-hidden="true">⠿</span><button class="tree-label" type="button" @click="focusEditor('subsection', subsection.id)">{{ subsection.title || 'Untitled subsection' }}</button></div></div><div class="tree-section-drop" :class="{ 'is-drop-target': dropTarget?.kind === 'subsection' && dropTarget.sectionId === section.id && dropTarget.index === section.subsections.length }" @dragover.prevent="setSectionEndTarget($event, section.id)" @drop="dropIntoSection($event, section.id)"><div v-if="dropTarget?.kind === 'subsection' && dropTarget.sectionId === section.id && dropTarget.index === section.subsections.length" class="tree-insertion-marker subsection-insertion-marker" data-testid="subsection-insertion-marker" aria-label="Subsection insertion position"></div></div></div><div v-if="dropTarget?.kind === 'section' && dropTarget.index === currentProject.sections.length" class="tree-insertion-marker" data-testid="section-insertion-marker" aria-label="Section insertion position"></div></nav></aside>
      <div class="editor-heading"><button class="back-button" type="button" @click="goHome">← Projects</button><div class="project-fields"><input class="project-title" :value="currentProject.title" aria-label="Project title" @input="store.updateProjectField(currentProject.id, 'title', ($event.target as HTMLInputElement).value)" /><label>Target duration <input type="number" min="0" :value="currentProject.target_duration_seconds ?? ''" @input="store.updateProjectField(currentProject.id, 'target_duration_seconds', ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))" /> seconds</label></div><div class="timing-block"><span v-if="currentProject.target_duration_seconds != null">Target: {{ formatDuration(currentProject.target_duration_seconds) }}</span><span>Planned: {{ formatDuration(plannedDurationSeconds(currentProject)) }}</span></div></div>
      <div class="export-actions"><button type="button" @click="exportJson">Export JSON</button><button type="button" @click="exportMarkdown">Export Markdown</button></div>
      <div v-for="section in currentProject.sections" :key="section.id" :id="editorId('section', section.id)" :ref="observeEditor" data-testid="section-card" class="section-card">
        <div class="section-heading"><input class="section-title" :value="section.title" aria-label="Section title" @input="store.updateSectionField(currentProject.id, section.id, ($event.target as HTMLInputElement).value)" /><div class="controls"><button class="danger-button" type="button" @click="store.deleteSection(currentProject.id, section.id)">Delete section</button></div></div>
        <div class="subsections"><article v-for="subsection in section.subsections" :key="subsection.id" :id="editorId('subsection', subsection.id)" :ref="observeEditor" data-testid="subsection-card" class="subsection-card"><div class="subsection-heading"><input :value="subsection.title ?? ''" placeholder="Subsection title (optional)" @input="store.updateSubsectionField(currentProject.id, section.id, subsection.id, 'title', ($event.target as HTMLInputElement).value)" /><div class="controls"><button class="danger-button" type="button" @click="store.deleteSubsection(currentProject.id, section.id, subsection.id)">Delete</button></div></div><div class="notes-grid"><label>Viewer sees<textarea :value="subsection.viewer_sees" @input="store.updateSubsectionField(currentProject.id, section.id, subsection.id, 'viewer_sees', ($event.target as HTMLTextAreaElement).value)" /></label><label>Explanation / intent<textarea :value="subsection.explanation_notes" @input="store.updateSubsectionField(currentProject.id, section.id, subsection.id, 'explanation_notes', ($event.target as HTMLTextAreaElement).value)" /></label></div><label class="script-label">Script<textarea class="script-input" :value="subsection.script" @input="store.updateSubsectionField(currentProject.id, section.id, subsection.id, 'script', ($event.target as HTMLTextAreaElement).value)" /></label><label class="estimate-label">Estimated seconds <input type="number" min="0" :value="subsection.estimated_seconds ?? ''" @input="store.updateSubsectionField(currentProject.id, section.id, subsection.id, 'estimated_seconds', ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))" /></label></article></div><button class="add-button" type="button" @click="store.addSubsection(currentProject.id, section.id)">+ Add subsection</button>
      </div>
      <button class="add-section" type="button" @click="store.addSection(currentProject.id)">+ Add section</button>
    </section>
    <div v-if="conflictProject()" class="dialog-backdrop" role="presentation"><div class="conflict-dialog" role="dialog" aria-modal="true" aria-labelledby="conflict-title"><h2 id="conflict-title">This project changed online</h2><p>Choose which copy should become authoritative. Scriptorium will not merge them automatically.</p><div class="dialog-actions"><button type="button" @click="store.loadOnline(currentProject!.id)">Load online copy</button><button class="primary-button" type="button" @click="store.overwriteOnline(currentProject!.id)">Overwrite online with my copy</button></div></div></div>
  </main>
</template>
