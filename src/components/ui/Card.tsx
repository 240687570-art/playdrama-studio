import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: CardProps) {
  return <div className={`mb-4 flex flex-col space-y-1.5 ${className}`}>{children}</div>
}

export function CardTitle({ children, className = '' }: CardProps) {
  return <h3 className={`text-lg font-semibold leading-none tracking-tight text-[var(--color-card-foreground)] ${className}`}>{children}</h3>
}

export function CardDescription({ children, className = '' }: CardProps) {
  return <p className={`text-sm text-[var(--color-muted-foreground)] ${className}`}>{children}</p>
}

export function CardContent({ children, className = '' }: CardProps) {
  return <div className={className}>{children}</div>
}
