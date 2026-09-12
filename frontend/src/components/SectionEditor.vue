<script setup lang="ts">
import { useProjectsStore } from '../stores/projects'
import type { Section } from '../types'
import SubsectionEditor from './SubsectionEditor.vue'

const props = defineProps<{ projectId: string; section: Section }>()
const store = useProjectsStore()
function updateTitle(event: Event) { store.updateSectionField(props.projectId, props.section.id, (event.target as HTMLInputElement).value) }
</script>

<template>
  <div :id="`editor-section-${section.id}`" data-testid="section-card" class="section-card">
    <div class="section-heading">
      <input class="section-title" :value="section.title" aria-label="Section title" @input="updateTitle" />
      <div class="controls"><button class="danger-button" type="button" @click="store.deleteSection(projectId, section.id)">Delete section</button></div>
    </div>
    <div class="subsections">
      <SubsectionEditor v-for="subsection in section.subsections" :key="subsection.id" :project-id="projectId" :section-id="section.id" :subsection="subsection" />
    </div>
    <button class="add-button" type="button" @click="store.addSubsection(projectId, section.id)">+ Add subsection</button>
  </div>
</template>
