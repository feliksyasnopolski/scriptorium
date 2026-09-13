import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiRequest, openScriptoriumDb } from '../services/api'

export type Account = { id: string; username: string }
type AuthResponse = { user: Account; token: string }
let activeToken = ''
export function getAuthToken() { return activeToken }

async function readStored(): Promise<AuthResponse | undefined> {
  const db = await openScriptoriumDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction('auth').objectStore('auth').get('current')
    request.onsuccess = () => resolve(request.result as AuthResponse | undefined)
    request.onerror = () => reject(request.error)
  })
}
async function writeStored(value: AuthResponse | undefined) {
  const db = await openScriptoriumDb()
  return new Promise<void>((resolve, reject) => {
    const store = db.transaction('auth', 'readwrite').objectStore('auth')
    const request = value ? store.put(value, 'current') : store.delete('current')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<Account | null>(null)
  const loading = ref(true)
  const error = ref('')

  async function establish(response: AuthResponse) {
    activeToken = response.token
    user.value = response.user
    await writeStored(response)
  }
  async function initialize() {
    loading.value = true
    const stored = await readStored().catch(() => undefined)
    try {
      if (!stored) return
      activeToken = stored.token
      const current = await apiRequest<Account>('/auth/current')
      user.value = current
      await writeStored({ token: activeToken, user: current })
    } catch (reason) {
      if (stored && !(reason as { status?: number }).status) {
        activeToken = stored.token
        user.value = stored.user
      } else {
        activeToken = ''
        user.value = null
        await writeStored(undefined).catch(() => undefined)
      }
    } finally { loading.value = false }
  }
  async function signup(username: string, password: string, passwordConfirmation: string, turnstileToken: string) {
    error.value = ''
    try { await establish(await apiRequest<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify({ username, password, password_confirmation: passwordConfirmation, turnstile_token: turnstileToken }) }, false)) }
    catch (reason) { error.value = reason instanceof Error ? reason.message : 'Unable to create account'; throw reason }
  }
  async function login(username: string, password: string) {
    error.value = ''
    try { await establish(await apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }, false)) }
    catch (reason) { error.value = reason instanceof Error ? reason.message : 'Unable to log in'; throw reason }
  }
  async function recover(username: string, code: string, password: string, passwordConfirmation: string) {
    error.value = ''
    try { await establish(await apiRequest<AuthResponse>('/auth/recover', { method: 'POST', body: JSON.stringify({ username, code, password, password_confirmation: passwordConfirmation }) }, false)) }
    catch (reason) { error.value = reason instanceof Error ? reason.message : 'Recovery unavailable'; throw reason }
  }
  async function logout() {
    await apiRequest('/auth/logout', { method: 'DELETE' }).catch(() => undefined)
    activeToken = ''
    user.value = null
    await writeStored(undefined).catch(() => undefined)
  }
  return { user, loading, error, initialize, signup, login, recover, logout }
})
