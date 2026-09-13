import { computed, onMounted, onUnmounted, ref } from 'vue'

export type ThemePreference = 'system' | 'light' | 'dark'

const storageKey = 'scriptorium-theme'
const preference = ref<ThemePreference>('system')
const effectiveTheme = ref<'light' | 'dark'>('light')
let mediaQuery: MediaQueryList | null = null

function readPreference(): ThemePreference {
  const stored = window.localStorage.getItem(storageKey)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

function applyTheme() {
  const theme = preference.value === 'system'
    ? (mediaQuery?.matches ? 'dark' : 'light')
    : preference.value
  effectiveTheme.value = theme
  document.documentElement.dataset.theme = theme
}

function handleSystemThemeChange() {
  if (preference.value === 'system') applyTheme()
}

export function useTheme() {
  onMounted(() => {
    preference.value = readPreference()
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', handleSystemThemeChange)
    applyTheme()
  })

  onUnmounted(() => mediaQuery?.removeEventListener('change', handleSystemThemeChange))

  function setPreference(next: ThemePreference) {
    preference.value = next
    window.localStorage.setItem(storageKey, next)
    applyTheme()
  }

  return { preference, effectiveTheme: computed(() => effectiveTheme.value), setPreference }
}
