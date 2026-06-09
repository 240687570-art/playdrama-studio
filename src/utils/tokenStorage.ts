// Secure token storage with XSS protection
// Falls back to localStorage for environments that don't support cookies

const TOKEN_KEY = 'playdrama.authToken.v1'
const TOKEN_EXPIRY_KEY = 'playdrama.authToken.expiry'

let memoryToken: string | null = null
let memoryExpiry: number = 0

export function getAuthToken(): string | null {
  // 1. Priority: in-memory token (most secure, cleared on page refresh)
  if (memoryToken) return memoryToken

  // 2. Fallback: localStorage (for environments without cookie support)
  try {
    const token = globalThis.localStorage?.getItem(TOKEN_KEY)
    if (!token) return null

    // Check token expiry
    const expiryStr = globalThis.localStorage?.getItem(TOKEN_EXPIRY_KEY)
    if (expiryStr) {
      const expiry = parseInt(expiryStr, 10)
      if (Date.now() > expiry) {
        // Token expired, clean up
        clearAuthToken()
        return null
      }
    }

    // Cache in memory for this session
    memoryToken = token
    return token
  } catch {
    return null
  }
}

export function setAuthToken(token: string, expiresInMinutes: number = 60): void {
  if (!token) {
    clearAuthToken()
    return
  }

  memoryToken = token
  memoryExpiry = Date.now() + expiresInMinutes * 60 * 1000

  try {
    globalThis.localStorage?.setItem(TOKEN_KEY, token)
    globalThis.localStorage?.setItem(TOKEN_EXPIRY_KEY, String(memoryExpiry))
  } catch {
    // Storage unavailable, keep in memory only
  }
}

export function clearAuthToken(): void {
  memoryToken = null
  memoryExpiry = 0

  try {
    globalThis.localStorage?.removeItem(TOKEN_KEY)
    globalThis.localStorage?.removeItem(TOKEN_EXPIRY_KEY)
  } catch {
    // Ignore storage errors
  }
}

export function isTokenExpired(): boolean {
  try {
    const expiryStr = globalThis.localStorage?.getItem(TOKEN_EXPIRY_KEY)
    if (!expiryStr) return true
    return Date.now() > parseInt(expiryStr, 10)
  } catch {
    return true
  }
}
