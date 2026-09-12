<script setup lang="ts">
import { computed, ref } from 'vue'
import { plannedDurationSeconds, type Project } from '../types'
import { formatDuration } from '../utils/duration'
import { useProjectsStore } from '../stores/projects'
import { useEditorNavigation } from '../composables/useEditorNavigation'
import { useProjectTransfer } from '../composables/useProjectTransfer'
import { useTreeDragDrop } from '../composables/useTreeDragDrop'
import ConflictDialog from './ConflictDialog.vue'
import ImportExportActions from './ImportExportActions.vue'
import ScriptTree from './ScriptTree.vue'
import SectionEditor from './SectionEditor.vue'

const props = defineProps<{ project: Project; importError: string }>()
const emit = defineEmits<{ back: []; import: [] }>()
const store = useProjectsStore()
const sidebarOpen = ref(false)
const currentProject = computed(() => props.project)
const navigation = useEditorNavigation(sidebarOpen)
const dragDrop = useTreeDragDrop(currentProject)
const transfer = useProjectTransfer(currentProject)

function updateProjectField(field: 'title' | 'target_duration_seconds', event: Event) {
  const value = (event.target as HTMLInputElement).value
  store.updateProjectField(props.project.id, field, field === 'title' ? value : value === '' ? null : Number(value))
}
</script>

<template>
  <section class="page-content editor-page">
    <button class="sidebar-toggle" type="button" @click="sidebarOpen = !sidebarOpen">Structure</button>
    <ScriptTree
      :project="currentProject"
      :sidebar-open="sidebarOpen"
      :active-item="navigation.activeItem.value"
      :drag-item="dragDrop.dragItem.value"
      :drop-target="dragDrop.dropTarget.value"
      @close="sidebarOpen = false"
      @focus="(kind, id) => navigation.focusEditor(kind, id)"
      @drag-start="dragDrop.startDrag"
      @drag-end="dragDrop.endDrag"
      @drag-over="dragDrop.setDropTarget"
      @section-end-drag-over="dragDrop.setSectionEndTarget"
      @drop="dragDrop.dropItem"
      @drop-into-section="dragDrop.dropIntoSection"
    />
    <div class="editor-heading">
      <button class="back-button" type="button" @click="emit('back')">← Projects</button>
      <div class="project-fields">
        <input class="project-title" :value="project.title" aria-label="Project title" @input="updateProjectField('title', $event)" />
        <label>Target duration <input type="number" min="0" :value="project.target_duration_seconds ?? ''" @input="updateProjectField('target_duration_seconds', $event)" /> seconds</label>
      </div>
      <div class="timing-block">
        <span v-if="project.target_duration_seconds != null">Target: {{ formatDuration(project.target_duration_seconds) }}</span>
        <span>Planned: {{ formatDuration(plannedDurationSeconds(project)) }}</span>
      </div>
    </div>
    <ImportExportActions @export-json="transfer.exportJson" @export-markdown="transfer.exportMarkdown" @import="emit('import')" />
    <p v-if="importError" class="error-message">{{ importError }}</p>
    <SectionEditor v-for="section in project.sections" :key="section.id" :project-id="project.id" :section="section" :ref="navigation.observeEditor" />
    <button class="add-section" type="button" @click="store.addSection(project.id)">+ Add section</button>
    <ConflictDialog v-if="store.conflicts[project.id]" @load-online="store.loadOnline(project.id)" @overwrite-online="store.overwriteOnline(project.id)" />
  </section>
</template>
