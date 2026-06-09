import { type ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  className?: string
}

export function Container({ children, className = '' }: LayoutProps) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  )
}

export function PageLayout({ children, className = '' }: LayoutProps) {
  return (
    <div className={`min-h-screen w-full bg-[var(--color-background)] text-[var(--color-foreground)] ${className}`}>
      {children}
    </div>
  )
}

export function Grid({
  children,
  cols = 1,
  className = '',
}: LayoutProps & { cols?: 1 | 2 | 3 | 4 | 6 | 12 }) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
    12: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12',
  }

  return (
    <div className={`grid gap-4 ${colClasses[cols]} ${className}`}>
      {children}
    </div>
  )
}

export function Flex({
  children,
  className = '',
  direction = 'row',
  wrap = false,
  gap = 4,
  items = 'center',
}: LayoutProps & {
  direction?: 'row' | 'col'
  wrap?: boolean
  gap?: 2 | 4 | 6 | 8
  items?: 'start' | 'center' | 'end' | 'stretch'
}) {
  const gapClasses = {
    2: 'gap-2',
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8',
  }

  const itemClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  }

  return (
    <div
      className={`flex ${direction === 'col' ? 'flex-col' : 'flex-row'} ${
        wrap ? 'flex-wrap' : ''
      } ${gapClasses[gap]} ${itemClasses[items]} ${className}`}
    >
      {children}
    </div>
  )
}
