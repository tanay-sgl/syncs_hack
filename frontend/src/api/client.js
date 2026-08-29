const API_URL = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '')

export async function apiFetch(path, options = {}) {
  const { headers, signal, timeoutMs = 6000, ...requestOptions } = options
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs)
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...requestOptions,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...headers },
    })
    if (!res.ok) throw new Error(`API request failed (${res.status})`)
    return res.json()
  } finally {
    globalThis.clearTimeout(timeout)
  }
}

const post = (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) })

export const healthCheck = () => apiFetch('/api/health', { timeoutMs: 2000 })
export const parseIntent = (text) => apiFetch('/api/parse-intent', { method: 'POST', body: JSON.stringify({ query: text }), timeoutMs: 15000 })
export const matchPeople = (intent, candidates, topN = candidates.length) => post('/api/match', { intent, candidates, topN })
export const detectClusters = (intents, minSize = 3) => post('/api/detect-clusters', { intents, minSize })
export const fetchCandidates = () => apiFetch('/api/candidates').then((r) => r.candidates)
export const fetchFounders = () => apiFetch('/api/founders').then((r) => r.founders)
export const fetchOrganisations = () => apiFetch('/api/organisations').then((r) => r.organisations)
export const fetchLiveIntents = () => apiFetch('/api/live-intents').then((r) => r.liveIntents)
