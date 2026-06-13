import { useState } from 'react'
import {
  Zap,
  Wand2,
  Palette,
  Music,
  Image,
  Type,
  Users,
  Star,
  Download,
  ChevronRight,
  Sparkles,
  Clapperboard,
  Bookmark,
  TrendingUp,
} from 'lucide-react'

interface Skill {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ size?: number }>
  color: string
  tags: string[]
  rating: number
  downloads: number
  author: string
  category: string
}

const skillsData: Skill[] = [
  {
    id: 'skill-1', name: '悬疑短剧大师',
    description: '自动生成悬疑氛围的分镜、配乐和调色方案，适合惊悚悬疑类短剧',
    icon: Clapperboard, color: 'var(--accent)',
    tags: ['悬疑', '惊悚', '分镜'],
    rating: 4.8, downloads: 12580, author: 'PlayDrama 官方', category: '剧情模板',
  },
  {
    id: 'skill-2', name: '都市情感工坊',
    description: '浪漫都市风格，自动匹配情感音乐和温暖色调',
    icon: Palette, color: 'var(--accent-secondary)',
    tags: ['都市', '情感', '浪漫'],
    rating: 4.6, downloads: 8920, author: 'PlayDrama 官方', category: '剧情模板',
  },
  {
    id: 'skill-3', name: '玄幻特效生成',
    description: '一键生成玄幻场景特效，包括法术、飞剑、变身等经典元素',
    icon: Wand2, color: '#8b5cf6',
    tags: ['玄幻', '特效', '场景'],
    rating: 4.9, downloads: 15670, author: 'PlayDrama 官方', category: '特效模板',
  },
  {
    id: 'skill-4', name: '抖音爆款公式',
    description: '基于抖音热门短剧数据，自动生成高完播率的剧情结构',
    icon: TrendingUp, color: '#f59e0b',
    tags: ['抖音', '爆款', '数据驱动'],
    rating: 4.7, downloads: 23450, author: 'MCN 创作联盟', category: '运营模板',
  },
  {
    id: 'skill-5', name: '古风仙侠调色',
    description: '专业古风仙侠色调，包含水墨、仙侠、宫廷等多种风格',
    icon: Image, color: '#14b8a6',
    tags: ['古风', '仙侠', '调色'],
    rating: 4.5, downloads: 6780, author: '视觉工作室', category: '调色模板',
  },
  {
    id: 'skill-6', name: '节奏卡点剪辑',
    description: '自动识别音乐节奏，精准卡点剪辑，适合快节奏短剧',
    icon: Music, color: '#3b82f6',
    tags: ['剪辑', '节奏', '卡点'],
    rating: 4.4, downloads: 9870, author: '剪辑达人', category: '剪辑模板',
  },
  {
    id: 'skill-7', name: '角色一致性控制',
    description: '确保AI生成的角色形象在多镜头中保持一致性',
    icon: Users, color: 'var(--success)',
    tags: ['角色', '一致性', 'AI'],
    rating: 4.8, downloads: 14560, author: 'PlayDrama 官方', category: 'AI 工具',
  },
  {
    id: 'skill-8', name: '字幕智能生成',
    description: '自动识别语音生成字幕，支持多种字体和动画效果',
    icon: Type, color: 'var(--accent)',
    tags: ['字幕', '语音', '自动化'],
    rating: 4.3, downloads: 7890, author: '效率工具组', category: 'AI 工具',
  },
  {
    id: 'skill-9', name: '付费节点设计',
    description: '设计高转化率的付费节点位置，提升短剧变现能力',
    icon: Zap, color: '#f97316',
    tags: ['付费', '转化', '变现'],
    rating: 4.6, downloads: 11230, author: '商业化团队', category: '运营模板',
  },
]

const categories = ['全部', '剧情模板', '特效模板', '剪辑模板', '调色模板', 'AI 工具', '运营模板']

export function SkillsMarketplace() {
  const [activeCategory, setActiveCategory] = useState('全部')
  const [installed, setInstalled] = useState<Set<string>>(new Set())

  const filteredSkills =
    activeCategory === '全部'
      ? skillsData
      : skillsData.filter((s) => s.category === activeCategory)

  const toggleInstall = (skillId: string) => {
    setInstalled((prev) => {
      const next = new Set(prev)
      if (next.has(skillId)) {
        next.delete(skillId)
      } else {
        next.add(skillId)
      }
      return next
    })
  }

  return (
    <div className="skills-marketplace">
      <div className="skills-header">
        <h2>
          <Sparkles size={24} style={{ color: 'var(--accent)' }} />
          创作技能库
        </h2>
        <p>发现和使用预设创作模板，像搭积木一样快速搭建短剧工作流</p>
      </div>

      {/* 分类筛选 */}
      <div className="skills-categories">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`skills-category-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 技能网格 */}
      <div className="skills-grid">
        {filteredSkills.map((skill) => {
          const Icon = skill.icon
          const isInstalled = installed.has(skill.id)
          return (
            <div key={skill.id} className="skill-card">
              <div className="skill-card-header" style={{ background: `${skill.color}10` }}>
                <div
                  className="skill-card-icon"
                  style={{ color: skill.color, background: `${skill.color}18` }}
                >
                  <Icon size={24} />
                </div>
                <div className="skill-card-meta">
                  <span className="skill-card-category" style={{ color: skill.color }}>
                    {skill.category}
                  </span>
                  <div className="skill-card-rating">
                    <Star size={12} fill="#f59e0b" color="#f59e0b" />
                    <span>{skill.rating}</span>
                    <span className="skill-card-downloads">
                      <Download size={12} />
                      {(skill.downloads / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
              </div>
              <div className="skill-card-body">
                <h3>{skill.name}</h3>
                <p>{skill.description}</p>
                <div className="skill-card-tags">
                  {skill.tags.map((tag) => (
                    <span key={tag} className="skill-card-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="skill-card-footer">
                <span className="skill-card-author">by {skill.author}</span>
                <button
                  className={`skill-card-install ${isInstalled ? 'installed' : ''}`}
                  onClick={() => toggleInstall(skill.id)}
                >
                  {isInstalled ? (
                    <>
                      <Bookmark size={14} fill="currentColor" />
                      已安装
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      安装
                      <ChevronRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* 推荐区域 */}
      <div className="skills-recommend">
        <h3>
          <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
          热门推荐
        </h3>
        <div className="skills-recommend-grid">
          {skillsData
            .sort((a, b) => b.downloads - a.downloads)
            .slice(0, 3)
            .map((skill, index) => {
              const Icon = skill.icon
              return (
                <div key={skill.id} className="skills-recommend-card">
                  <div className="skills-recommend-rank">{index + 1}</div>
                  <span style={{ color: skill.color }}><Icon size={20} /></span>
                  <div className="skills-recommend-info">
                    <strong>{skill.name}</strong>
                    <span>{(skill.downloads / 1000).toFixed(1)}k 次下载</span>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
