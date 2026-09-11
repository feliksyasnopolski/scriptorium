<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { plannedDurationSeconds } from './types'
import { useProjectsStore } from './stores/projects'
import { formatDuration } from './utils/duration'

const store = useProjectsStore()
const routeProjectId = ref<string | null>(null)
const newTitle = ref('')
const currentProject = computed(() => routeProjectId.value ? store.projects.find((project) => project.id === routeProjectId.value) : null)

onMounted(async () => {
  await store.loadProjects()
  const id = new URLSearchParams(window.location.search).get('project')
  if (id) await openProject(id)
})

async function createProject() { const project = await store.createProject(newTitle.value || 'Untitled project'); newTitle.value = ''; await openProject(project.id) }
async function openProject(id: string) { routeProjectId.value = id; history.replaceState({}, '', `?project=${id}`); await store.openProject(id) }
function goHome() { routeProjectId.value = null; history.replaceState({}, '', window.location.pathname) }
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
      <div class="editor-heading"><button class="back-button" type="button" @click="goHome">← Projects</button><div class="project-fields"><input class="project-title" :value="currentProject.title" aria-label="Project title" @input="store.updateProjectField(currentProject.id, 'title', ($event.target as HTMLInputElement).value)" /><label>Target duration <input type="number" min="0" :value="currentProject.target_duration_seconds ?? ''" @input="store.updateProjectField(currentProject.id, 'target_duration_seconds', ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))" /> seconds</label></div><div class="timing-block"><span v-if="currentProject.target_duration_seconds != null">Target: {{ formatDuration(currentProject.target_duration_seconds) }}</span><span>Planned: {{ formatDuration(plannedDurationSeconds(currentProject)) }}</span></div></div>
      <div v-for="(section, sectionIndex) in currentProject.sections" :key="section.id" data-testid="section-card" class="section-card">
        <div class="section-heading"><input class="section-title" :value="section.title" aria-label="Section title" @input="store.updateSectionField(currentProject.id, section.id, ($event.target as HTMLInputElement).value)" /><div class="controls"><button type="button" aria-label="Move section up" :disabled="sectionIndex === 0" @click="store.moveSection(currentProject.id, section.id, 'up')">↑</button><button type="button" aria-label="Move section down" :disabled="sectionIndex === currentProject.sections.length - 1" @click="store.moveSection(currentProject.id, section.id, 'down')">↓</button><button class="danger-button" type="button" @click="store.deleteSection(currentProject.id, section.id)">Delete section</button></div></div>
        <div class="subsections"><article v-for="(subsection, subsectionIndex) in section.subsections" :key="subsection.id" data-testid="subsection-card" class="subsection-card"><div class="subsection-heading"><input :value="subsection.title ?? ''" placeholder="Subsection title (optional)" @input="store.updateSubsectionField(currentProject.id, section.id, subsection.id, 'title', ($event.target as HTMLInputElement).value)" /><div class="controls"><button type="button" aria-label="Move subsection up" :disabled="subsectionIndex === 0" @click="store.moveSubsection(currentProject.id, section.id, subsection.id, 'up')">↑</button><button type="button" aria-label="Move subsection down" :disabled="subsectionIndex === section.subsections.length - 1" @click="store.moveSubsection(currentProject.id, section.id, subsection.id, 'down')">↓</button><button class="danger-button" type="button" @click="store.deleteSubsection(currentProject.id, section.id, subsection.id)">Delete</button></div></div><div class="notes-grid"><label>Viewer sees<textarea :value="subsection.viewer_sees" @input="store.updateSubsectionField(currentProject.id, section.id, subsection.id, 'viewer_sees', ($event.target as HTMLTextAreaElement).value)" /></label><label>Explanation / intent<textarea :value="subsection.explanation_notes" @input="store.updateSubsectionField(currentProject.id, section.id, subsection.id, 'explanation_notes', ($event.target as HTMLTextAreaElement).value)" /></label></div><label class="script-label">Script<textarea class="script-input" :value="subsection.script" @input="store.updateSubsectionField(currentProject.id, section.id, subsection.id, 'script', ($event.target as HTMLTextAreaElement).value)" /></label><label class="estimate-label">Estimated seconds <input type="number" min="0" :value="subsection.estimated_seconds ?? ''" @input="store.updateSubsectionField(currentProject.id, section.id, subsection.id, 'estimated_seconds', ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))" /></label></article></div><button class="add-button" type="button" @click="store.addSubsection(currentProject.id, section.id)">+ Add subsection</button>
      </div>
      <button class="add-section" type="button" @click="store.addSection(currentProject.id)">+ Add section</button>
    </section>
  </main>
</template>
