import type { ReactNode } from 'react'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title = '暂无数据',
  description = '当前没有可显示的内容',
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      {icon && <div className="mb-4 text-[var(--color-muted-foreground)]">{icon}</div>}
      {!icon && (
        <div className="mb-4 rounded-full bg-[var(--color-muted)]/10 p-4">
          <svg
            className="h-8 w-8 text-[var(--color-muted-foreground)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v1a2 2 0 01-2 2H6a2 2 0 01-2-2v-1m16 0H4"
            />
          </svg>
        </div>
      )}
      <h3 className="text-base font-semibold text-[var(--color-foreground)]">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--color-muted-foreground)]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

interface LoadingOverlayProps {
  isLoading: boolean
  children: ReactNode
  text?: string
}

export function LoadingOverlay({ isLoading, children, text = '加载中...' }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-[var(--color-background)]/80 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{text}</p>
        </div>
      )}
    </div>
  )
}
