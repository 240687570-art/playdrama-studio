import { useState, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import {
  ArrowLeft, FileText, Users, Video, Music, Image, Maximize2,
  Grid3x3, Map, X, Crown, Gift, Plus, Wand2, Clapperboard,
  PanelRightClose, PanelRightOpen, HelpCircle, Settings, Loader2,
  Sparkles, ChevronDown, Search, Globe, Clock, Trash2,
  Layers, ZoomIn, ZoomOut, Play, Download
} from "lucide-react"

const API = "/api/ai"

interface QAction {
  id: string
  icon: any
  label: string
  desc: string
  color: string
  task: string
}

const ACTIONS: QAction[] = [
  { id: "script", icon: FileText, label: "故事脚本生成", desc: "输入一句话，AI生成完整剧本", color: "#0ea5e9", task: "story-outline" },
  { id: "characters", icon: Users, label: "角色三视图", desc: "AI生成角色设计图", color: "#ec4899", task: "character-bible" },
  { id: "img2video", icon: Video, label: "首帧图生视频", desc: "上传图片生成动态视频", color: "#f59e0b", task: "story-outline" },
  { id: "audio2video", icon: Music, label: "音频生视频", desc: "上传音频驱动画面", color: "#10b981", task: "story-outline" },
]

interface Node {
  id: string
  type: string
  label: string
  x: number
  y: number
  content: string
  loading: boolean
  error: boolean
  icon: string
  color: string
  nodes?: any[]
  characters?: any[]
}

const iconMap: Record<string, string> = {
  script: "📝", characters: "👁️", img2video: "🎬", audio2video: "🎵",
}

export default function CanvasPage() {
  const [name, setName] = useState("未命名项目")
  const [nodes, setNodes] = useState<Node[]>([])
  const [panel, setPanel] = useState(true)
  const [grid, setGrid] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [promptOpen, setPromptOpen] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState("")
  const abortRef = useRef<AbortController | null>(null)

  const addNode = useCallback((action: QAction) => {
    const id = crypto.randomUUID()
    const newNode: Node = {
      id,
      type: action.id,
      label: action.label,
      x: 320 + (nodes.length % 3) * 320,
      y: 140 + Math.floor(nodes.length / 3) * 340,
      content: "",
      loading: true,
      error: false,
      icon: action.id,
      color: action.color,
    }

    setNodes((prev) => [...prev, newNode])
    setGenerating(true)

    // Abort any previous request
    if (abortRef.current) {
      abortRef.current.abort()
    }
    abortRef.current = new AbortController()

    const prompt = customPrompt || `${action.desc}`
    setCustomPrompt("")
    setPromptOpen(null)

    fetch(`${API}/${action.task}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: { prompt, type: action.id } }),
      signal: abortRef.current.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        const out = data.output
        let text = ""

        if (action.task === "character-bible" && out?.characters) {
          text = "🎭 " + (out.title || "角色设计") + "\n\n"
          text += out.characters
            .map((c: any) => `【${c.name}】${c.role}\n${c.trait}`)
            .join("\n\n")
        } else if (out?.nodes) {
          text = "📜 " + (out.title || action.label) + "\n\n"
          text += out.nodes
            .map((nd: any, i: number) => `▶ ${nd.title}\n  ${nd.summary}`)
            .join("\n\n")
        } else if (out?.characters) {
          text = "🎭 " + (out.title || action.label) + "\n\n"
          text += out.characters
            .map((c: any) => `【${c.name}】${c.role}\n${c.trait}`)
            .join("\n\n")
        } else if (out?.title) {
          text = "📜 " + out.title + "\n" + (out.note || "")
        } else {
          text = JSON.stringify(out, null, 2)
        }

        setNodes((prev) =>
          prev.map((n) =>
            n.id === id
              ? { ...n, content: text, loading: false, nodes: out?.nodes, characters: out?.characters }
              : n,
          ),
        )
        setGenerating(false)
      })
      .catch((err) => {
        if (err.name === "AbortError") {
          // Node was removed or superseded
          setNodes((prev) => prev.filter((n) => n.id !== id))
        } else {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === id
                ? { ...n, content: "生成失败，请重试", loading: false, error: true }
                : n,
            ),
          )
        }
        setGenerating(false)
      })
  }, [nodes.length, customPrompt])

  const removeNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return (
    <div className="flex h-screen flex-col bg-[#0f0f0f] text-[#e0e0e0]">
      {/* Top Nav */}
      <nav className="flex h-12 shrink-0 items-center gap-3 border-b border-[#ffffff0d] bg-[#141414] px-4">
        <Link
          to="/"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[#888] hover:bg-[#ffffff08] hover:text-[#ccc] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回
        </Link>
        <div className="h-5 w-px bg-[#ffffff0d]" />
        <input
          className="w-48 bg-transparent text-sm font-medium text-[#e0e0e0] outline-none placeholder:text-[#555]"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="未命名项目"
        />
        <div className="flex-1" />
        <span className="text-[11px] text-[#555]">
          千问 · {generating ? "生成中..." : nodes.length > 0 ? `已生成 ${nodes.length} 个节点` : "就绪"}
        </span>
        <button className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[#f7a600] hover:bg-[#ffffff08] transition-colors">
          <Crown className="h-3 w-3" />
          会员超市
        </button>
        <button className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[#ff4757] hover:bg-[#ffffff08] transition-colors">
          <Gift className="h-3 w-3" />
          618红包
        </button>
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7]" />
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <div className="flex w-14 shrink-0 flex-col items-center gap-1.5 border-r border-[#ffffff0d] bg-[#141414] py-3">
          <ToolBtn icon={Plus} tip="添加节点" />
          <ToolBtn icon={Wand2} tip="工具箱" />
          <ToolBtn icon={Image} tip="素材库" />
          <div className="flex-1" />
          <ToolBtn icon={Layers} tip="历史记录" />
          <ToolBtn icon={HelpCircle} tip="帮助中心" />
          <ToolBtn icon={Settings} tip="设置" />
        </div>

        {/* Center Canvas */}
        <div className="relative flex-1 overflow-auto bg-[#0a0a0a]">
          {/* Grid background */}
          {grid && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
          )}

          {/* Nodes */}
          {nodes.map((n) => (
            <div
              key={n.id}
              className="absolute rounded-2xl border shadow-2xl transition-shadow hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
              style={{
                left: n.x,
                top: n.y,
                width: 280,
                minHeight: 180,
                maxHeight: 320,
                background: `linear-gradient(135deg, ${n.color}10, ${n.color}05)`,
                borderColor: n.loading ? `${n.color}40` : "#ffffff10",
              }}
            >
              {/* Node header */}
              <div className="flex items-center gap-2 border-b border-[#ffffff08] px-4 py-3">
                <span className="text-lg">{iconMap[n.icon] || "📄"}</span>
                <span className="flex-1 truncate text-[13px] font-medium text-[#e0e0e0]">
                  {n.label}
                </span>
                <button
                  onClick={() => removeNode(n.id)}
                  className="rounded-lg p-1 text-[#555] hover:bg-[#ffffff08] hover:text-[#e0e0e0] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Node content */}
              <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: 240 }}>
                {n.loading ? (
                  <div className="flex items-center gap-2 py-4 text-[#666]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">千问 AI 生成中...</span>
                  </div>
                ) : n.error ? (
                  <div className="py-4 text-center">
                    <p className="mb-2 text-xs text-[#ff4757]">{n.content}</p>
                    <button
                      onClick={() => {
                        const action = ACTIONS.find((a) => a.id === n.icon) || ACTIONS[0]
                        removeNode(n.id)
                        addNode(action)
                      }}
                      className="rounded-lg bg-[#ffffff08] px-3 py-1.5 text-[11px] text-[#aaa] hover:bg-[#ffffff12] transition-colors"
                    >
                      重新生成
                    </button>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-[#aaa]">
                    {n.content}
                  </pre>
                )}
              </div>

              {/* Node footer */}
              <div className="flex items-center gap-2 border-t border-[#ffffff08] px-4 py-2">
                <span className="text-[10px] text-[#555]">千问 qwen-plus</span>
                <span
                  className="ml-auto rounded-full px-2 py-0.5 text-[10px]"
                  style={{ background: n.color + "20", color: n.color }}
                >
                  {n.loading ? "生成中" : n.error ? "失败" : "完成"}
                </span>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-[#444]">
              <Clapperboard className="mb-4 h-12 w-12 opacity-15" />
              <p className="mb-1 text-sm font-medium">点击右侧面板开始创作</p>
              <p className="text-xs">千问 AI 将为您生成剧本与角色</p>
            </div>
          )}

          {/* Bottom zoom bar */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-xl border border-[#ffffff0d] bg-[#141414]/95 px-3 py-1.5 backdrop-blur-sm shadow-lg">
            <MiniBtn icon={Maximize2} tip="整理画布" />
            <div className="mx-1 h-4 w-px bg-[#ffffff0d]" />
            <MiniBtn icon={Map} tip="小地图" />
            <MiniBtn icon={Grid3x3} tip="网格" active={grid} onClick={() => setGrid(!grid)} />
            <div className="mx-1 h-4 w-px bg-[#ffffff0d]" />
            <MiniBtn icon={ZoomOut} tip="缩小" />
            <span className="min-w-[38px] text-center text-[11px] tabular-nums text-[#888]">100%</span>
            <MiniBtn icon={ZoomIn} tip="放大" />
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex w-[272px] shrink-0 flex-col border-l border-[#ffffff0d] bg-[#141414]">
          {/* Quick Generate */}
          <div className="p-4">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#666]">
              快速生成
            </p>
            <div className="space-y-2">
              {ACTIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    // For img2video and audio2video, open prompt input first
                    if (a.id === "img2video" || a.id === "audio2video") {
                      setPromptOpen(a.id)
                      return
                    }
                    addNode(a)
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl border border-[#ffffff0d] bg-[#1a1a1a] p-3.5 text-left transition-all hover:border-[#ffffff18] hover:bg-[#222] active:scale-[0.98]"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: a.color + "15", color: a.color }}
                  >
                    <a.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{a.label}</p>
                    <p className="text-[11px] text-[#666]">{a.desc}</p>
                  </div>
                  <Sparkles className="h-3 w-3 shrink-0 text-[#555] group-hover:text-[#f7a600] transition-colors" />
                </button>
              ))}
            </div>

            {/* Custom prompt input for img2video/audio2video */}
            {promptOpen && (
              <div className="mt-3 space-y-2 rounded-xl border border-[#ffffff10] bg-[#1a1a1a] p-3">
                <p className="text-[11px] text-[#888]">
                  {promptOpen === "img2video" ? "上传首帧图片并输入描述" : "上传音频文件并输入描述"}
                </p>
                <input
                  className="w-full rounded-lg border border-[#ffffff10] bg-[#0f0f0f] px-3 py-2 text-xs text-[#e0e0e0] outline-none placeholder:text-[#555]"
                  placeholder="输入提示词..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const action = ACTIONS.find((a) => a.id === promptOpen)
                      if (action) addNode(action)
                    }}
                    className="flex-1 rounded-lg bg-[#f7a600] py-1.5 text-[11px] font-medium text-black hover:bg-[#ffb833] transition-colors"
                  >
                    开始生成
                  </button>
                  <button
                    onClick={() => setPromptOpen(null)}
                    className="rounded-lg bg-[#ffffff08] px-3 py-1.5 text-[11px] text-[#888] hover:bg-[#ffffff12] transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Node Panel toggle */}
          <button
            onClick={() => setPanel(!panel)}
            className="flex items-center justify-center gap-1.5 border-t border-[#ffffff0d] py-3 text-[11px] text-[#777] hover:text-[#aaa] transition-colors"
          >
            {panel ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
            节点面板
          </button>

          {/* Node list */}
          {panel && (
            <div className="border-t border-[#ffffff0d] p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#666]">
                画布元素
              </p>
              {nodes.length === 0 ? (
                <p className="py-6 text-center text-[11px] text-[#555]">
                  点击上方按钮开始生成
                </p>
              ) : (
                <div className="max-h-[200px] space-y-1 overflow-y-auto">
                  {nodes.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-[#ffffff06] transition-colors"
                    >
                      <span className="text-sm">
                        {n.loading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#f7a600]" />
                        ) : (
                          iconMap[n.icon] || "📄"
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-[#aaa]">
                        {n.label}
                      </span>
                      <button
                        onClick={() => removeNode(n.id)}
                        className="shrink-0 rounded p-1 text-[#555] hover:text-[#ff4757] transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 text-[10px] text-[#555]">
                共 {nodes.length} 个节点 · 千问
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ToolBtn({ icon: Icon, tip }: { icon: any; tip: string }) {
  return (
    <button
      title={tip}
      className="flex h-10 w-10 items-center justify-center rounded-xl text-[#666] hover:bg-[#ffffff08] hover:text-[#aaa] transition-colors"
    >
      <Icon className="h-4.5 w-4.5" />
    </button>
  )
}

function MiniBtn({
  icon: Icon,
  tip,
  active,
  onClick,
}: {
  icon: any
  tip: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      title={tip}
      onClick={onClick}
      className={
        "flex h-7 w-7 items-center justify-center rounded-lg transition-colors " +
        (active
          ? "bg-[#ffffff12] text-[#e0e0e0]"
          : "text-[#666] hover:bg-[#ffffff08] hover:text-[#aaa]")
      }
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  )
}
