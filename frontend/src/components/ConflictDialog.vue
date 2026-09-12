<script setup lang="ts">
defineEmits<{ loadOnline: []; overwriteOnline: [] }>()
</script>

<template>
  <div class="dialog-backdrop" role="presentation">
    <div class="conflict-dialog" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
      <h2 id="conflict-title">This project changed online</h2>
      <p>Choose which copy should become authoritative. Scriptorium will not merge them automatically.</p>
      <div class="dialog-actions">
        <button type="button" @click="$emit('loadOnline')">Load online copy</button>
        <button class="primary-button" type="button" @click="$emit('overwriteOnline')">Overwrite online with my copy</button>
      </div>
    </div>
  </div>
</template>
