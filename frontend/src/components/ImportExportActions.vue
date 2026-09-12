<script setup lang="ts">
defineEmits<{ exportJson: []; exportMarkdown: []; import: [] }>()
</script>

<template>
  <div class="export-actions">
    <button type="button" @click="$emit('exportJson')">Export JSON</button>
    <button type="button" @click="$emit('exportMarkdown')">Export Markdown</button>
    <button type="button" @click="$emit('import')">Import JSON</button>
  </div>
</template>
