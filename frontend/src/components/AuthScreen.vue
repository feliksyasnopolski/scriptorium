<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const store = useAuthStore()
const mode = ref<'login' | 'signup' | 'recover'>('login')
const username = ref('')
const password = ref('')
const confirmation = ref('')
const submitting = ref(false)
async function submit() {
  submitting.value = true
  try { if (mode.value === 'login') await store.login(username.value, password.value); else if (mode.value === 'signup') await store.signup(username.value, password.value, confirmation.value); else await store.recover(username.value, code.value, password.value, confirmation.value) }
  catch { /* the store exposes the concise API error */ }
  finally { submitting.value = false }
}
const code = ref('')
</script>

<template>
  <main class="auth-shell">
    <section class="auth-card">
      <p class="eyebrow">Scriptorium</p>
      <h1>{{ mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Recover account' }}</h1>
      <p v-if="mode === 'signup'" class="auth-note">No email or phone is required. Recovery methods will matter once they are available.</p>
      <form @submit.prevent="submit">
        <label>Username<input v-model="username" autocomplete="username" required /></label>
        <label>Password<input v-model="password" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" required /></label>
        <label v-if="mode === 'recover'">Authenticator code<input v-model="code" inputmode="numeric" autocomplete="one-time-code" required /></label>
        <label v-if="mode !== 'login'">Confirm password<input v-model="confirmation" type="password" autocomplete="new-password" required /></label>
        <p v-if="store.error" class="form-error" role="alert">{{ store.error }}</p>
        <button class="primary-button" type="submit" :disabled="submitting">{{ mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Recover account' }}</button>
      </form>
      <button v-if="mode === 'login'" class="auth-switch" type="button" @click="mode = 'recover'">Forgot password?</button>
      <button class="auth-switch" type="button" @click="mode = mode === 'login' ? 'signup' : 'login'">{{ mode === 'login' ? 'Create an account' : 'Log in instead' }}</button>
    </section>
  </main>
</template>
