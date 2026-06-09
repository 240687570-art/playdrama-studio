import { type ReactNode } from 'react'
import { Layers3, Wand2, GitBranch, Users, Rocket, BarChart3 } from 'lucide-react'

interface MobileNavProps {
  activePage: string
  onPageChange: (page: string) => void
}

export function MobileBottomNav({ activePage, onPageChange }: MobileNavProps) {
  const navItems = [
    { id: 'overview', label: '总览', icon: BarChart3 },
    { id: 'creation', label: '创作', icon: Wand2 },
    { id: 'story', label: '剧情', icon: GitBranch },
    { id: 'characters', label: '角色', icon: Users },
    { id: 'ai', label: 'AI', icon: Layers3 },
    { id: 'publish', label: '发布', icon: Rocket },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-card)] px-2 pb-safe">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`flex flex-col items-center py-2 px-3 transition-colors ${
                isActive
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-muted-foreground)]'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="mt-0.5 text-[10px]">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function MobileTopBar({
  title,
  onMenuClick,
  rightAction,
}: {
  title: string
  onMenuClick?: () => void
  rightAction?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-card)]/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onMenuClick}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-foreground)]"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-[var(--color-foreground)]">{title}</h1>
        <div className="flex items-center gap-2">{rightAction}</div>
      </div>
    </header>
  )
}

export function MobileCard({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm active:scale-[0.98] transition-transform ${className}`}
    >
      {children}
    </div>
  )
}

export function MobileSidebar({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 transform bg-[var(--color-card)] shadow-xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">菜单</h2>
            <button onClick={onClose} className="rounded-md p-1 hover:bg-[var(--color-accent)]">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">{children}</div>
        </div>
      </div>
    </>
  )
}
