import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Clapperboard, Crown, Heart, Play, Search,
  ShieldCheck, Sparkles, Star, X, ArrowRight, Plus, Eye, User, Zap, Gift,
} from 'lucide-react'

type HeroSlide = { title: string; subtitle: string; meta: string; route: string; image?: string; video?: string; tone: string }
type WorkCard = { title: string; author: string; tag: string; label?: string; route: string; episodeCount: number; badge?: string; image?: string; video?: string; tone: string }
type RecentProject = { title: string; date: string }

const QUICK_PROMPT_STORAGE_KEY = "playdrama.quickCreatePrompt.v1"
const DEFAULT_QUICK_PROMPT = "普通女孩发现自己每次刷到同一条短剧，现实都会跟着改写"

const navTags = ["全部","AI互动短剧大赛","大乱斗 vol.2","精选剧本","专业影视","短剧漫剧","互动短剧","商业广告","动漫游戏","教育生活","工具集"]

const heroSlides: HeroSlide[] = [
  {title:"团队协作 正式上线",subtitle:"多人共创",meta:"剧本、分镜、视频、发布验收同步协作",route:"/studio/story",video:"/marketing/playdrama-promo-20260522.mp4",tone:"from-[oklch(15%_0.04_250)] via-[oklch(20%_0.05_185)] to-[oklch(10%_0.025_250)]"},
  {title:"618 限时直降",subtitle:"创作活动",meta:"发布互动短剧，领取模型额度",route:"/studio/creation",image:"/marketing/playdrama-hero.png",tone:"from-[oklch(28%_0.12_25)] via-[oklch(20%_0.05_250)] to-[oklch(52%_0.16_40)]"},
  {title:"AI 视频生成 2.0",subtitle:"极速出片",meta:"Seedance 2.0 一句话生成短剧",route:"/studio/video",video:"/marketing/playdrama-promo-20260522.mp4",tone:"from-[oklch(18%_0.08_270)] via-[oklch(12%_0.025_250)] to-[oklch(28%_0.10_185)]"},
  {title:"AI 换脸 & 角色裂变",subtitle:"新功能",meta:"一键生成多角色多集剧本",route:"/studio/characters",image:"/marketing/playdrama-hero.png",tone:"from-[oklch(22%_0.12_340)] via-[oklch(15%_0.04_250)] to-[oklch(35%_0.14_290)]"},
  {title:"故事互动引擎",subtitle:"分支叙事",meta:"多结局互动短剧 付费墙节点",route:"/studio/storyboard",video:"/marketing/playdrama-promo-20260522.mp4",tone:"from-[oklch(20%_0.08_285)] via-[oklch(34%_0.14_110)] to-[oklch(12%_0.03_250)]"},
  {title:"批量分发",subtitle:"一键发布",meta:"多平台同步分发 数据回传",route:"/studio/publish",image:"/marketing/playdrama-hero.png",tone:"from-[oklch(38%_0.14_252)] via-[oklch(70%_0.12_80)] to-[oklch(16%_0.04_250)]"},
  {title:"CLI & Skill 生态",subtitle:"开发者工具",meta:"命令行创作 + 技能市场",route:"/studio/skills",video:"/marketing/playdrama-promo-20260522.mp4",tone:"from-[oklch(15%_0.06_185)] via-[oklch(8%_0.02_250)] to-[oklch(25%_0.08_210)]"},
]

