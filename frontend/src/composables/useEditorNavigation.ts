import { nextTick, onMounted, onUnmounted, ref, type Ref } from 'vue'

export function useEditorNavigation(sidebarOpen: Ref<boolean>) {
  const activeItem = ref('')
  let observer: IntersectionObserver | undefined

  onMounted(() => {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activeItem.value = entry.target.id.replace(/^editor-(section|subsection)-/, '')
        }
      })
    }, { rootMargin: '-15% 0px -65% 0px' })
  })

  onUnmounted(() => observer?.disconnect())

  function editorId(kind: 'section' | 'subsection', id: string) {
    return `editor-${kind}-${id}`
  }

  function observeEditor(element: unknown) {
    const target = element instanceof Element ? element : (element as { $el?: unknown } | null)?.$el
    if (target instanceof Element) nextTick(() => observer?.observe(target))
  }

  function focusEditor(kind: 'section' | 'subsection', id: string) {
    const element = document.getElementById(editorId(kind, id))
    if (element) {
      const header = document.querySelector('.topbar')?.getBoundingClientRect().height ?? 0
      window.scrollTo({
        top: Math.max(0, window.scrollY + element.getBoundingClientRect().top - header - 16),
        behavior: 'smooth',
      })
      element.querySelector('input')?.focus({ preventScroll: true })
    }
    activeItem.value = id
    sidebarOpen.value = false
  }

  return { activeItem, editorId, observeEditor, focusEditor }
}
