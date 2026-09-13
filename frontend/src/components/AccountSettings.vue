<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiRequest } from '../services/api'
import { useAuthStore } from '../stores/auth'

type Credential = { id: string; label: string; created_at: string }
const auth = useAuthStore()
defineEmits<{ back: [] }>()
const credentials = ref<Credential[]>([])
const label = ref('')
const password = ref('')
const code = ref('')
const setup = ref<{ id: string; secret: string; provisioning_uri: string; qr_svg_base64: string } | null>(null)
const error = ref('')
const message = ref('')
async function load() { credentials.value = (await apiRequest<{ credentials: Credential[] }>('/account/totp')).credentials }
async function begin() {
  error.value = ''; message.value = ''
  try { const response = await apiRequest<{ credential: { id: string }; secret: string; provisioning_uri: string; qr_svg_base64: string }>('/account/totp', { method: 'POST', body: JSON.stringify({ label: label.value, password: password.value }) }); setup.value = { id: response.credential.id, secret: response.secret, provisioning_uri: response.provisioning_uri, qr_svg_base64: response.qr_svg_base64 } }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'Unable to begin setup' }
}
async function confirm() {
  if (!setup.value) return
  try { await apiRequest(`/account/totp/${setup.value.id}/confirm`, { method: 'POST', body: JSON.stringify({ code: code.value, password: password.value }) }); setup.value = null; password.value = ''; code.value = ''; message.value = 'Authenticator added.'; await load() }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'Unable to confirm authenticator' }
}
async function remove(credential: Credential) {
  const confirmed = window.prompt(`Enter your current password to remove ${credential.label}.`)
  if (confirmed === null) return
  try { await apiRequest(`/account/totp/${credential.id}`, { method: 'DELETE', body: JSON.stringify({ password: confirmed }) }); await load() }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'Unable to remove authenticator' }
}
onMounted(load)
</script>

<template>
  <section class="page-content account-page">
    <button class="back-button" type="button" @click="$emit('back')">← Projects</button>
    <p class="eyebrow">Account</p><h1>{{ auth.user?.username }}</h1>
    <div class="security-card">
      <p class="eyebrow">Recovery</p><h2>Authenticator apps</h2>
      <p class="auth-note">Authenticator apps are optional recovery credentials. They are not required when logging in.</p>
      <ul v-if="credentials.length" class="credential-list"><li v-for="credential in credentials" :key="credential.id"><span>{{ credential.label }}</span><button type="button" class="danger-button" @click="remove(credential)">Remove</button></li></ul>
      <p v-if="credentials.length === 1" class="auth-note">Removing the last credential makes the account unrecoverable if the password is lost.</p>
      <form v-if="!setup" class="setup-form" @submit.prevent="begin"><label>Label (optional)<input v-model="label" placeholder="Phone, MacBook, KeePassXC" /></label><label>Current password<input v-model="password" type="password" autocomplete="current-password" required /></label><button class="primary-button" type="submit">Add authenticator</button></form>
      <div v-else class="setup-details"><p>Scan this QR code or enter the secret manually in your authenticator app.</p><img :src="`data:image/svg+xml;base64,${setup.qr_svg_base64}`" alt="Authenticator setup QR code" /><code>{{ setup.secret }}</code><label>Current six-digit code<input v-model="code" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" required /></label><button class="primary-button" type="button" @click="confirm">Confirm setup</button></div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p><p v-if="message" class="success-message">{{ message }}</p>
    </div>
  </section>
</template>
