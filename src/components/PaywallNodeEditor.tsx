import { useState } from 'react'
import { Card, CardContent } from './ui/Card'
import { Button } from './ui/Button'

interface PaywallNode {
  id: string
  nodeId: string
  nodeTitle: string
  price: number
  currency: 'CNY' | 'USD'
  description: string
  unlockType: 'single' | 'chapter' | 'subscription'
  freePreview: boolean
  previewLength: number // seconds
  discount?: {
    enabled: boolean
    percentage: number
    endDate?: string
  }
}

interface PaywallEditorProps {
  nodes: { id: string; title: string; kind: string }[]
  paywallNodes: PaywallNode[]
  onPaywallChange: (nodes: PaywallNode[]) => void
}

export function PaywallNodeEditor({ nodes, paywallNodes, onPaywallChange }: PaywallEditorProps) {
  const [selectedNode, setSelectedNode] = useState<string>('')
  const [editingPaywall, setEditingPaywall] = useState<PaywallNode | null>(null)

  const handleAddPaywall = () => {
    if (!selectedNode) return
    const node = nodes.find((n) => n.id === selectedNode)
    if (!node) return

    const newPaywall: PaywallNode = {
      id: `paywall_${Date.now()}`,
      nodeId: node.id,
      nodeTitle: node.title,
      price: 0.99,
      currency: 'CNY',
      description: `解锁「${node.title}」后续剧情`,
      unlockType: 'single',
      freePreview: true,
      previewLength: 30,
      discount: {
        enabled: false,
        percentage: 0,
      },
    }

    onPaywallChange([...paywallNodes, newPaywall])
    setEditingPaywall(newPaywall)
  }

  const handleUpdatePaywall = (updated: PaywallNode) => {
    onPaywallChange(paywallNodes.map((p) => (p.id === updated.id ? updated : p)))
    setEditingPaywall(null)
  }

  const handleRemovePaywall = (id: string) => {
    onPaywallChange(paywallNodes.filter((p) => p.id !== id))
    if (editingPaywall?.id === id) setEditingPaywall(null)
  }

  const availableNodes = nodes.filter((node) => !paywallNodes.some((p) => p.nodeId === node.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select
          value={selectedNode}
          onChange={(e) => setSelectedNode(e.target.value)}
          className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
        >
          <option value="">选择要设为付费的节点</option>
          {availableNodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.title} ({node.kind})
            </option>
          ))}
        </select>
        <Button onClick={handleAddPaywall} disabled={!selectedNode} size="sm">
          添加付费节点
        </Button>
      </div>

      <div className="space-y-2">
        {paywallNodes.map((paywall) => (
          <Card key={paywall.id} className="relative">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-[var(--color-foreground)]">{paywall.nodeTitle}</h4>
                  <p className="text-sm text-[var(--color-muted-foreground)]">{paywall.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                      {paywall.currency === 'CNY' ? '¥' : '$'}{paywall.price}
                    </span>
                    <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-xs text-[var(--color-accent-foreground)]">
                      {paywall.unlockType === 'single' && '单节点'}
                      {paywall.unlockType === 'chapter' && '整章'}
                      {paywall.unlockType === 'subscription' && '订阅'}
                    </span>
                    {paywall.discount?.enabled && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                        -{paywall.discount.percentage}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={() => setEditingPaywall(paywall)}
                    variant="ghost"
                    size="sm"
                  >
                    编辑
                  </Button>
                  <Button
                    onClick={() => handleRemovePaywall(paywall.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                  >
                    删除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingPaywall && (
        <PaywallEditModal
          paywall={editingPaywall}
          onSave={handleUpdatePaywall}
          onClose={() => setEditingPaywall(null)}
        />
      )}
    </div>
  )
}

function PaywallEditModal({
  paywall,
  onSave,
  onClose,
}: {
  paywall: PaywallNode
  onSave: (paywall: PaywallNode) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(paywall)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl bg-[var(--color-card)] p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">编辑付费节点</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              节点
            </label>
            <p className="text-sm text-[var(--color-muted-foreground)]">{form.nodeTitle}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              价格
            </label>
            <div className="flex gap-2">
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value as 'CNY' | 'USD' })}
                className="w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm"
              >
                <option value="CNY">CNY</option>
                <option value="USD">USD</option>
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              解锁方式
            </label>
            <select
              value={form.unlockType}
              onChange={(e) =>
                setForm({ ...form, unlockType: e.target.value as PaywallNode['unlockType'] })
              }
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1 text-sm"
            >
              <option value="single">单节点解锁</option>
              <option value="chapter">整章解锁</option>
              <option value="subscription">订阅解锁</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              描述
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.freePreview}
              onChange={(e) => setForm({ ...form, freePreview: e.target.checked })}
              id="freePreview"
            />
            <label htmlFor="freePreview" className="text-sm text-[var(--color-foreground)]">
              免费预览
            </label>
          </div>

          {form.freePreview && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                预览时长（秒）：{form.previewLength}
              </label>
              <input
                type="range"
                min="10"
                max="120"
                value={form.previewLength}
                onChange={(e) => setForm({ ...form, previewLength: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.discount?.enabled}
              onChange={(e) =>
                setForm({
                  ...form,
                  discount: { ...form.discount, enabled: e.target.checked } as PaywallNode['discount'],
                })
              }
              id="discount"
            />
            <label htmlFor="discount" className="text-sm text-[var(--color-foreground)]">
              启用折扣
            </label>
          </div>

          {form.discount?.enabled && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                折扣：{form.discount.percentage}%
              </label>
              <input
                type="range"
                min="1"
                max="99"
                value={form.discount.percentage}
                onChange={(e) =>
                  setForm({
                    ...form,
                    discount: { ...form.discount, percentage: Number(e.target.value) } as PaywallNode['discount'],
                  })
                }
                className="w-full"
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <Button onClick={() => onSave(form)} className="flex-1">
            保存
          </Button>
          <Button onClick={onClose} variant="secondary" className="flex-1">
            取消
          </Button>
        </div>
      </div>
    </div>
  )
}
