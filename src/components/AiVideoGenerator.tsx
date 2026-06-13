import { useState, useCallback} from 'react'
import {
  Video,
  Wand2,
  Play,
  Download,
  Settings,
  Layers,
  GitBranch,
  Sparkles,
  RotateCcw,
  Image,
  Music,
  Type,
  Clapperboard,
  Clock,
  Monitor,
  Film,
  Camera,
  Sliders,
} from 'lucide-react'

interface VideoNode {
  id: string
  type: 'input' | 'ai-generate' | 'edit' | 'preview' | 'export'
  title: string
  status: 'idle' | 'running' | 'completed' | 'error'
  x: number
  y: number
}

interface VideoShot {
  id: string
  scene: string
  duration: number
  camera: string
  description: string
}

interface GeneratedVideo {
  id: string
  title: string
  thumbnail: string
  duration: string
  status: 'generating' | 'completed'
  progress: number
  resolution: string
  style: string
}

const DEFAULT_SHOTS: VideoShot[] = [
  { id: 'shot-1', scene: '开场', duration: 5, camera: '全景', description: '场景建立镜头' },
  { id: 'shot-2', scene: '铺陈', duration: 4, camera: '中景', description: '主角出场' },
  { id: 'shot-3', scene: '冲突', duration: 6, camera: '特写', description: '关键情节' },
  { id: 'shot-4', scene: '转折', duration: 4, camera: '推进', description: '剧情反转' },
  { id: 'shot-5', scene: '高潮', duration: 7, camera: '特写', description: '情绪顶点' },
  { id: 'shot-6', scene: '结尾', duration: 4, camera: '全景', description: '收尾镜头' },
]

