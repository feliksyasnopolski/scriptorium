import { getAuthToken } from '../stores/auth'
import type { ProjectDocument } from '../types'

export type RequestError = Error & { status?: number; document?: ProjectDocument }

export async function apiRequest<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (authenticated) {
    const token = getAuthToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  const response = await fetch(`/api/v1${path}`, { ...options, headers })
  const body = response.status === 204 ? undefined : await response.json().catch(() => ({}))
  if (!response.ok) {
    const errors = Object.values((body as { errors?: Record<string, string[]> })?.errors ?? {}).flat()
    const issue = new Error(errors.join(', ') || (body as { error?: string })?.error || 'Request failed') as RequestError
    issue.status = response.status
    issue.document = (body as { document?: ProjectDocument })?.document
    throw issue
  }
  return body as T
}

export function openScriptoriumDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('scriptorium', 2)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('projects')) request.result.createObjectStore('projects')
      if (!request.result.objectStoreNames.contains('auth')) request.result.createObjectStore('auth')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
