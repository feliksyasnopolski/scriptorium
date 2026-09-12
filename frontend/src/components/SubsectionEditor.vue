<script setup lang="ts">
import { useProjectsStore } from '../stores/projects'
import type { Subsection } from '../types'
import StopwatchControl from './StopwatchControl.vue'

const props = defineProps<{ projectId: string; sectionId: string; subsection: Subsection }>()
const store = useProjectsStore()
function text(field: 'title' | 'viewer_sees' | 'explanation_notes' | 'script', event: Event) { store.updateSubsectionField(props.projectId, props.sectionId, props.subsection.id, field, (event.target as HTMLInputElement | HTMLTextAreaElement).value) }
function number(event: Event) { const value = (event.target as HTMLInputElement).value; store.updateSubsectionField(props.projectId, props.sectionId, props.subsection.id, 'estimated_seconds', value === '' ? null : Number(value)) }
function useEstimate(seconds: number) { store.updateSubsectionField(props.projectId, props.sectionId, props.subsection.id, 'estimated_seconds', seconds) }
</script>

<template>
  <article :id="`editor-subsection-${subsection.id}`" data-testid="subsection-card" class="subsection-card">
    <div class="subsection-heading">
      <input :value="subsection.title ?? ''" placeholder="Subsection title (optional)" @input="text('title', $event)" />
      <div class="controls"><button class="danger-button" type="button" @click="store.deleteSubsection(projectId, sectionId, subsection.id)">Delete</button></div>
    </div>
    <div class="notes-grid">
      <label>Viewer sees<textarea :value="subsection.viewer_sees" @input="text('viewer_sees', $event)" /></label>
      <label>Explanation / intent<textarea :value="subsection.explanation_notes" @input="text('explanation_notes', $event)" /></label>
    </div>
    <label class="script-label">Script<textarea class="script-input" :value="subsection.script" @input="text('script', $event)" /></label>
    <div class="timing-controls">
      <label class="estimate-label">Estimated seconds <input type="number" min="0" :value="subsection.estimated_seconds ?? ''" @input="number" /></label>
      <StopwatchControl @use-estimate="useEstimate" />
    </div>
  </article>
</template>