const works: WorkCard[] = [
  {title:"韦斯安德森风格广告短片",author:"夏目",tag:"广告短片",label:"先锋",route:"/studio/video",episodeCount:5,badge:"精选",image:"/marketing/playdrama-hero.png",tone:"from-[oklch(82%_0.02_85)] via-[oklch(66%_0.08_70)] to-[oklch(22%_0.06_250)]"},
  {title:"留在此刻 Stay For Tonight",author:"翻山计划",tag:"MV短片",label:"先锋",route:"/studio/video",episodeCount:7,image:"/marketing/playdrama-hero.png",tone:"from-[oklch(62%_0.12_80)] via-[oklch(42%_0.10_35)] to-[oklch(16%_0.04_250)]"},
  {title:"U belong 2 me ^_^",author:"SUNLee",tag:"AI音乐MV",label:"先锋",route:"/studio/creation",episodeCount:320,video:"/marketing/playdrama-promo-20260522.mp4",tone:"from-[oklch(50%_0.16_20)] via-[oklch(24%_0.08_250)] to-[oklch(12%_0.03_250)]"},
  {title:"温情短片「几楼了」",author:"XuanHao",tag:"悬疑互动",label:"专业",route:"/studio/story",episodeCount:145,image:"/marketing/playdrama-hero.png",tone:"from-[oklch(72%_0.09_185)] via-[oklch(60%_0.12_50)] to-[oklch(14%_0.03_250)]"},
  {title:"The fourth day",author:"191****0001",tag:"CG短片",label:"先锋",route:"/studio/video",episodeCount:11,video:"/marketing/playdrama-promo-20260522.mp4",tone:"from-[oklch(78%_0.018_250)] via-[oklch(30%_0.05_270)] to-[oklch(10%_0.02_250)]"},
  {title:"Crazy Fly",author:"胖马",tag:"动画短片",label:"专业",route:"/studio/video",episodeCount:11,image:"/marketing/playdrama-hero.png",tone:"from-[oklch(76%_0.08_75)] via-[oklch(38%_0.08_80)] to-[oklch(14%_0.03_250)]"},
  {title:"奥迪 RS6 Avant《The Same Arc》",author:"青灰色",tag:"汽车广告",label:"先锋",route:"/studio/video",episodeCount:173,video:"/marketing/playdrama-promo-20260522.mp4",tone:"from-[oklch(38%_0.14_252)] via-[oklch(70%_0.12_80)] to-[oklch(16%_0.04_250)]"},
  {title:"《回声》",author:"fateless",tag:"剧情短片",label:"专业",route:"/studio/story",episodeCount:100,image:"/marketing/playdrama-hero.png",tone:"from-[oklch(20%_0.08_285)] via-[oklch(34%_0.14_110)] to-[oklch(12%_0.03_250)]"},
  {title:"AI一镜到底 欢迎来到石湾镇",author:"ZeteroGeneouZ",tag:"纪实短片",label:"先锋",route:"/studio/video",episodeCount:0,badge:"新作",video:"/marketing/playdrama-promo-20260522.mp4",tone:"from-[oklch(15%_0.06_185)] via-[oklch(8%_0.02_250)] to-[oklch(25%_0.08_210)]"},
  {title:"hyper中式，未来残响",author:"小明MINJA",tag:"艺术短片",label:"先锋",route:"/studio/video",episodeCount:1,image:"/marketing/playdrama-hero.png",tone:"from-[oklch(22%_0.12_340)] via-[oklch(15%_0.04_250)] to-[oklch(35%_0.14_290)]"},
  {title:"宇宙仲裁者",author:"niu_456000",tag:"科幻短片",label:"先锋",route:"/studio/video",episodeCount:195,video:"/marketing/playdrama-promo-20260522.mp4",tone:"from-[oklch(50%_0.16_20)] via-[oklch(24%_0.08_250)] to-[oklch(12%_0.03_250)]"},
  {title:"《月老有点忙》",author:"牛斗",tag:"喜剧短片",label:"专业",route:"/studio/video",episodeCount:77,image:"/marketing/playdrama-hero.png",tone:"from-[oklch(76%_0.08_75)] via-[oklch(38%_0.08_80)] to-[oklch(14%_0.03_250)]"},
  {title:"只狼CG预告片《野狼》",author:"sunone999",tag:"CG预告",label:"先锋",route:"/studio/video",episodeCount:27,video:"/marketing/playdrama-promo-20260522.mp4",tone:"from-[oklch(38%_0.14_252)] via-[oklch(70%_0.12_80)] to-[oklch(16%_0.04_250)]"},
  {title:"Kite",author:"bling不凝",tag:"动画短片",label:"先锋",route:"/studio/video",episodeCount:1,image:"/marketing/playdrama-hero.png",tone:"from-[oklch(20%_0.08_285)] via-[oklch(34%_0.14_110)] to-[oklch(12%_0.03_250)]"},
  {title:"《开场》",author:"Miorning喵咛",tag:"短剧",label:"专业",route:"/studio/video",episodeCount:1,video:"/marketing/playdrama-promo-20260522.mp4",tone:"from-[oklch(15%_0.04_250)] via-[oklch(20%_0.05_185)] to-[oklch(10%_0.025_250)]"},
  {title:"死于罗曼蒂克",author:"yoimachigusa",tag:"大乱斗vol.2 最佳画风",label:"先锋",route:"/studio/creation",episodeCount:466,badge:"最佳画风",image:"/marketing/playdrama-hero.png",tone:"from-[oklch(82%_0.02_85)] via-[oklch(66%_0.08_70)] to-[oklch(22%_0.06_250)]"},
  {title:"呱比的悲催时刻",author:"Muertu木二土",tag:"喜剧动画",label:"专业",route:"/studio/video",episodeCount:30,video:"/marketing/playdrama-promo-20260522.mp4",tone:"from-[oklch(62%_0.12_80)] via-[oklch(42%_0.10_35)] to-[oklch(16%_0.04_250)]"},
  {title:"UnTouchable AI音乐MV短片",author:"Zeno",tag:"AI音乐MV",label:"先锋",route:"/studio/video",episodeCount:578,image:"/marketing/playdrama-hero.png",tone:"from-[oklch(50%_0.16_20)] via-[oklch(24%_0.08_250)] to-[oklch(12%_0.03_250)]"},
  {title:"五月天与我们的故事",author:"310",tag:"MV短片",label:"先锋",route:"/studio/video",episodeCount:5,video:"/marketing/playdrama-promo-20260522.mp4",tone:"from-[oklch(72%_0.09_185)] via-[oklch(60%_0.12_50)] to-[oklch(14%_0.03_250)]"},
  {title:"铁兵小队 一键出片工作流",author:"YOUNG",tag:"科幻动漫",label:"先锋",route:"/studio/characters",episodeCount:701,badge:"教程",image:"/marketing/playdrama-hero.png",tone:"from-[oklch(38%_0.14_252)] via-[oklch(70%_0.12_80)] to-[oklch(16%_0.04_250)]"},
]

