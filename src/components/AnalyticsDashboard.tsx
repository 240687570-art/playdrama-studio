import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'

interface AnalyticsData {
  views: number
  uniqueViews: number
  avgWatchTime: number
  completionRate: number
  paidUnlocks: number
  revenue: number
  conversionRate: number
  bounceRate: number
  dailyData: {
    date: string
    views: number
    revenue: number
    conversions: number
  }[]
  funnelData: {
    stage: string
    count: number
    percentage: number
  }[]
  abTests: {
    id: string
    name: string
    variantA: { name: string; conversions: number; total: number }
    variantB: { name: string; conversions: number; total: number }
    status: 'running' | 'completed'
  }[]
}

interface AnalyticsDashboardProps {
  data: AnalyticsData
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'funnel' | 'abtest'>('overview')

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(num)
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[
          { id: 'overview', label: '数据概览' },
          { id: 'funnel', label: '转化漏斗' },
          { id: 'abtest', label: 'A/B 测试' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                : 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:bg-[var(--color-accent)]/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab data={data} formatNumber={formatNumber} formatCurrency={formatCurrency} />}
      {activeTab === 'funnel' && <FunnelTab data={data} />}
      {activeTab === 'abtest' && <ABTestTab data={data} />}
    </div>
  )
}

function OverviewTab({
  data,
  formatNumber,
  formatCurrency,
}: {
  data: AnalyticsData
  formatNumber: (num: number) => string
  formatCurrency: (num: number) => string
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard title="总浏览量" value={formatNumber(data.views)} trend={12.5} />
        <MetricCard title="付费解锁" value={formatNumber(data.paidUnlocks)} trend={8.3} />
        <MetricCard title="转化率" value={`${data.conversionRate.toFixed(1)}%`} trend={-2.1} />
        <MetricCard title="收入" value={formatCurrency(data.revenue)} trend={15.7} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>观看数据趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.dailyData.map((day) => (
                <div key={day.date} className="flex items-center gap-4">
                  <span className="w-20 text-sm text-[var(--color-muted-foreground)]">{day.date}</span>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-[var(--color-accent)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                        style={{
                          width: `${(day.views / Math.max(...data.dailyData.map((d) => d.views))) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-16 text-right text-sm font-medium">{formatNumber(day.views)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>收入趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.dailyData.map((day) => (
                <div key={day.date} className="flex items-center gap-4">
                  <span className="w-20 text-sm text-[var(--color-muted-foreground)]">{day.date}</span>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-[var(--color-accent)]">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{
                          width: `${(day.revenue / Math.max(...data.dailyData.map((d) => d.revenue))) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-20 text-right text-sm font-medium">{formatCurrency(day.revenue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function FunnelTab({ data }: { data: AnalyticsData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>转化漏斗</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.funnelData.map((stage, index) => (
            <div key={stage.stage}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--color-foreground)]">{stage.stage}</span>
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {stage.count.toLocaleString()} ({stage.percentage}%)
                </span>
              </div>
              <div className="h-8 rounded-md bg-[var(--color-accent)]">
                <div
                  className="flex h-full items-center justify-end rounded-md px-2 text-xs font-medium text-white transition-all"
                  style={{
                    width: `${stage.percentage}%`,
                    backgroundColor:
                      index === 0
                        ? '#3b82f6'
                        : index === data.funnelData.length - 1
                        ? '#10b981'
                        : '#f59e0b',
                  }}
                >
                  {stage.percentage >= 20 && `${stage.percentage}%`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ABTestTab({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-4">
      {data.abTests.map((test) => {
        const rateA = ((test.variantA.conversions / test.variantA.total) * 100).toFixed(1)
        const rateB = ((test.variantB.conversions / test.variantB.total) * 100).toFixed(1)
        const winner = Number(rateA) > Number(rateB) ? 'A' : 'B'

        return (
          <Card key={test.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{test.name}</CardTitle>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    test.status === 'running'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {test.status === 'running' ? '进行中' : '已完成'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`rounded-lg border-2 p-4 ${
                    winner === 'A' && test.status === 'completed'
                      ? 'border-green-500 bg-green-50'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  <h4 className="text-sm font-medium text-[var(--color-foreground)]">
                    {test.variantA.name}
                  </h4>
                  <div className="mt-2 text-2xl font-bold text-[var(--color-foreground)]">
                    {rateA}%
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {test.variantA.conversions} / {test.variantA.total}
                  </p>
                </div>

                <div
                  className={`rounded-lg border-2 p-4 ${
                    winner === 'B' && test.status === 'completed'
                      ? 'border-green-500 bg-green-50'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  <h4 className="text-sm font-medium text-[var(--color-foreground)]">
                    {test.variantB.name}
                  </h4>
                  <div className="mt-2 text-2xl font-bold text-[var(--color-foreground)]">
                    {rateB}%
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {test.variantB.conversions} / {test.variantB.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function MetricCard({
  title,
  value,
  trend,
}: {
  title: string
  value: string
  trend: number
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <p className="text-sm text-[var(--color-muted-foreground)]">{title}</p>
        <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">{value}</p>
        <div
          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {trend >= 0 ? '+' : ''}
          {trend}%
        </div>
      </CardContent>
    </Card>
  )
}
