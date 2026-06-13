import { useState, useEffect, useRef } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  Sparkles,
  Rocket,
  ChevronRight,
  Play,
  Download,
  GitBranch,
  Bot,
  ShieldCheck,
  Share2,
  BarChart3,
  Users,
  Clapperboard,
  QrCode,
  CheckCircle2,
  Zap,
  Smartphone,
  Moon,
  CreditCard,
  TrendingUp,
} from 'lucide-react'
import { submitLeadApplication } from '../api'
import type { MarketingLead } from '../App'

function useCountUp(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true)
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return
    let startTime: number
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [started, end, duration])

  return { count, ref }
}

function AnimatedSection({ children, className = '', delay = 0, id }: { children: React.ReactNode; className?: string; delay?: number; id?: string }) {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [delay])

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`${className} transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      {children}
    </section>
  )
}

export default function PublicLandingPage() {
  const [leadForm, setLeadForm] = useState({
    name: '',
    company: '',
    role: '短剧团队',
    phone: '',
    email: '',
    scenario: '互动短剧内测',
    message: '',
  })
  const [leadState, setLeadState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [leadMessage, setLeadMessage] = useState('留下信息后，我们会优先安排产品演示')

  const updateLeadField =
    (field: keyof typeof leadForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setLeadForm((current) => ({ ...current, [field]: event.target.value }))
      if (leadState !== 'submitting') {
        setLeadState('idle')
        setLeadMessage('留下信息后，我们会优先安排产品演示')
      }
    }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLeadState('submitting')
    setLeadMessage('正在提交申请')

    try {
      const lead = await submitLeadApplication<MarketingLead>({
        ...leadForm,
        source: 'public-landing-page',
      })
      setLeadState('success')
      setLeadMessage(`已收到，线索编号 ${lead.id.slice(-6)}，我们会尽快联系你`)
      setLeadForm((current) => ({
        ...current,
        name: '',
        company: '',
        phone: '',
        email: '',
        message: '',
      }))
    } catch (error) {
      setLeadState('error')
      const message = error instanceof Error ? error.message : '提交失败'
      setLeadMessage(
        message.includes('contact_required')
          ? '请至少填写手机号或邮箱'
          : message.includes('invalid_phone')
            ? '手机号格式不对，请填写中国大陆手机号'
            : message.includes('invalid_email')
              ? '邮箱格式不对'
              : '提交失败，请稍后再试',
      )
    }
  }

  const { count: userCount, ref: userRef } = useCountUp(69600, 2500)
  const { count: marketCount, ref: marketRef } = useCountUp(5044, 2500)
  const { count: bizCount, ref: bizRef } = useCountUp(100000, 2500)
  const { count: gateCount, ref: gateRef } = useCountUp(17, 2500)

  const publicShowcaseItems = [
    {
      title: '旧医院的第七通电',
      genre: '悬疑互动',
      stats: '7 节点 · 2 结局 · 付费隐藏线',
      copy: '一句题材生成可试玩剧情图谱，再继续细修角色、变量和结局门槛。',
      media: 'video',
      sampleId: 'hospital',
    },
    {
      title: '雨夜便利店最后一张小票',
      genre: '都市反转',
      stats: '6 节点 · 2 结局 · H5 预览',
      copy: '适合抖音、小程序和私域引流的短剧情节，先有样片，再进发布。',
      media: 'image',
      sampleId: 'receipt',
    },
    {
      title: '全宗上下，拼不出一个好人',
      genre: '玄幻喜剧',
      stats: '7 节点 · 角色一致性 · 分支复盘',
      copy: '把爽点、反转和互动选择放进同一个生产面板，交付不靠口头同步。',
      media: 'image',
      sampleId: 'sect',
    },
  ]
  const publicHeroPosters = [
    { title: '旧医院的第七通电', tag: '悬疑互动', metric: '付费隐藏线' },
    { title: '雨夜便利店最后一张小票', tag: '都市反转', metric: 'H5 试玩' },
    { title: '全宗上下，拼不出一个好人', tag: '玄幻喜剧', metric: '分支复盘' },
    { title: '醒来后，我成了她的证词', tag: '情绪爽点', metric: '短剧生产包' },
    { title: '最后一幕才知道谁在说谎', tag: '反转结局', metric: '微信 0.01 验收' },
  ]
  const publicHomeFeatures = ['新建剧本', '网文改编', '剧本评估', '短剧拉片', '发布收款']

  const coreFeatures = [
    {
      icon: Zap,
      title: 'AI 互动剧本生成',
      desc: '一句话创意 → 互动剧本，自动生成分支逻辑和付费节点',
      color: '#10b981',
      href: '/studio?page=ai',
    },
    {
      icon: GitBranch,
      title: '节点图谱编辑',
      desc: '可视化拖拽编辑剧情节点，自动布局和缩略图预览',
      color: '#3b82f6',
      href: '/studio?page=nodegraph',
    },
    {
      icon: Smartphone,
      title: '移动端适配',
      desc: '底部导航 + 手势操作 + 表单优化，完美适配手机端创作',
      color: '#f59e0b',
      href: '/studio?page=creation',
    },
    {
      icon: Moon,
      title: '深色模式',
      desc: '跟随系统主题自动切换，支持 light/dark/system 三种模式',
      color: '#6366f1',
      href: '/studio?page=creation',
    },
    {
      icon: CreditCard,
      title: '付费节点编辑器',
      desc: '可视化配置定价、折扣、预览时长，单节点/整章/订阅三种解锁',
      color: '#ec4899',
      href: '/studio?page=publish',
    },
    {
      icon: TrendingUp,
      title: '数据分析仪表板',
      desc: '转化漏斗、A/B 测试、收入追踪，数据驱动内容优化',
      color: '#14b8a6',
      href: '/studio?page=analytics',
    },
  ]

  return (
    <main className="public-site public-site-cinematic">
      <header className="public-nav">
        <a className="public-brand" href="/" aria-label="PlayDrama landing">
          <span className="public-brand-mark">
            <Sparkles size={20} />
          </span>
          <span>
            <strong>PlayDrama</strong>
            <em>AI 互动短剧工作台</em>
          </span>
        </a>
        <nav aria-label="Public navigation">
          <a href="#showcase">样片展示</a>
          <a href="#features">核心功能</a>
          <a href="#workflow">产品闭环</a>
          <a href="#apply">申请内测</a>
          <a className="public-studio-link" href="/studio">
            进入工作台
          </a>
        </nav>
      </header>

      <section className="public-hero" aria-labelledby="public-hero-title">
        <div className="public-hero-backdrop" aria-hidden="true" />
        <div className="public-hero-content">
          <p className="public-kicker">
            <Rocket size={18} />
            短剧创作、互动发布和收款闭环
          </p>
          <h1 id="public-hero-title">PlayDrama</h1>
          <p className="public-hero-line">
            给短剧团队和服务商的一套 AI 制作台：从一句创意生成剧本生产包，再升级成可选择、可付费、可复盘的互动短剧。
          </p>
          <div className="public-hero-tabs" aria-label="PlayDrama creation entries">
            {publicHomeFeatures.map((item) => (
              <a href={item === '发布收款' ? '/studio?page=publish' : '/studio?page=creation'} key={item}>
                {item}
              </a>
            ))}
          </div>
          <div className="public-hero-actions" aria-label="Primary actions">
            <a className="public-primary-action" href="/studio">
              制作互动短剧
              <ChevronRight size={18} />
            </a>
            <a className="public-primary-action" href="/studio?generate=1">
              生成常规短剧
              <ChevronRight size={18} />
            </a>
            <a className="public-secondary-action" href="#showcase">
              <Play size={18} fill="currentColor" />
              看样片
            </a>
            <a className="public-secondary-action" href="/marketing/playdrama-china-impact.pptx" download>
              <Download size={18} />
              下载路演 PPT
            </a>
          </div>
        </div>
        <div className="public-hero-stage" aria-label="PlayDrama product preview">
          <div className="public-poster-wall" aria-label="短剧项目样例">
            {publicHeroPosters.map((item, index) => (
              <article className="public-poster-card" key={item.title}>
                <img src="/marketing/playdrama-hero.png" alt="" aria-hidden="true" />
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <em>{item.tag}</em>
                  <strong>{item.title}</strong>
                  <small>{item.metric}</small>
                </div>
              </article>
            ))}
          </div>
          <div className="public-product-preview" aria-label="创作工作台预览">
            <div className="public-product-bar">
              <span />
              <span />
              <span />
              <strong>普通短剧创作平台</strong>
            </div>
            <div className="public-product-grid">
              {[
                ['01', '灵感策划', '一句话卖点'],
                ['02', '故事梗概', '8 个剧情节点'],
                ['03', '人物小传', '4 个角色资产'],
                ['04', '分集大纲', '镜头脚本可导出'],
              ].map(([index, label, detail]) => (
                <article key={label}>
                  <span>{index}</span>
                  <strong>{label}</strong>
                  <em>{detail}</em>
                </article>
              ))}
            </div>
            <div className="public-product-footer">
              <span>互动分支</span>
              <strong>付费结局 + 微信验收 + 数据回流</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="public-signal-row" id="market" aria-label="Domestic market signals">
        <div ref={userRef}>
          <span>微短剧用户规模</span>
          <strong>{(userCount / 10000).toFixed(2)} 亿</strong>
        </div>
        <div ref={marketRef}>
          <span>2024 市场规模</span>
          <strong>{(marketCount / 10).toFixed(1)} 亿</strong>
        </div>
        <div ref={bizRef}>
          <span>相关企业生态</span>
          <strong>{(bizCount / 10000).toFixed(0)} 万+</strong>
        </div>
        <div ref={gateRef}>
          <span>PlayDrama 状态</span>
          <strong>{gateCount}/17 通过</strong>
        </div>
      </section>

      <AnimatedSection id="features" className="public-features-section" delay={0}>
        <div className="public-section-copy">
          <p className="public-section-label">核心功能</p>
          <h2>超越竞品的六大能力</h2>
          <p>
            从天工短剧工作台、StoryPlay 等平台中脱颖而出，PlayDrama 提供独一无二的互动短剧创作能力。
          </p>
        </div>
        <div className="public-features-grid">
          {coreFeatures.map((item, index) => {
            const Icon = item.icon
            return (
              <a
                className="public-feature-card"
                href={item.href}
                key={item.title}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="public-feature-icon" style={{ background: `linear-gradient(135deg, ${item.color}22, ${item.color}11)`, color: item.color }}>
                  <Icon size={28} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <span className="public-feature-link">
                  立即体验
                  <ChevronRight size={14} />
                </span>
              </a>
            )
          })}
        </div>
      </AnimatedSection>

      <AnimatedSection id="showcase" className="public-showcase" aria-labelledby="public-showcase-title" delay={100}>
        <div className="public-section-copy">
          <p className="public-section-label">样片证明</p>
          <h2 id="public-showcase-title">先看到一部短剧，再决定要不要进工作台</h2>
          <p>
            PlayDrama 的入口要像真实短剧生产工具：样片、草稿、编辑和上线在同一条链路里，而不是只展示一堆功能名。
          </p>
        </div>
        <div className="public-showcase-grid">
          {publicShowcaseItems.map((item, index) => (
            <a
              className="public-showcase-card"
              key={item.title}
              href={`/studio?preview=1&sample=${item.sampleId}`}
              aria-label={`试玩样片：${item.title}`}
            >
              <div className="public-showcase-media">
                {item.media === 'video' ? (
                  <video
                    src="/marketing/playdrama-promo-20260522.mp4"
                    poster="/marketing/playdrama-hero.png"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img src="/marketing/playdrama-hero.png" alt={`${item.title} 样片画面`} />
                )}
                <span>{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="public-showcase-body">
                <small>{item.genre}</small>
                <strong>{item.title}</strong>
                <em>{item.stats}</em>
                <p>{item.copy}</p>
                <span className="public-showcase-cta">
                  <Play size={16} fill="currentColor" />
                  打开互动试玩
                </span>
              </div>
            </a>
          ))}
        </div>
        <div className="public-generator-path" aria-label="Short drama generation path">
          {['写一句题材', 'AI 生成短剧草稿', '编辑分支和角色', '发布并复盘'].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </AnimatedSection>

      <AnimatedSection className="public-video-band" aria-labelledby="public-video-title" delay={100}>
        <div className="public-section-copy">
          <p className="public-section-label">商业叙事</p>
          <h2 id="public-video-title">给合作方看的 42 秒版本</h2>
          <p>
            这支预热视频说明了 PlayDrama 在国内短剧产业里的位置：不是单点生成工具，而是把生产、审核、发布、收款和数据回传连起来。
          </p>
        </div>
        <video
          className="public-video"
          src="/marketing/playdrama-promo-20260522.mp4"
          poster="/marketing/playdrama-hero.png"
          controls
          playsInline
          preload="metadata"
        >
          <a href="/marketing/playdrama-promo-20260522.mp4">查看宣传视频</a>
        </video>
      </AnimatedSection>

      <AnimatedSection id="workflow" className="public-workflow" aria-labelledby="public-workflow-title" delay={100}>
        <div className="public-section-copy">
          <p className="public-section-label">产品闭环</p>
          <h2 id="public-workflow-title">互动短剧需要的是一条运营流水线</h2>
        </div>
        <div className="public-flow">
          {[
            { icon: GitBranch, title: '剧情图谱', copy: '节点、选择、变量、隐藏结局统一管理' },
            { icon: Bot, title: 'AI 导演', copy: '用通义千问辅助扩写、补分支、查冲突' },
            { icon: ShieldCheck, title: '合规门禁', copy: '内容安全、上线检查、商用配置一屏验收' },
            { icon: Share2, title: '渠道分发', copy: 'H5、抖音、微信小程序路径同步准备' },
            { icon: BarChart3, title: '变现复盘', copy: '付费结局、渠道参数、试玩事件回传' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <article className="public-flow-item" key={item.title}>
                <Icon size={22} />
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            )
          })}
        </div>
      </AnimatedSection>

      <AnimatedSection className="public-impact" aria-labelledby="public-impact-title" delay={100}>
        <div>
          <p className="public-section-label">国内影响力</p>
          <h2 id="public-impact-title">让中小团队也能进入互动内容工业化</h2>
        </div>
        <div className="public-impact-grid">
          <article>
            <Users size={22} />
            <strong>短剧团队</strong>
            <span>把 IP、剧本和分支变成可试玩版本</span>
          </article>
          <article>
            <Clapperboard size={22} />
            <strong>MCN 和服务商</strong>
            <span>用标准流程交付更多垂类互动项目</span>
          </article>
          <article>
            <QrCode size={22} />
            <strong>文旅和品牌</strong>
            <span>用剧情化体验做传播、获客和会员转化</span>
          </article>
        </div>
      </AnimatedSection>

      <AnimatedSection id="apply" className="public-apply" aria-labelledby="public-apply-title" delay={100}>
        <div className="public-apply-copy">
          <p className="public-section-label">内测合作</p>
          <h2 id="public-apply-title">拿一个真实项目，跑一条完整链路</h2>
          <p>
            适合短剧制作团队、MCN、内容服务商、文旅项目和品牌互动营销团队。我们优先支持能提供真实故事样本的共创伙伴。
          </p>
          <ul>
            <li>
              <CheckCircle2 size={18} />
              一部作品完成剧情图谱和 H5 试玩
            </li>
            <li>
              <CheckCircle2 size={18} />
              接入渠道参数、支付门槛和数据回传
            </li>
            <li>
              <CheckCircle2 size={18} />
              形成可复制的互动短剧上线方法
            </li>
          </ul>
        </div>

        <form className="public-lead-form" onSubmit={submitLead}>
          <label>
            <span>姓名</span>
            <input
              value={leadForm.name}
              onChange={updateLeadField('name')}
              placeholder="怎么称呼你"
              required
            />
          </label>
          <label>
            <span>公司或团队</span>
            <input
              value={leadForm.company}
              onChange={updateLeadField('company')}
              placeholder="团队名称"
            />
          </label>
          <label>
            <span>角色</span>
            <select value={leadForm.role} onChange={updateLeadField('role')}>
              <option>短剧团队</option>
              <option>MCN / 服务商</option>
              <option>文旅项目</option>
              <option>品牌营销</option>
              <option>投资 / 渠道伙伴</option>
            </select>
          </label>
          <div className="public-form-grid">
            <label>
              <span>手机号</span>
              <input
                value={leadForm.phone}
                onChange={updateLeadField('phone')}
                placeholder="用于联系"
                inputMode="tel"
              />
            </label>
            <label>
              <span>邮箱</span>
              <input
                value={leadForm.email}
                onChange={updateLeadField('email')}
                placeholder="选填"
                type="email"
              />
            </label>
          </div>
          <label>
            <span>想验证什么</span>
            <select value={leadForm.scenario} onChange={updateLeadField('scenario')}>
              <option>互动短剧内测</option>
              <option>抖音 / 微信小程序上线</option>
              <option>付费结局和数据复盘</option>
              <option>短剧服务商解决方案</option>
            </select>
          </label>
          <label>
            <span>补充说明</span>
            <textarea
              value={leadForm.message}
              onChange={updateLeadField('message')}
              placeholder="已有故事、账号、预算或上线时间，可以写在这里"
              rows={4}
            />
          </label>
          <button className="public-submit" type="submit" disabled={leadState === 'submitting'}>
            {leadState === 'submitting' ? '提交中' : '提交内测申请'}
          </button>
          <p className={`public-form-state ${leadState}`}>{leadMessage}</p>
        </form>
      </AnimatedSection>
    </main>
  )
}