const recentProjects: RecentProject[] = [
  { title: "《天机变谪仙人》第四集 爱与勇气 - 副本", date: "2026-06-13" },
  { title: "未命名项目", date: "2026-06-13" },
  { title: "未命名项目", date: "2026-06-13" },
  { title: "未命名项目", date: "2026-06-13" },
  { title: "未命名项目", date: "2026-06-12" },
]

function HeroBanner({ slides, active, setActive }: {
  slides: HeroSlide[]; active: number; setActive: (i: number) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const slide = slides[active]

  useEffect(() => {
    timerRef.current = setInterval(() => setActive((active + 1) % slides.length), 5000);
    return () => clearInterval(timerRef.current);
  }, [active]);

  useEffect(() => {
    if (videoRef.current && slide.video) { videoRef.current.load(); videoRef.current.play().catch(() => {}); }
  }, [active, slide.video]);

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '14.4 / 2.8', maxHeight: 420 }}>
      <div className={`absolute inset-0 bg-gradient-to-r ${slide.tone}`} />
      {slide.video ? (
        <video ref={videoRef} src={slide.video} muted loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-70" />
      ) : slide.image ? (
        <img src={slide.image} alt={slide.title} className="absolute inset-0 h-full w-full object-cover opacity-50" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      <div className="absolute inset-0 z-10 flex flex-col justify-center px-8 md:px-16">
        <span className="inline-block rounded-full border border-[oklch(100%_0_0_/_0.18)] bg-[oklch(100%_0_0_/_0.10)] px-4 py-1.5 text-xs font-bold text-white backdrop-blur-sm w-fit">{slide.subtitle}</span>
        <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">{slide.title}</h2>
        <p className="mt-3 max-w-xl text-sm text-[oklch(100%_0_0_/_0.75)] md:text-base">{slide.meta}</p>
        <Link to={slide.route} className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-[oklch(94%_0_0)]">立即体验 <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <button onClick={() => setActive((active - 1 + slides.length) % slides.length)} className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors"><ChevronLeft className="h-5 w-5" /></button>
      <button onClick={() => setActive((active + 1) % slides.length)} className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors"><ChevronRight className="h-5 w-5" /></button>
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setActive(i)} className={`rounded-full transition-all duration-300 ${i === active ? 'h-1.5 w-5 bg-white' : 'h-1.5 w-1.5 bg-white/40'}`} />
        ))}
      </div>
    </div>
  )
}

