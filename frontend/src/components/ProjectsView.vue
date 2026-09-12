<script setup lang="ts">
import type { Project } from '../types'
import ProjectCard from './ProjectCard.vue'

const props = defineProps<{ projects: Project[]; error: string; importError: string; newTitle: string }>()
const emit = defineEmits<{ create: [title: string]; open: [id: string]; delete: [id: string]; import: []; 'update:newTitle': [value: string] }>()
function create() { emit('create', props.newTitle); emit('update:newTitle', '') }
</script>

<template>
  <section class="page-content">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Your scripts</p>
        <h1>Projects</h1>
      </div>
      <div class="new-project-form">
        <input :value="newTitle" aria-label="New project title" placeholder="New project title" @input="emit('update:newTitle', ($event.target as HTMLInputElement).value)" @keyup.enter="create" />
        <button class="primary-button" type="button" @click="create">+ New project</button>
        <button type="button" @click="emit('import')">Import JSON</button>
      </div>
    </div>
    <p v-if="error || importError" class="error-message">{{ importError || error }}</p>
    <div class="project-grid">
      <ProjectCard v-for="project in projects" :key="project.id" :project="project" @open="emit('open', project.id)" @delete="emit('delete', project.id)" />
      <button class="empty-card" type="button" @click="emit('create', '')">+</button>
    </div>
  </section>
</template>
