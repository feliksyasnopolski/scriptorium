<script setup lang="ts">
import type { Section } from '../types'
import type { DragItem, DropTarget } from '../composables/useTreeDragDrop'
import ScriptTreeSubsection from './ScriptTreeSubsection.vue'

defineProps<{ section: Section; sectionIndex: number; activeItem: string; dragItem: DragItem | null; dropTarget: DropTarget | null }>()
defineEmits<{
  focus: [kind: 'section' | 'subsection', id: string]
  dragStart: [event: DragEvent, kind: DragItem['kind'], id: string, sectionId?: string]
  dragEnd: []
  dragOver: [event: DragEvent, kind: DragItem['kind'], id: string, sectionId?: string]
  sectionEndDragOver: [event: DragEvent, sectionId: string]
  drop: [event: DragEvent]
  dropIntoSection: [event: DragEvent, sectionId: string]
}>()
</script>

<template>
  <div class="tree-section">
    <div v-if="dropTarget?.kind === 'section' && dropTarget.index === sectionIndex" class="tree-insertion-marker" data-testid="section-insertion-marker" aria-label="Section insertion position"></div>
    <div
      class="tree-row"
      :class="{ active: activeItem === section.id, 'drag-source': dragItem?.id === section.id }"
      :data-id="section.id"
      draggable="true"
      @dragstart="$emit('dragStart', $event, 'section', section.id)"
      @dragend="$emit('dragEnd')"
      @dragover.prevent="$emit('dragOver', $event, 'section', section.id)"
      @drop="$emit('drop', $event)"
    >
      <span class="drag-handle" aria-hidden="true">⠿</span>
      <button class="tree-label" type="button" @click="$emit('focus', 'section', section.id)">{{ section.title || 'Untitled section' }}</button>
    </div>
    <div v-for="(subsection, subsectionIndex) in section.subsections" :key="subsection.id">
      <div v-if="dropTarget?.kind === 'subsection' && dropTarget.sectionId === section.id && dropTarget.index === subsectionIndex" class="tree-insertion-marker subsection-insertion-marker" data-testid="subsection-insertion-marker" aria-label="Subsection insertion position"></div>
      <ScriptTreeSubsection
        :subsection="subsection"
        :section-id="section.id"
        :active="activeItem === subsection.id"
        :drag-source="dragItem?.id === subsection.id"
        @focus="$emit('focus', 'subsection', subsection.id)"
        @drag-start="(event, kind, id, sectionId) => $emit('dragStart', event, kind, id, sectionId)"
        @drag-end="$emit('dragEnd')"
        @drag-over="(event, kind, id, sectionId) => $emit('dragOver', event, kind, id, sectionId)"
        @drop="$emit('drop', $event)"
      />
    </div>
    <div class="tree-section-drop" :class="{ 'is-drop-target': dropTarget?.kind === 'subsection' && dropTarget.sectionId === section.id && dropTarget.index === section.subsections.length }" @dragover.prevent="$emit('sectionEndDragOver', $event, section.id)" @drop="$emit('dropIntoSection', $event, section.id)">
      <div v-if="dropTarget?.kind === 'subsection' && dropTarget.sectionId === section.id && dropTarget.index === section.subsections.length" class="tree-insertion-marker subsection-insertion-marker" data-testid="subsection-insertion-marker" aria-label="Subsection insertion position"></div>
    </div>
  </div>
</template>