function WorkCardView({ work, index }: { work: WorkCard; index: number }) {
  const [hovered, setHovered] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (hovered && videoRef.current && work.video) {
      videoRef.current.currentTime = 0; videoRef.current.play().catch(() => {});
    } else if (videoRef.current) { videoRef.current.pause(); }
  }, [hovered, work.video]);

  return (
    <Link to={work.route} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="group block overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-video overflow-hidden bg-[#1a1a1a]">
        <div className={`absolute inset-0 bg-gradient-to-br ${work.tone} opacity-60`} />
        {work.video && <video ref={videoRef} src={work.video} muted loop playsInline className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${hovered ? 'opacity-100' : 'opacity-0'}`} />}
        {work.image && <img src={work.image} alt={work.title} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${hovered && work.video ? 'opacity-0' : 'opacity-50'}`} />}
        <div className="absolute left-2 top-2 z-10 flex gap-1.5">
          {work.label === '先锋' && <span className="rounded bg-[oklch(58%_0.18_290_/_0.5)] px-1.5 py-0.5 text-[10px] font-bold text-[oklch(82%_0.10_290)] backdrop-blur-sm">先锋</span>}
          {work.label === '专业' && <span className="rounded bg-[oklch(62%_0.16_155_/_0.5)] px-1.5 py-0.5 text-[10px] font-bold text-[oklch(82%_0.10_155)] backdrop-blur-sm">专业</span>}
          {work.badge && <span className="rounded bg-[oklch(100%_0_0_/_0.25)] px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">{work.badge}</span>}
        </div>
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-[11px] text-white backdrop-blur-sm"><Eye className="h-3 w-3" /> {work.episodeCount}</div>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-black/70 via-black/20 to-transparent pb-6 pt-16 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="rounded-full border border-white/30 bg-white/10 px-6 py-2 text-[13px] font-bold text-white backdrop-blur-sm">查看创作过程</span>
        </div>
      </div>
      <div className="bg-[#1f1f1f] p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[oklch(70%_0.18_185_/_0.2)] text-[10px] font-bold text-[oklch(78%_0.12_185)]">{work.author[0]}</div>
          <span className="text-xs text-[#a8a8a8]">{work.author}</span>
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-[#f7f7f7]">{work.title}</h3>
        <p className="mt-1 text-[11px] text-[#727272]">{work.tag}</p>
      </div>
    </Link>
  )
}

