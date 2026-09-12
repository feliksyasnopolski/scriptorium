<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

const emit = defineEmits<{
  'use-estimate': [seconds: number]
}>()

const elapsedMilliseconds = ref(0)
const accumulatedMilliseconds = ref(0)
const startedAt = ref<number | null>(null)
const timer = ref<number | null>(null)

const isRunning = computed(() => startedAt.value !== null)
const elapsedSeconds = computed(() => Math.floor(elapsedMilliseconds.value / 1000))
const canUseEstimate = computed(() => !isRunning.value && elapsedSeconds.value > 0)
const display = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60)
  const seconds = elapsedSeconds.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

function refresh() {
  if (startedAt.value === null) return
  elapsedMilliseconds.value = accumulatedMilliseconds.value + performance.now() - startedAt.value
}

function start() {
  accumulatedMilliseconds.value = elapsedMilliseconds.value
  startedAt.value = performance.now()
  timer.value = window.setInterval(refresh, 200)
}

function stop() {
  refresh()
  accumulatedMilliseconds.value = elapsedMilliseconds.value
  startedAt.value = null
  if (timer.value !== null) {
    window.clearInterval(timer.value)
    timer.value = null
  }
}

function reset() {
  stop()
  elapsedMilliseconds.value = 0
  accumulatedMilliseconds.value = 0
}

function useEstimate() {
  if (canUseEstimate.value) emit('use-estimate', elapsedSeconds.value)
}

onBeforeUnmount(reset)
</script>

<template>
  <div class="stopwatch" data-testid="stopwatch">
    <span class="stopwatch-label">Stopwatch</span>
    <span class="stopwatch-display" aria-live="off">{{ display }}</span>

    <div class="stopwatch-controls">
      <button v-if="!isRunning" type="button" @click="start">
        {{ elapsedSeconds > 0 ? 'Resume' : 'Start' }}
      </button>
      <button v-if="isRunning" type="button" @click="stop">Stop</button>
      <button v-if="isRunning || elapsedSeconds > 0" type="button" @click="reset">Reset</button>
      <button v-if="canUseEstimate" type="button" @click="useEstimate">Use as estimate</button>
    </div>
  </div>
</template>
