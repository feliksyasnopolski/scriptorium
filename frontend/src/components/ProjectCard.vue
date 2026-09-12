<script setup lang="ts">
import type { Project } from '../types'
import { plannedDurationSeconds } from '../types'
import { formatDuration } from '../utils/duration'

defineProps<{ project: Project }>()
defineEmits<{ open: []; delete: [] }>()
</script>

<template>
  <article class="project-card" data-testid="project-card" @click="$emit('open')">
    <button class="card-delete" type="button" aria-label="Delete project" @click.stop="$emit('delete')">×</button>
    <p class="eyebrow">Video project</p>
    <h2>{{ project.title }}</h2>
    <div class="timing-row">
      <span v-if="project.target_duration_seconds != null">Target {{ formatDuration(project.target_duration_seconds) }}</span>
      <span>Planned {{ formatDuration(plannedDurationSeconds(project)) }}</span>
    </div>
  </article>
</template>
