import { useState } from 'react'
import {
  Grid3x3,
  Trash2,
  Plus,
  Image,
  Type,
  Camera,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Play,
  Eye,
} from 'lucide-react'

interface StoryboardFrame {
  id: string
  scene: string
  shot: string
  description: string
  camera: string
  duration: string
  status: 'draft' | 'generated' | 'approved'
}

export function StoryboardDesigner() {
  const [frames, setFrames] = useState<StoryboardFrame[]>([
    {
      id: 'frame-1', scene: '第1场', shot: '全景',
      description: '雨夜，便利店外，女主独自撑伞走进雨中',
      camera: '固定机位', duration: '5s', status: 'approved',
    },
    {
      id: 'frame-2', scene: '第2场', shot: '特写',
      description: '女主发现地上有一张皱巴巴的小票',
      camera: '推进', duration: '3s', status: 'generated',
    },
    {
      id: 'frame-3', scene: '第3场', shot: '中景',
      description: '女主弯腰捡起小票，眉头微皱',
      camera: '跟随', duration: '4s', status: 'draft',
    },
    {
      id: 'frame-4', scene: '第4场', shot: '特写',
      description: '小票上的日期是今天的，但便利店已经关门',
      camera: '固定', duration: '3s', status: 'draft',
    },
    {
      id: 'frame-5', scene: '第5场', shot: '全景',
      description: '女主环顾四周，发现街角有个神秘人影',
      camera: '缓慢平移', duration: '6s', status: 'draft',
    },
    {
      id: 'frame-6', scene: '第6场', shot: '特写',
      description: '神秘人转头，露出意味深长的微笑',
      camera: '快速推进', duration: '4s', status: 'draft',
    },
  ])

  const [selectedFrame, setSelectedFrame] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  const handleGenerateFrames = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setFrames((prev) =>
        prev.map((f) => ({ ...f, status: 'generated' as const })),
      )
      setIsGenerating(false)
    }, 2000)
  }

  const handleAddFrame = () => {
    const newFrame: StoryboardFrame = {
      id: `frame-${Date.now()}`,
      scene: `第${frames.length + 1}场`,
      shot: '待定',
      description: '',
      camera: '固定机位',
      duration: '3s',
      status: 'draft',
    }
    setFrames((prev) => [...prev, newFrame])
  }

  const handleDeleteFrame = (id: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== id))
  }

  const handleMoveFrame = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === frames.length - 1) return
    const newFrames = [...frames]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newFrames[index], newFrames[targetIndex]] = [newFrames[targetIndex], newFrames[index]]
    setFrames(newFrames)
  }

  const statusStyles: Record<StoryboardFrame['status'], { bg: string; color: string }> = {
    approved: { bg: 'var(--success)', color: 'white' },
    generated: { bg: 'var(--accent)', color: 'white' },
    draft: { bg: 'var(--line)', color: 'var(--muted)' },
  }

  return (
    <div className="storyboard-designer">
      <div className="storyboard-header">
        <h2>
          <Grid3x3 size={24} style={{ color: 'var(--accent)' }} />
          分镜设计
        </h2>
        <p>AI 自动生成多镜头分镜，可视化编排短剧镜头语言</p>
      </div>

      {/* 工具栏 */}
      <div className="storyboard-toolbar">
        <button
          className="storyboard-generate-btn"
          onClick={handleGenerateFrames}
          disabled={isGenerating}
        >
          <Sparkles size={16} />
          {isGenerating ? '生成分镜中...' : 'AI 自动生成分镜'}
        </button>
        <button className="storyboard-add-btn" onClick={handleAddFrame}>
          <Plus size={16} />
          添加镜头
        </button>
        <button
          className="storyboard-add-btn"
          onClick={() => setPreviewMode(!previewMode)}
          style={previewMode ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
        >
          <Eye size={16} />
          {previewMode ? '退出预览' : '预览模式'}
        </button>
      </div>

      {/* 分镜网格 */}
      <div className={`storyboard-grid ${previewMode ? 'preview-mode' : ''}`}>
        {frames.map((frame, index) => (
          <div
            key={frame.id}
            className={`storyboard-frame ${selectedFrame === frame.id ? 'selected' : ''}`}
            onClick={() => setSelectedFrame(frame.id)}
          >
            <div className="storyboard-frame-number">
              <span>{index + 1}</span>
              <div className="storyboard-frame-actions">
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveFrame(index, 'up') }}
                  disabled={index === 0}
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveFrame(index, 'down') }}
                  disabled={index === frames.length - 1}
                >
                  <ChevronRight size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteFrame(frame.id) }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <div className="storyboard-frame-visual">
              {previewMode ? (
                <div className="frame-preview">
                  <Play size={28} fill="currentColor" style={{ color: 'var(--accent)', opacity: 0.7 }} />
                </div>
              ) : (
                <>
                  <Image size={32} className="storyboard-frame-placeholder" />
                  <span className="storyboard-frame-duration">{frame.duration}</span>
                </>
              )}
            </div>
            <div className="storyboard-frame-info">
              <div className="storyboard-frame-meta">
                <span className="storyboard-frame-scene">{frame.scene}</span>
                <span
                  className="storyboard-frame-status"
                  style={{ background: statusStyles[frame.status].bg, color: statusStyles[frame.status].color }}
                >
                  {frame.status === 'approved' ? '已通过' : frame.status === 'generated' ? '已生成' : '草稿'}
                </span>
              </div>
              <p className="storyboard-frame-desc">{frame.description}</p>
              <div className="storyboard-frame-tags">
                <span><Camera size={12} />{frame.camera}</span>
                <span><Type size={12} />{frame.shot}</span>
              </div>
            </div>
          </div>
        ))}
        {frames.length < 9 && (
          <button className="storyboard-frame storyboard-frame-add" onClick={handleAddFrame}>
            <Plus size={24} />
            <span>添加镜头</span>
          </button>
        )}
      </div>

      {/* 分镜详情 */}
      {selectedFrame && (
        <div className="storyboard-detail">
          <h3>
            <Image size={18} style={{ color: 'var(--accent)' }} />
            镜头详情
          </h3>
          {frames
            .filter((f) => f.id === selectedFrame)
            .map((frame) => (
              <div key={frame.id} className="storyboard-detail-content">
                <div className="storyboard-detail-field">
                  <label>场景描述</label>
                  <textarea
                    value={frame.description}
                    onChange={(e) => {
                      setFrames((prev) =>
                        prev.map((f) => (f.id === frame.id ? { ...f, description: e.target.value } : f)),
                      )
                    }}
                    rows={3}
                  />
                </div>
                <div className="storyboard-detail-row">
                  <div className="storyboard-detail-field">
                    <label>景别</label>
                    <select
                      value={frame.shot}
                      onChange={(e) => {
                        setFrames((prev) =>
                          prev.map((f) => (f.id === frame.id ? { ...f, shot: e.target.value } : f)),
                        )
                      }}
                    >
                      <option>全景</option>
                      <option>中景</option>
                      <option>近景</option>
                      <option>特写</option>
                      <option>大特写</option>
                    </select>
                  </div>
                  <div className="storyboard-detail-field">
                    <label>运镜</label>
                    <select
                      value={frame.camera}
                      onChange={(e) => {
                        setFrames((prev) =>
                          prev.map((f) => (f.id === frame.id ? { ...f, camera: e.target.value } : f)),
                        )
                      }}
                    >
                      <option>固定机位</option>
                      <option>推进</option>
                      <option>拉远</option>
                      <option>跟随</option>
                      <option>缓慢平移</option>
                      <option>快速推进</option>
                    </select>
                  </div>
                  <div className="storyboard-detail-field">
                    <label>时长</label>
                    <select
                      value={frame.duration}
                      onChange={(e) => {
                        setFrames((prev) =>
                          prev.map((f) => (f.id === frame.id ? { ...f, duration: e.target.value } : f)),
                        )
                      }}
                    >
                      <option>1s</option>
                      <option>2s</option>
                      <option>3s</option>
                      <option>4s</option>
                      <option>5s</option>
                      <option>6s</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
