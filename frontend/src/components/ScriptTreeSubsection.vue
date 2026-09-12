<script setup lang="ts">
import type { Subsection } from '../types'
import type { DragItem } from '../composables/useTreeDragDrop'

defineProps<{ subsection: Subsection; sectionId: string; active: boolean; dragSource: boolean }>()
defineEmits<{
  focus: []
  dragStart: [event: DragEvent, kind: DragItem['kind'], id: string, sectionId: string]
  dragEnd: []
  dragOver: [event: DragEvent, kind: DragItem['kind'], id: string, sectionId: string]
  drop: [event: DragEvent]
}>()
</script>

<template>
  <div
    class="tree-row subsection-row"
    :class="{ active, 'drag-source': dragSource }"
    :data-id="subsection.id"
    :data-section-id="sectionId"
    draggable="true"
    @dragstart="$emit('dragStart', $event, 'subsection', subsection.id, sectionId)"
    @dragend="$emit('dragEnd')"
    @dragover.prevent="$emit('dragOver', $event, 'subsection', subsection.id, sectionId)"
    @drop="$emit('drop', $event)"
  >
    <span class="drag-handle" aria-hidden="true">⠿</span>
    <button class="tree-label" type="button" @click="$emit('focus')">{{ subsection.title || 'Untitled subsection' }}</button>
  </div>
</template>
