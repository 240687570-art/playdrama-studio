import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers3, Wand2, GitBranch, Users, Bot, Share2, Video, Grid3x3, Zap, Sparkles, type LucideIcon } from 'lucide-react'

export type StudioPage = 'overview' | 'creation' | 'story' | 'characters' | 'ai' | 'publish' | 'video' | 'storyboard' | 'skills'

interface NavItem { id: StudioPage; label: string; icon: LucideIcon }

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: '\u9879\u76EE\u603B\u89C8', icon: Layers3 },
  { id: 'creation', label: '\u521B\u4F5C\u6A21\u5F0F', icon: Wand2 },
  { id: 'story', label: '\u5267\u60C5\u7F16\u8F91', icon: GitBranch },
  { id: 'characters', label: '\u89D2\u8272\u8D44\u4EA7', icon: Users },
  { id: 'ai', label: '\u666E\u901A\u77ED\u5267', icon: Bot },
  { id: 'publish', label: '\u53D1\u5E03\u53D8\u73B0', icon: Share2 },
  { id: 'video', label: 'AI \u89C6\u9891', icon: Video },
  { id: 'storyboard', label: '\u5206\u955C\u8BBE\u8BA1', icon: Grid3x3 },
  { id: 'skills', label: '\u6280\u80FD\u5E93', icon: Zap },
]

interface LayoutProps { children: ReactNode; currentPage: StudioPage; setCurrentPage: (page: StudioPage) => void }

export default function Layout({ children, currentPage, setCurrentPage }: LayoutProps) {
  const navigate = useNavigate()
  const handleNav = (page: StudioPage) => {
    setCurrentPage(page)
    navigate(page, { replace: true })
  }
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Workspace">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={20} /></div>
          <div><strong>PlayDrama</strong><span>AI \u4E92\u52A8\u77ED\u5267\u5DE5\u4F5C\u53F0</span></div>
        </div>
        <nav className="nav-list" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={'nav-item ' + (currentPage === item.id ? 'active' : '')} type="button" onClick={() => handleNav(item.id)}>
              <item.icon size={18} />{item.label}
            </button>
          ))}
        </nav>
      </aside>
      <section className="workspace">{children}</section>
    </main>
  )
}