function RecentProjectCard({ project }: { project: RecentProject }) {
  return (
    <div className="w-[60vw] shrink-0 md:w-auto">
      <div className="group cursor-pointer overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-1">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-[#2a2a2a]">
          <div className="flex h-full w-full items-center justify-center bg-[#1f1f1f] transition-transform duration-500 group-hover:scale-110">
            <Clapperboard className="h-12 w-12 text-white/15" />
          </div>
        </div>
        <div className="mt-2 px-1"><p className="truncate text-[13px] font-medium text-[#f7f7f7]">{project.title}</p><p className="mt-0.5 text-[11px] text-[#727272]">{project.date}</p></div>
      </div>
    </div>
  )
}

function CreateNewCard() {
  return (
    <div className="aspect-video w-[60vw] shrink-0 md:w-full">
      <Link to="/canvas" className="block cursor-pointer overflow-hidden rounded-xl">
        <div className="relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl bg-[#1f1f1f] transition-colors hover:bg-[#252525]">
          <Plus className="h-8 w-8 text-[#919191]" />
          <span className="text-[14px] font-medium text-[#f7f7f7]">开始创作</span>
        </div>
        <div className="flex gap-px bg-[#171717] px-2 py-2.5">
          <button className="flex h-[43px] min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-xl bg-[oklch(100%_0_0_/_0.04)] px-3 text-[13px] text-[#f7f7f7] hover:bg-[oklch(100%_0_0_/_0.06)]"><Sparkles className="h-3.5 w-3.5 text-[oklch(78%_0.12_185)]" /><span className="truncate">Seedance 2.0</span></button>
        </div>
      </Link>
    </div>
  )
}

function VipModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  const plans = [{name:"月度会员",price:"34折 /月",original:"¥99",features:["Seedance 2.0 额度","无限画布节点","高清导出","去水印","优先客服"],highlight:false},{name:"季度会员",price:"34折 /季",original:"¥297",features:["Seedance 2.0 额度x3","无限画布节点","高清导出","去水印","优先客服","协作人数+3"],highlight:true},{name:"年度会员",price:"34折 /年",original:"¥1188",features:["Seedance 2.0 额度x12","无限画布节点","高清导出","去水印","优先客服","协作人数不限","专属模型"],highlight:false}]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-4xl rounded-2xl border border-[oklch(100%_0_0_/_0.08)] bg-[#171717] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-[#f7f7f7] flex items-center gap-2"><Crown className="h-5 w-5 text-[oklch(82%_0.12_80)]" /> 升级会员</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-[oklch(100%_0_0_/_0.06)] text-[#a8a8a8]"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={`rounded-xl border p-5 text-center ${p.highlight ? 'border-[oklch(70%_0.16_185)] bg-[oklch(70%_0.16_185_/_0.06)] ring-1 ring-[oklch(70%_0.16_185)]' : 'border-[oklch(100%_0_0_/_0.06)] bg-[oklch(100%_0_0_/_0.02)]'}`}>
              {p.highlight && <span className="inline-block rounded-full bg-[oklch(70%_0.16_185)] px-3 py-0.5 text-[10px] font-bold text-black mb-2">最受欢迎</span>}
              <h3 className="text-lg font-bold text-[#f7f7f7]">{p.name}</h3>
              <div className="mt-2 flex items-baseline justify-center gap-1"><span className="text-sm text-[#727272] line-through">{p.original}</span><span className="text-2xl font-black text-[oklch(78%_0.12_185)]">{p.price}</span></div>
              <ul className="mt-4 space-y-1.5 text-left">
                {p.features.map((f) => <li key={f} className="flex items-center gap-2 text-xs text-[#a8a8a8]"><CheckSVG /> {f}</li>)}
              </ul>
              <Link to="/studio/creation" className={`mt-5 block w-full rounded-xl py-2.5 text-sm font-bold transition-colors ${p.highlight ? 'bg-[oklch(70%_0.16_185)] text-black hover:bg-[oklch(76%_0.14_185)]' : 'border border-[oklch(100%_0_0_/_0.12)] text-[#f7f7f7] hover:bg-[oklch(100%_0_0_/_0.06)]'}`}>立即订阅</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CheckSVG() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[oklch(70%_0.16_155)]"><path d="M20 6 9 17l-5-5"/></svg>;
}

export default function Landing() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [activeTag, setActiveTag] = useState("全部")
  const [visibleCount, setVisibleCount] = useState(12)
  const [quickPrompt, setQuickPrompt] = useState(() => localStorage.getItem(QUICK_PROMPT_STORAGE_KEY) || DEFAULT_QUICK_PROMPT)
  const [promoClosed, setPromoClosed] = useState(false)
  const [vipOpen, setVipOpen] = useState(false)
  const [countdown, setCountdown] = useState({ h: 3, m: 0, s: 0 })

  const persistQuickPrompt = useCallback(() => {
    localStorage.setItem(QUICK_PROMPT_STORAGE_KEY, quickPrompt);
  }, [quickPrompt]);

  useEffect(() => {
    const end = Date.now() + 3 * 3600 * 1000;
    const t = setInterval(() => {
      const diff = end - Date.now();
      if (diff <= 0) { setCountdown({ h: 0, m: 0, s: 0 }); clearInterval(t); return; }
      setCountdown({ h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const filteredWorks = useMemo(() => activeTag === "全部" ? works : works.filter(w => w.tag.includes(activeTag) || activeTag.includes(w.tag)), [activeTag]);
  const visibleWorks = useMemo(() => filteredWorks.slice(0, visibleCount), [filteredWorks, visibleCount]);
  const fmt = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="min-h-screen bg-[#141414] text-[#f7f7f7]">

      {/* PROMO BAR */}
      {!promoClosed && (
        <div className="relative flex w-full cursor-pointer items-center justify-center overflow-hidden py-[10px]"
          style={{ background: 'linear-gradient(90deg, rgb(213, 245, 255))', color: '#000' }}>
          <button onClick={() => setPromoClosed(true)} className="absolute right-3 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#141414] hover:text-black"><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-[3px]" style={{ color: '#fff', backgroundColor: '#F50095', fontSize: 14, fontWeight: 600 }}>
              <Gift className="h-3 w-3" /><span>活动剩余</span><span className="ml-1.5 font-mono">{countdown.h}天 {fmt(countdown.m)}:{fmt(countdown.s)}</span>
            </div>
            <span className="text-sm font-medium" style={{ fontFamily: '"Microsoft YaHei", sans-serif', fontSize: 15 }}>🎉 <strong>618限时直降 · 折上再减¥618</strong>｜创作会员低至 <span style={{ color: '#068EEF', fontWeight: 800 }}>34折</span>，最高再赠 <span style={{ color: '#068EEF', fontWeight: 800 }}>200条</span> Seedance 2.0，券后低至 <span style={{ color: '#068EEF', fontWeight: 800 }}>0.32元/秒</span> 🎁</span>
            <Link to="/canvas" className="rounded-full border-[1.5px] border-black px-4 py-0.5 text-sm font-medium text-black shrink-0 hover:bg-black/5" style={{ fontFamily: '"Microsoft YaHei", sans-serif', fontSize: 14 }}>限时抢购</Link>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-[oklch(100%_0_0_/_0.06)] bg-[#141414]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[80px] max-w-[1440px] items-center justify-between px-4 md:px-[10px]">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[oklch(70%_0.18_185)]"><Clapperboard className="h-4 w-4 text-black" /></div>
              <span className="text-lg font-black tracking-tight">PlayDrama</span>
            </Link>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            <Link to="/canvas" className="rounded-xl px-3 py-1.5 text-[13px] font-medium text-[#a8a8a8] transition-colors hover:bg-[oklch(100%_0_0_/_0.04)] hover:text-[#f7f7f7]">开始创作</Link>
            <Link to="/studio/story" className="rounded-xl px-3 py-1.5 text-[13px] font-medium text-[#a8a8a8] transition-colors hover:bg-[oklch(100%_0_0_/_0.04)] hover:text-[#f7f7f7]">互动短剧</Link>
            <Link to="/studio/video" className="rounded-xl px-3 py-1.5 text-[13px] font-medium text-[#a8a8a8] transition-colors hover:bg-[oklch(100%_0_0_/_0.04)] hover:text-[#f7f7f7]">视频生成</Link>
          </nav>
          <div className="flex items-center gap-2">
            <button className="flex h-10 items-center gap-1 rounded-xl border border-[rgba(245,174,13,0.30)] bg-[#FFF3CF] px-3 text-[13px] font-medium text-[#773E00] transition-colors hover:bg-[#FFEDAB]"><TrophySvg /> 创作者挑战赛</button>
            <button onClick={() => setVipOpen(true)} className="flex h-10 items-center gap-1 rounded-xl border border-[oklch(100%_0_0_/_0.08)] px-3 text-[13px] font-medium text-[#05A3C5] transition-colors hover:bg-[oklch(100%_0_0_/_0.04)]"><Crown className="h-3.5 w-3.5" /> 会员超市</button>
            <Link to="/studio/overview" className="flex h-10 items-center gap-1 rounded-xl bg-[oklch(100%_0_0_/_0.06)] px-3 text-[13px] font-medium text-[#f7f7f7] transition-colors hover:bg-[oklch(100%_0_0_/_0.10)]"><User className="h-3.5 w-3.5" /> 进入工作室</Link>
          </div>
        </div>
      </header>

      <main>
        <div className="mx-auto w-full max-w-[1440px] px-3 md:px-[10px]">

          {/* HERO */}
          <section className="pt-4 pb-2">
            <HeroBanner slides={heroSlides} active={activeSlide} setActive={setActiveSlide} />
          </section>

          {/* RECENT PROJECTS */}
          <section className="py-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight">个人最近项目</h2>
              <Link to="/studio/overview" className="flex items-center gap-1 text-[13px] font-medium text-[#a8a8a8] hover:text-[#f7f7f7] transition-colors">全部项目 <ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="scrollbar-hide -mx-1 flex gap-3 overflow-x-auto px-1 pb-2 md:mx-0 md:grid md:grid-cols-6 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
              <CreateNewCard />
              {recentProjects.map((p, i) => <RecentProjectCard key={i} project={p} />)}
            </div>
          </section>

          {/* TV SHOW */}
          <section className="py-8">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-black tracking-tight">TV Show</h2>
                <span className="inline-flex items-center gap-1 rounded bg-[oklch(74%_0.16_80_/_0.18)] px-2 py-0.5 text-[10px] font-bold text-[oklch(78%_0.16_80)]"><Zap className="h-2.5 w-2.5" /> NEW</span>
              </div>
              <div className="hidden shrink-0 items-center gap-2 md:flex"><div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#727272]" /><input className="h-9 w-52 rounded-xl border border-[oklch(100%_0_0_/_0.06)] bg-[oklch(100%_0_0_/_0.02)] pl-9 pr-3 text-xs text-[#f7f7f7] outline-none placeholder:text-[#525252] focus:border-[oklch(70%_0.16_185)]" placeholder="请输入搜索内容" /></div></div>
            </div>
            <div className="mb-6 flex items-center gap-2">
              <div className="flex flex-wrap gap-1.5">
                {navTags.map((tag) => (
                  <button key={tag} onClick={() => { setActiveTag(tag); setVisibleCount(12); }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                      activeTag === tag
                        ? 'bg-[oklch(100%_0_0_/_0.10)] text-[#f7f7f7] ring-1 ring-[oklch(100%_0_0_/_0.06)]'
                        : 'bg-[oklch(100%_0_0_/_0.03)] text-[#727272] hover:bg-[oklch(100%_0_0_/_0.06)] hover:text-[#a8a8a8]'
                    }`}>{tag}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
              {visibleWorks.map((work, i) => <WorkCardView key={i} work={work} index={i} />)}
            </div>
            {visibleCount < filteredWorks.length ? (
              <div className="mt-10 flex justify-center">
                <button onClick={() => setVisibleCount(c => c + 12)} className="rounded-full border border-[oklch(100%_0_0_/_0.10)] px-6 py-2.5 text-sm font-bold text-[#a8a8a8] transition-colors hover:border-[oklch(100%_0_0_/_0.18)] hover:bg-[oklch(100%_0_0_/_0.04)] hover:text-[#f7f7f7]">加载更多</button>
              </div>
            ) : (
              <div className="mt-10 flex justify-center text-xs text-[#525252]">没有更多了</div>
            )}
          </section>

          {/* QUICK CREATE BAR — fixed bottom like liblib.tv */}
          <div className="sticky bottom-0 z-30 -mx-3 border-t border-[oklch(100%_0_0_/_0.06)] bg-[#141414]/95 px-3 py-3 backdrop-blur-xl md:mx-0 md:px-0">
            <div className="mx-auto flex max-w-2xl items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-[oklch(100%_0_0_/_0.08)] bg-[oklch(100%_0_0_/_0.02)] px-4 py-2.5">
                <Sparkles className="h-4 w-4 shrink-0 text-[oklch(70%_0.16_185)]" />
                <input className="flex-1 bg-transparent text-sm text-[#f7f7f7] outline-none placeholder:text-[#525252]" placeholder="一句话描述你想创作的短剧..."
                  value={quickPrompt} onChange={e => setQuickPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { persistQuickPrompt(); window.location.hash = '#/canvas' } }} />
              </div>
              <Link to="/canvas" onClick={persistQuickPrompt} className="flex items-center gap-1.5 rounded-xl bg-[oklch(70%_0.16_185)] px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[oklch(76%_0.14_185)]">开始生成 <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>

        </div>
      </main>

      <footer className="border-t border-[oklch(100%_0_0_/_0.06)] py-8 text-center text-xs text-[#525252]">
        <div className="flex items-center justify-center gap-2 mb-2"><Clapperboard className="h-3.5 w-3.5 text-[oklch(70%_0.16_185)]" /><span className="font-semibold text-[#727272]">PlayDrama Studio</span></div>
        <p>2026 · AI视频创作平台 · 让每个人都能拍短剧</p>
      </footer>

      <VipModal open={vipOpen} onClose={() => setVipOpen(false)} />
    </div>
  )
}

function TrophySvg() {
  return <svg width="14" height="14" viewBox="0 0 10 13" fill="none"><path d="M8.69 0a.524.524 0 010 1.05h-.64v1.91a1.57 1.57 0 01-.5 1.2L5.35 6.36l2.2 2.2a1.57 1.57 0 01.5 1.2V11.67h.64a.525.525 0 010 1.05H.52a.525.525 0 010-1.05h.65V9.76c0-.45.18-.88.5-1.2l2.2-2.2-2.2-2.2c-.32-.32-.5-.75-.5-1.2V1.05H.52a.525.525 0 010-1.05h8.17z" fill="#773E00"/></svg>;
}