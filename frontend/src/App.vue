<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useProjectsStore } from './stores/projects'
import { useProjectTransfer } from './composables/useProjectTransfer'
import TopBar from './components/TopBar.vue'
import ProjectsView from './components/ProjectsView.vue'
import ProjectEditor from './components/ProjectEditor.vue'

const store = useProjectsStore()
const routeProjectId = ref<string | null>(null)
const newTitle = ref('')
const currentProject = computed(() => routeProjectId.value ? store.projects.find((project) => project.id === routeProjectId.value) ?? null : null)
const globalTransfer = useProjectTransfer(currentProject, openProject)

onMounted(async () => {
  await store.loadProjects()
  const id = new URLSearchParams(window.location.search).get('project')
  if (id) await openProject(id)
})

async function createProject(title: string) {
  const project = await store.createProject(title || 'Untitled project')
  await openProject(project.id)
}
async function openProject(id: string) {
  routeProjectId.value = id
  history.replaceState({}, '', `?project=${id}`)
  await store.openProject(id)
}
function goHome() {
  routeProjectId.value = null
  history.replaceState({}, '', window.location.pathname)
}
</script>

<template>
  <main class="app-shell">
    <TopBar :project-open="Boolean(currentProject)" :save-state="store.saveStateLabel" @home="goHome" />
    <ProjectsView
      v-if="!currentProject"
      :new-title="newTitle"
      @update:new-title="newTitle = $event"
      :projects="store.projects"
      :error="store.error"
      :import-error="globalTransfer.importError.value"
      @create="createProject"
      @open="openProject"
      @delete="store.deleteProject"
      @import="globalTransfer.chooseImport('global')"
    />
    <ProjectEditor v-else :project="currentProject" :import-error="globalTransfer.importError.value" @back="goHome" @import="globalTransfer.chooseImport('replace')" />
    <input :ref="globalTransfer.setImportInput" class="hidden-file-input" type="file" accept="application/json,.json" @change="globalTransfer.importJson" />
  </main>
</template>
