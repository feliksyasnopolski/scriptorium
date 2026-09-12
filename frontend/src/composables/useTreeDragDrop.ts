import { ref, type ComputedRef } from 'vue'
import type { Project } from '../types'
import { useProjectsStore } from '../stores/projects'

export type DragItem = { kind: 'section' | 'subsection'; id: string; sectionId?: string }
export type DropTarget = { kind: 'section' | 'subsection'; sectionId?: string; index: number }

export function useTreeDragDrop(project: ComputedRef<Project | null>) {
  const store = useProjectsStore()
  const dragItem = ref<DragItem | null>(null)
  const dropTarget = ref<DropTarget | null>(null)

  function readDragItem(event: DragEvent): DragItem | null {
    const raw = event.dataTransfer?.getData('application/x-scriptorium-item')
    if (!raw) return dragItem.value
    try { return JSON.parse(raw) as DragItem } catch { return null }
  }

  function startDrag(event: DragEvent, kind: DragItem['kind'], id: string, sectionId?: string) {
    dragItem.value = { kind, id, sectionId }
    dropTarget.value = null
    event.dataTransfer?.setData('application/x-scriptorium-item', JSON.stringify(dragItem.value))
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }

  function endDrag() {
    dragItem.value = null
    dropTarget.value = null
  }

  function setDropTarget(event: DragEvent, targetKind: DragItem['kind'], targetId: string, targetSectionId?: string) {
    const source = readDragItem(event)
    const currentProject = project.value
    if (!source || !currentProject) return

    if (targetKind === 'section') {
      const sectionIndex = currentProject.sections.findIndex((section) => section.id === targetId)
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      const index = sectionIndex + (event.clientY > rect.top + rect.height / 2 ? 1 : 0)
      if (source.kind === 'section' && source.id !== targetId && sectionIndex >= 0) {
        dropTarget.value = { kind: 'section', index }
      } else if (source.kind === 'subsection' && source.sectionId && sectionIndex >= 0) {
        dropTarget.value = { kind: 'subsection', sectionId: targetId, index: currentProject.sections[sectionIndex].subsections.length }
      }
      return
    }

    if (source.kind !== 'subsection' || !targetSectionId || source.id === targetId) return
    const section = currentProject.sections.find((item) => item.id === targetSectionId)
    const subsectionIndex = section?.subsections.findIndex((item) => item.id === targetId) ?? -1
    if (!section || subsectionIndex < 0) return
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    dropTarget.value = { kind: 'subsection', sectionId: targetSectionId, index: subsectionIndex + (event.clientY > rect.top + rect.height / 2 ? 1 : 0) }
  }

  function setSectionEndTarget(event: DragEvent, sectionId: string) {
    const source = readDragItem(event)
    const section = project.value?.sections.find((item) => item.id === sectionId)
    if (source?.kind === 'subsection' && source.sectionId && section) {
      dropTarget.value = { kind: 'subsection', sectionId, index: section.subsections.length }
    }
  }

  function dropItem(event: DragEvent) {
    event.preventDefault()
    const source = readDragItem(event)
    const target = dropTarget.value
    const currentProject = project.value
    if (!source || !target || !currentProject) return
    if (source.kind === 'section' && target.kind === 'section') store.reorderSection(currentProject.id, source.id, target.index)
    else if (source.kind === 'subsection' && target.kind === 'subsection' && source.sectionId && target.sectionId) {
      store.moveSubsectionTo(currentProject.id, source.sectionId, source.id, target.sectionId, target.index)
    }
    endDrag()
  }

  function dropIntoSection(event: DragEvent, sectionId: string) {
    event.preventDefault()
    const source = readDragItem(event)
    const target = dropTarget.value
    const currentProject = project.value
    if (source?.kind === 'subsection' && source.sectionId && target?.kind === 'subsection' && currentProject) {
      store.moveSubsectionTo(currentProject.id, source.sectionId, source.id, sectionId, target.index)
    }
    endDrag()
  }

  return { dragItem, dropTarget, startDrag, endDrag, setDropTarget, setSectionEndTarget, dropItem, dropIntoSection }
}
