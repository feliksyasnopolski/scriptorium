<script setup lang="ts">
import type { Project } from '../types'
import type { DragItem, DropTarget } from '../composables/useTreeDragDrop'
import ScriptTreeSection from './ScriptTreeSection.vue'

defineProps<{ project: Project | null; sidebarOpen: boolean; activeItem: string; dragItem: DragItem | null; dropTarget: DropTarget | null }>()
defineEmits<{
  focus: [kind: 'section' | 'subsection', id: string]
  dragStart: [event: DragEvent, kind: DragItem['kind'], id: string, sectionId?: string]
  dragEnd: []
  dragOver: [event: DragEvent, kind: DragItem['kind'], id: string, sectionId?: string]
  sectionEndDragOver: [event: DragEvent, sectionId: string]
  drop: [event: DragEvent]
  dropIntoSection: [event: DragEvent, sectionId: string]
  close: []
}>()
</script>

<template>
  <aside class="script-tree" :class="{ 'is-open': sidebarOpen }">
    <div class="tree-heading">
      <span>Structure</span>
      <button class="sidebar-close" type="button" aria-label="Close structure" @click="$emit('close')">×</button>
    </div>
    <nav aria-label="Script structure">
      <ScriptTreeSection
        v-for="(section, sectionIndex) in project?.sections"
        :key="section.id"
        :section="section"
        :section-index="sectionIndex"
        :active-item="activeItem"
        :drag-item="dragItem"
        :drop-target="dropTarget"
        @focus="(kind, id) => $emit('focus', kind, id)"
        @drag-start="(event, kind, id, sectionId) => $emit('dragStart', event, kind, id, sectionId)"
        @drag-end="$emit('dragEnd')"
        @drag-over="(event, kind, id, sectionId) => $emit('dragOver', event, kind, id, sectionId)"
        @section-end-drag-over="(event, sectionId) => $emit('sectionEndDragOver', event, sectionId)"
        @drop="$emit('drop', $event)"
        @drop-into-section="(event, sectionId) => $emit('dropIntoSection', event, sectionId)"
      />
      <div v-if="dropTarget?.kind === 'section' && dropTarget.index === project?.sections.length" class="tree-insertion-marker" data-testid="section-insertion-marker" aria-label="Section insertion position"></div>
    </nav>
  </aside>
</template>
