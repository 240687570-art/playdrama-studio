import { useState, useCallback } from 'react'
import { Crown, Gift, Bell, ChevronDown, User, CreditCard, LogOut, ShieldCheck, Terminal, Plus, Moon, Key, Eye, Check, LogIn } from 'lucide-react'

interface UserMenuProps {
  userInfo?: {
    phone?: string
    email?: string
    displayName?: string
    avatarInitials?: string
  }
  onLogout?: () => void
  unreadCount?: number
  onNotificationClick?: () => void
  onOpenLogin?: () => void
}

export default function UserMenu({ userInfo, onLogout, unreadCount, onNotificationClick, onOpenLogin }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const [showAccessKey, setShowAccessKey] = useState(false)
  const hasUser = Boolean(userInfo)

  const toggle = useCallback(() => setOpen(o => !o), [])
  const close = useCallback(() => setOpen(false), [])

  const phone = userInfo?.phone || '181****5222'
  const initials = userInfo?.avatarInitials || 'U'

  const points = { common: 280, studio: 620 }
  const storage = { used: 0.8, total: 3 }
  const actualUnread = unreadCount ?? 0

  if (!hasUser) {
    return (
      <button
        onClick={onOpenLogin}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium text-white bg-[#6366f1] hover:bg-[#5558e6] transition-colors shadow-sm"
      >
        <LogIn size={16} />
        <span>登录</span>
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="flex items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-[#ffffff08] border border-transparent hover:border-[#ffffff0d]"
        aria-expanded={open}
      >
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center text-[11px] font-bold text-white">
          {initials}
        </div>
        <ChevronDown className={"h-3 w-3 text-[#666] transition-transform " + (open ? 'rotate-180' : '')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute right-0 top-full mt-2 z-50 w-[340px] rounded-2xl border border-[#ffffff10] bg-[#1a1a1a] shadow-2xl backdrop-blur-xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 space-y-3 border-b border-[#ffffff08]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center text-[13px] font-bold text-white">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#e0e0e0]">{phone}</p>
                  <div className="flex items-center gap-2 text-[11px] text-[#666]">
                    <button onClick={() => { navigator.clipboard.writeText('uuid-placeholder') }} className="flex items-center gap-0.5 hover:text-[#aaa] transition-colors">
                      <Key className="h-2.5 w-2.5" /> UUID
                    </button>
                    <button onClick={() => setShowAccessKey(!showAccessKey)} className="flex items-center gap-0.5 hover:text-[#aaa] transition-colors">
                      <Eye className="h-2.5 w-2.5" /> Access key {showAccessKey ? <Check className="h-2.5 w-2.5 text-[#10b981]" /> : null}
                    </button>
                  </div>
                </div>
                <button className="flex items-center gap-1 rounded-lg border border-[#ffffff0d] px-2.5 py-1.5 text-[11px] text-[#888] hover:border-[#ffffff18] hover:text-[#aaa] transition-colors">
                  <Plus className="h-3 w-3" /> Create Team
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-[#141414] px-3 py-2.5">
                <span className="text-[12px] text-[#aaa]">Free User</span>
                <button className="ml-auto flex items-center gap-1 rounded-lg bg-[#f7a600] px-3 py-1.5 text-[11px] font-medium text-black hover:bg-[#ffb833] transition-colors">
                  <Crown className="h-3 w-3" /> Upgrade
                  <span className="ml-1 rounded bg-black/20 px-1.5 py-0.5 text-[10px]">34% off</span>
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4757]/10 to-[#f7a600]/10 border border-[#ff4757]/15 px-3 py-2">
                <Gift className="h-3.5 w-3.5 text-[#ff4757]" />
                <span className="text-[11px] text-[#ff4757] font-medium">618 Red Envelope</span>
                <span className="text-[11px] text-[#888]">Claim Kling 2.0 limited 5 credits, valid 21 days</span>
                <button className="ml-auto text-[11px] text-[#666] hover:text-[#aaa]">View</button>
              </div>
            </div>
            <div className="p-4 space-y-3 border-b border-[#ffffff08]">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[12px] font-medium text-[#aaa]">Points</span>
                  <span className="text-[11px] font-semibold text-[#f7a600]">{points.common + points.studio}</span>
                  <span className="text-[10px] text-[#666]">pts</span>
                  <div className="ml-auto flex items-center gap-2">
                    <button className="text-[11px] text-[#666] hover:text-[#aaa] transition-colors">Top Up</button>
                    <button className="text-[11px] text-[#666] hover:text-[#aaa] transition-colors">Order</button>
                  </div>
                </div>
                <div className="text-[11px] text-[#555]">
                  <span>Common {points.common} pts</span>
                  <span className="mx-2 text-[#ffffff15]">|</span>
                  <span>PlayDrama {points.studio} pts</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[12px] font-medium text-[#aaa]">Storage</span>
                  <a href="/asset" className="ml-auto text-[11px] text-[#666] hover:text-[#aaa] transition-colors">Manage</a>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-[#ffffff08] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#0ea5e9]" style={{ width: (storage.used / storage.total * 100) + '%' }} />
                  </div>
                  <span className="text-[11px] text-[#555]">{storage.used}G / {storage.total}G</span>
                </div>
              </div>
            </div>
            <div className="py-1.5 border-b border-[#ffffff08]">
              {[
                { icon: User, label: 'Personal', subtitle: 'Profile, Verification, Preferences' },
                { icon: CreditCard, label: 'Subscription & Invoice', subtitle: 'Orders, Invoices, Permissions' },
              ].map(item => (
                <button key={item.label} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#ffffff06] transition-colors">
                  <item.icon className="h-4 w-4 text-[#666]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-[#ccc]">{item.label}</p>
                    <p className="text-[10px] text-[#555]">{item.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="py-1.5 border-b border-[#ffffff08]">
              {[
                { icon: Moon, label: 'Dark / Light Mode' },
                { icon: ShieldCheck, label: 'AI Watermark Settings' },
                { icon: Terminal, label: 'CLI & Skill' },
                { icon: Bell, label: 'Notifications', badge: actualUnread, onClick: onNotificationClick },
              ].map(item => (
                <button key={item.label} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#ffffff06] transition-colors" onClick={item.onClick}>
                  <item.icon className="h-4 w-4 text-[#666]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-[#ccc]">{item.label}</p>
                  </div>
                  {item.badge ? (
                    <span className="rounded-full bg-[#ff4757] px-1.5 py-0.5 text-[10px] font-medium text-white">{item.badge}</span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="py-1.5">
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[#ff4757] hover:bg-[#ff4757]/5 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-[12px]">Log Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}