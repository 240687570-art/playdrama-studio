import { useState, useCallback } from 'react'
import { generateAiDraft } from '../api'
import { Button } from './ui/Button'
// import { LoadingSpinner } from './ui/Skeleton'
import { logError } from '../utils/logger'

export interface InteractiveStoryParams {
  idea: string
  genre: string
  episodes: number
  style: 'suspense' | 'romance' | 'comedy' | 'fantasy' | 'sci-fi'
  targetAudience: string
  monetizationNodes: number
}

export interface GeneratedInteractiveStory {
  title: string
  synopsis: string
  episodes: {
    id: string
    title: string
    summary: string
    nodes: {
      id: string
      title: string
      content: string
      kind: 'Hook' | 'Choice' | 'Puzzle' | 'Ending'
      choices?: { label: string; targetId: string; condition?: string }[]
      paywall?: 'free' | 'paid'
      monetizationPrice?: number
    }[]
  }[]
  characters: {
    name: string
    role: string
    trait: string
    color: string
  }[]
  variables: {
    id: string
    label: string
    type: 'number' | 'boolean' | 'text'
    defaultValue: string
  }[]
}

export function useInteractiveStoryGenerator() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<GeneratedInteractiveStory | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateStory = useCallback(async (params: InteractiveStoryParams) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      setProgress('正在构思剧情大纲...')
      
      const story = await generateAiDraft<GeneratedInteractiveStory>(
        'interactive-story-draft',
        {
          idea: params.idea,
          genre: params.genre,
          episodes: params.episodes,
          style: params.style,
          targetAudience: params.targetAudience,
          monetizationNodes: params.monetizationNodes,
          interactive: true,
          branchLogic: true,
          paywallDesign: true,
        }
      )

      setProgress('剧情生成完成')
      setResult(story)
    } catch (err) {
      logError('interactive-story-gen', err)
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, progress, result, error, generateStory }
}

interface AiInteractiveStoryGeneratorProps {
  onStoryGenerated?: (story: GeneratedInteractiveStory) => void
}

export function AiInteractiveStoryGenerator({ onStoryGenerated }: AiInteractiveStoryGeneratorProps) {
  const [idea, setIdea] = useState('')
  const [genre, setGenre] = useState('悬疑')
  const [episodes, setEpisodes] = useState(5)
  const [style, setStyle] = useState<'suspense' | 'romance' | 'comedy' | 'fantasy' | 'sci-fi'>('suspense')
  const [monetizationNodes, setMonetizationNodes] = useState(3)
  
  const { loading, progress, result, error, generateStory } = useInteractiveStoryGenerator()

  const handleGenerate = () => {
    if (!idea.trim()) return
    generateStory({
      idea,
      genre,
      episodes,
      style,
      targetAudience: '18-35岁都市人群',
      monetizationNodes,
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <h2 className="mb-4 text-xl font-semibold text-[var(--color-card-foreground)]">
          AI 互动短剧生成器
        </h2>
        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
          输入一句话创意，AI 自动生成含分支剧情、付费节点的互动短剧
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
              创意灵感
            </label>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="例如：一位失忆的侦探在破案过程中发现自己就是凶手..."
              rows={3}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
                题材类型
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option>悬疑</option>
                <option>爱情</option>
                <option>喜剧</option>
                <option>奇幻</option>
                <option>科幻</option>
                <option>都市</option>
                <option>古装</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
                风格
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as typeof style)}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="suspense">悬疑烧脑</option>
                <option value="romance">甜宠浪漫</option>
                <option value="comedy">轻松喜剧</option>
                <option value="fantasy">奇幻冒险</option>
                <option value="sci-fi">科幻未来</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
                集数：{episodes} 集
              </label>
              <input
                type="range"
                min={3}
                max={20}
                value={episodes}
                onChange={(e) => setEpisodes(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
                付费节点数：{monetizationNodes} 个
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={monetizationNodes}
                onChange={(e) => setMonetizationNodes(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || !idea.trim()}
            loading={loading}
            className="w-full"
          >
            {loading ? progress : '生成互动短剧'}
          </Button>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <h3 className="mb-2 text-lg font-semibold text-[var(--color-card-foreground)]">
            {result.title}
          </h3>
          <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
            {result.synopsis}
          </p>

          <div className="mb-4">
            <h4 className="mb-2 text-sm font-medium text-[var(--color-foreground)]">角色</h4>
            <div className="flex flex-wrap gap-2">
              {result.characters.map((char) => (
                <span
                  key={char.name}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                  style={{ backgroundColor: char.color + '20', color: char.color }}
                >
                  {char.name} · {char.role}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="mb-2 text-sm font-medium text-[var(--color-foreground)]">
              剧情结构（{result.episodes.length} 集）
            </h4>
            <div className="space-y-2">
              {result.episodes.map((ep) => (
                <div
                  key={ep.id}
                  className="rounded-md border border-[var(--color-border)] p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--color-foreground)]">
                      {ep.title}
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {ep.nodes.length} 个节点
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    {ep.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {onStoryGenerated && (
            <Button
              onClick={() => onStoryGenerated(result)}
              variant="secondary"
              className="w-full"
            >
              导入编辑器
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
