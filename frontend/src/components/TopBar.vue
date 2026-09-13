<script setup lang="ts">
defineProps<{ projectOpen: boolean; saveState: string }>()
defineEmits<{ home: []; logout: []; account: [] }>()
</script>

<template>
  <header class="topbar">
    <button class="wordmark" type="button" @click="$emit('home')">Scriptorium</button>
    <span v-if="projectOpen" class="save-state">{{ saveState }}</span>
    <button class="account-button" type="button" @click="$emit('account')">Account</button>
    <button class="logout-button" type="button" @click="$emit('logout')">Log out</button>
  </header>
</template>