export function AiVideoGenerator() {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'workflow' | 'shots' | 'params'>('workflow')
  const [shots] = useState<VideoShot[]>(DEFAULT_SHOTS)
  const [resolution, setResolution] = useState('1080p')
  const [style, setStyle] = useState('cinematic')
  const [duration, setDuration] = useState(30)

  const [workflowNodes] = useState<VideoNode[]>([
    { id: 'node-1', type: 'input', title: '输入创意', status: 'completed', x: 50, y: 100 },
    { id: 'node-2', type: 'ai-generate', title: 'AI 生成分镜', status: 'completed', x: 250, y: 100 },
    { id: 'node-3', type: 'ai-generate', title: 'AI 生成视频', status: 'idle', x: 450, y: 100 },
    { id: 'node-4', type: 'edit', title: '视频编辑', status: 'idle', x: 650, y: 100 },
    { id: 'node-5', type: 'preview', title: '预览', status: 'idle', x: 850, y: 100 },
    { id: 'node-6', type: 'export', title: '导出', status: 'idle', x: 1050, y: 100 },
  ])

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    const newVideo: GeneratedVideo = {
      id: `video-${Date.now()}`,
      title: prompt.slice(0, 30) + (prompt.length > 30 ? '...' : ''),
      thumbnail: '/marketing/playdrama-hero.png',
      duration: '0:00',
      status: 'generating',
      progress: 0,
      resolution,
      style,
    }
    setGeneratedVideos((prev) => [newVideo, ...prev])

    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setGeneratedVideos((prev) =>
          prev.map((v) =>
            v.id === newVideo.id
              ? { ...v, status: 'completed' as const, progress: 100, duration: `${Math.floor(duration * 0.85)}s` }
              : v,
          ),
        )
        setIsGenerating(false)
      } else {
        setGeneratedVideos((prev) =>
          prev.map((v) => (v.id === newVideo.id ? { ...v, progress: Math.floor(progress) } : v)),
        )
      }
    }, 800)
  }, [prompt, resolution, style, duration])

  const getNodeIcon = (type: VideoNode['type']) => {
    switch (type) {
      case 'input': return <Type size={18} />
      case 'ai-generate': return <Wand2 size={18} />
      case 'edit': return <Settings size={18} />
      case 'preview': return <Play size={18} />
      case 'export': return <Download size={18} />
    }
  }

  const nodeColors: Record<VideoNode['type'], string> = {
    input: 'var(--accent)',
    'ai-generate': 'var(--accent)',
    edit: 'var(--warning)',
    preview: '#6366f1',
    export: 'var(--accent-secondary)',
  }

  return (
    <div className="ai-video-generator">
      <div className="ai-video-header">
        <h2>
          <Video size={24} style={{ color: 'var(--accent)' }} />
          AI 视频生成
        </h2>
        <p>一句话生成专业短剧视频，支持多镜头编排和智能参数配置</p>
      </div>

      {/* 功能标签页 */}
      <div className="ai-video-tabs" style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
        {([
          { id: 'workflow' as const, icon: GitBranch, label: '创作工作流' },
          { id: 'shots' as const, icon: Film, label: '镜头编排' },
          { id: 'params' as const, icon: Sliders, label: '参数配置' },
        ]).map((tab) => (
          <button
            key={tab.id}
            className={`ai-video-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 'var(--radius)',
              border: activeTab === tab.id ? '1px solid var(--accent)' : '1px solid var(--line)',
              background: activeTab === tab.id ? 'var(--accent-soft)' : 'var(--surface)',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--muted)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 180ms ease',
            }}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'workflow' && (
        <>
          {/* 工作流画布 */}
          <div className="ai-video-workflow">
            <h3>
              <GitBranch size={18} style={{ color: 'var(--accent)' }} />
              创作工作流
            </h3>
            <div className="workflow-canvas">
              <svg className="workflow-lines" width="100%" height="120">
                {workflowNodes.slice(0, -1).map((node, i) => {
                  const next = workflowNodes[i + 1]
                  return (
                    <line
                      key={`line-${node.id}`}
                      x1={node.x + 80}
                      y1={node.y + 40}
                      x2={next.x}
                      y2={next.y + 40}
                      stroke="var(--line)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                  )
                })}
              </svg>
              <div className="workflow-nodes">
                {workflowNodes.map((node) => (
                  <div
                    key={node.id}
                    className={`workflow-node ${selectedNode === node.id ? 'selected' : ''}`}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      borderColor: nodeColors[node.type],
                    }}
                    onClick={() => setSelectedNode(node.id)}
                  >
                    <span className="workflow-node-icon" style={{ color: nodeColors[node.type] }}>
                      {getNodeIcon(node.type)}
                    </span>
                    <span className="workflow-node-title">{node.title}</span>
                    <span
                      className={`workflow-node-status ${node.status}`}
                      style={{ background: nodeColors[node.type] }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'shots' && (
        <>
          {/* 多镜头时间线 */}
          <div className="ai-video-shots">
            <h3>
              <Film size={18} style={{ color: 'var(--accent)' }} />
              镜头时间线
            </h3>
            <div className="shot-timeline">
              {shots.map((shot, index) => (
                <div key={shot.id} className="shot-block">
                  <div className="shot-index" style={{ color: 'var(--accent)' }}>
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="shot-info">
                    <strong>{shot.scene}</strong>
                    <span className="shot-duration">
                      <Clock size={11} />
                      {shot.duration}s
                    </span>
                  </div>
                  <div className="shot-meta">
                    <span><Camera size={11} />{shot.camera}</span>
                    <em>{shot.description}</em>
                  </div>
                  <div
                    className="shot-bar"
                    style={{
                      width: `${(shot.duration / 30) * 100}%`,
                      background: 'var(--accent)',
                      opacity: 0.6 + index * 0.06,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'params' && (
        <>
          {/* 参数配置 */}
          <div className="ai-video-params">
            <h3>
              <Sliders size={18} style={{ color: 'var(--accent)' }} />
              生成参数
            </h3>
            <div className="params-grid">
              <div className="param-field">
                <label><Monitor size={14} />分辨率</label>
                <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                  <option>720p</option>
                  <option>1080p</option>
                  <option>2K</option>
                  <option>4K</option>
                </select>
              </div>
              <div className="param-field">
                <label><Camera size={14} />风格</label>
                <select value={style} onChange={(e) => setStyle(e.target.value)}>
                  <option value="cinematic">电影级</option>
                  <option value="anime">动漫风</option>
                  <option value="realistic">写实风</option>
                  <option value="noir">黑色电影</option>
                </select>
              </div>
              <div className="param-field">
                <label><Clock size={14} />总时长 (秒)</label>
                <input
                  type="range"
                  min={15}
                  max={120}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{duration}s</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 创意输入 */}
      <div className="ai-video-prompt">
        <div className="ai-video-prompt-input">
          <Sparkles size={20} className="prompt-icon" />
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="输入一句话创意，例如：雨夜便利店的悬疑故事..."
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button
            className="ai-generate-button"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <>
                <RotateCcw size={16} className="spinning" />
                生成中
              </>
            ) : (
              <>
                <Wand2 size={16} />
                生成视频
              </>
            )}
          </button>
        </div>
      </div>

      {/* 快速技能 */}
      <div className="ai-video-skills">
        <h3>
          <Layers size={18} style={{ color: 'var(--accent)' }} />
          快速技能
        </h3>
        <div className="ai-video-skills-grid">
          {[
            { icon: Clapperboard, label: '悬疑短剧', desc: '自动生成悬疑氛围' },
            { icon: Image, label: '场景生成', desc: 'AI 设计场景画面' },
            { icon: Music, label: '配乐匹配', desc: '自动匹配背景音乐' },
            { icon: Type, label: '字幕生成', desc: '自动添加字幕' },
          ].map((skill) => (
            <button
              key={skill.label}
              className="ai-video-skill-card"
              onClick={() => {
                setPrompt(`生成一个${skill.label}风格的短剧视频`)
              }}
            >
              <skill.icon size={20} style={{ color: 'var(--accent)' }} />
              <strong>{skill.label}</strong>
              <span>{skill.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 生成结果 */}
      {generatedVideos.length > 0 && (
        <div className="ai-video-results">
          <h3>
            <Clapperboard size={18} style={{ color: 'var(--accent)' }} />
            生成结果
          </h3>
          <div className="ai-video-results-grid">
            {generatedVideos.map((video) => (
              <div key={video.id} className="ai-video-result-card">
                <div className="ai-video-result-thumbnail">
                  <img src={video.thumbnail} alt={video.title} />
                  {video.status === 'generating' && (
                    <div className="ai-video-result-overlay">
                      <div className="ai-video-progress">
                        <div
                          className="ai-video-progress-bar"
                          style={{ width: `${video.progress}%`, background: 'var(--accent)' }}
                        />
                        <span>{video.progress}%</span>
                      </div>
                    </div>
                  )}
                  {video.status === 'completed' && (
                    <button className="ai-video-play-button">
                      <Play size={24} fill="currentColor" />
                    </button>
                  )}
                </div>
                <div className="ai-video-result-info">
                  <strong>{video.title}</strong>
                  <span>{video.duration} · {video.resolution}</span>
                </div>
                <div className="ai-video-result-actions">
                  <button className="ai-video-result-action">
                    <Play size={14} />
                    预览
                  </button>
                  <button className="ai-video-result-action">
                    <Download size={14} />
                    导出
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
