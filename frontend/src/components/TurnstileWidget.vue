<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const emit = defineEmits<{ token: [value: string]; failure: [] }>()
const container = ref<HTMLDivElement>()
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || (import.meta.env.PROD ? '0x4AAAAAAEylwc4XXTbWaGHd' : '1x00000000000000000000AA')
const testMode = import.meta.env.VITE_TURNSTILE_TEST_MODE === 'true'
let widgetId: string | undefined

function renderWidget() {
  if (!container.value || !window.turnstile) return
  widgetId = window.turnstile.render(container.value, {
    sitekey: siteKey,
    callback: (token: string) => emit('token', token),
    'expired-callback': () => emit('token', ''),
    'error-callback': () => { emit('token', ''); emit('failure') },
  })
}

function reset() {
  if (widgetId !== undefined && window.turnstile) window.turnstile.reset(widgetId)
  emit('token', '')
}

defineExpose({ reset })

onMounted(() => {
  if (testMode) return emit('token', 'test-token')
  if (window.turnstile) return renderWidget()
  const existing = document.querySelector('script[data-turnstile]')
  if (existing) return existing.addEventListener('load', renderWidget, { once: true })
  const script = document.createElement('script')
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
  script.async = true
  script.defer = true
  script.dataset.turnstile = 'true'
  script.addEventListener('load', renderWidget, { once: true })
  document.head.appendChild(script)
})

onBeforeUnmount(() => {
  if (widgetId !== undefined && window.turnstile) window.turnstile.remove(widgetId)
})
</script>

<template><div ref="container" class="turnstile-widget" aria-label="Signup verification" /></template>
