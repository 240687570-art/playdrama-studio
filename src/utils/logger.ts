// Unified error logger for production debugging
// In production, this should send errors to a monitoring service (Sentry, etc.)
export function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    console.error(`[${context}]`, error)
  }
  // TODO: Integrate with Sentry/LogRocket in production
  // Example: Sentry.captureException(error, { tags: { context } })
}

export function logWarn(context: string, message: string, data?: unknown): void {
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    console.warn(`[${context}]`, message, data ?? '')
  }
}

export function logInfo(context: string, message: string, data?: unknown): void {
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    console.info(`[${context}]`, message, data ?? '')
  }
}
