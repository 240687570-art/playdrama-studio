 // ====== Studio Types ======
 
 export type NodeKind = 'Hook' | 'Choice' | 'Puzzle' | 'Ending'
 export type NodePaywall = 'free' | 'paid'
 export type StudioPage =
   | 'overview'
   | 'creation'
   | 'story'
   | 'characters'
   | 'ai'
   | 'publish'
   | 'video'
   | 'storyboard'
   | 'skills'
 
 export type CreationStageId =
   | 'inspiration'
   | 'synopsis'
   | 'characters'
   | 'outline'
   | 'script'
   | 'interaction'
   | 'publish'
 
 export type DistributionChannel =
   | 'douyin'
   | 'douyin-mini'
   | 'wechat-mini'
   | 'wechat-video'
   | 'xiaohongshu'
   | 'private'
 
 export type StoryChoice = {
   id: string
   label: string
   targetNodeId: string
   condition: string
 }
 
 export type StoryNode = {
   id: string
   title: string
   kind: NodeKind
   summary: string
   metric: string
   paywall?: NodePaywall
   choices: StoryChoice[]
 }
 
 export type StoryVariable = {
   id: string
   label: string
   type: 'number' | 'boolean' | 'text'
   defaultValue: string
 }
 
 export type Character = {
   name: string
   role: string
   trait: string
   color: string
 }
 
 export type PublishSettings = {
   status: 'Draft' | 'Beta' | 'Public'
   visibility: 'Private' | 'Unlisted' | 'Public'
   category: string
   audience: string
   monetization: 'Free' | 'Paid Ending' | 'Paid Chapter'
   price: string
 }
 
 export type ModelRouting = {
   market: 'China Mainland' | 'Global'
   defaultProvider: string
   openaiPolicy: string
   contentSafety: 'Required'
   fallbackProvider: string
 }
 
 export type StoryProject = {
   id: string
   title: string
   template: string
   publish: PublishSettings
   modelRouting: ModelRouting
   nodes: StoryNode[]
   variables: StoryVariable[]
   characters: Character[]
   lifecycleStatus?: 'active' | 'archived'
   archivedAt?: string | null
   updatedAt: string
 }
 
 export type RuntimeState = Record<string, string>
 
 export type GalleryItem = {
   id: string
   title: string
   category: string
   status: string
   completion: string
 }
 
 // ====== API Types ======
 
 export type AuthProviderStatus = {
   providerId: string
   isConfigured: boolean
   isActive: boolean
   errorMessage?: string
 }
 
 export type VideoProviderStatus = {
   providerId: string
   isConfigured: boolean
   isActive: boolean
   available: boolean
   balance?: number
 }
 
 export type PaymentProviderStatus = {
   providerId: string
   isConfigured: boolean
   isActive: boolean
   available: boolean
 }
 
 export type PaymentOrder = {
   id: string
   projectId: string
   amount: number
   currency: string
   status: string
   channel: string
   createdAt: string
 }
 
 export type PublishBuild = {
   id: string
   projectId?: string
   workspaceId?: string
   version: number
   status: string
   visibility?: string
   runtimeUrl: string
   snapshot?: StoryProject
   contentSafety?: {
     reviewId?: string
     status?: string
   }
 }
 
 export type MarketingLead = {
   id: string
   name: string
   company: string
   role: string
   phone: string
   email: string
   scenario: string
   message: string
   source: string
   status: string
   notification?: {
     provider?: string
     status?: string
     errorMessage?: string | null
   } | null
   createdAt: string
   updatedAt?: string
 }
 
 // ====== UI State ======
 
 export interface Notification {
   type: 'success' | 'error' | 'info' | 'warning'
   message: string
 }
 
 export interface PageSection {
   eyebrow: string
   title: string
   searchPlaceholder: string
 }
