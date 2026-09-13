<script setup lang="ts">
import { useTheme, type ThemePreference } from '../composables/useTheme'

defineProps<{ projectOpen: boolean; saveState: string }>()
defineEmits<{ home: []; logout: []; account: [] }>()
const theme = useTheme()
</script>

<template>
  <header class="topbar">
    <button class="wordmark" type="button" @click="$emit('home')">Scriptorium</button>
    <span v-if="projectOpen" class="save-state">{{ saveState }}</span>
    <div class="topbar-actions">
      <label class="theme-selector">
        <select aria-label="Theme" :value="theme.preference.value" @change="theme.setPreference(($event.target as HTMLSelectElement).value as ThemePreference)">
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <button class="account-button" type="button" @click="$emit('account')">Account</button>
      <button class="logout-button" type="button" @click="$emit('logout')">Log out</button>
    </div>
  </header>
</template>
