// ── App Configuration (machine-specific, %APPDATA%) ──────────────

export interface AppConfig {
  dataFolder: string
  smtp?: SmtpConfig
  imap?: ImapConfig
  byok?: ByokConfig
  windowBounds?: WindowBounds
}

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
}

export interface ImapConfig {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
}

export interface ByokConfig {
  providers: Record<string, ByokProvider>
  featureRouting: Record<AIFeature, string>
}

export interface ByokProvider {
  key: string           // encrypted at rest via electron.safeStorage
  baseUrl?: string      // for OpenAI-compatible endpoints (Ollama, Azure)
  models: string[]      // available models for this provider
  defaultModel?: string // preferred model
}

export type AIFeature =
  | 'summarisation'
  | 'priorityScoring'
  | 'skillEditor'
  | 'digestGeneration'
  | 'socialPosts'
  | 'reasoning'

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

// ── Settings (portable, {dataFolder}/settings.json) ──────────────

export interface Settings {
  version: string
  general: GeneralSettings
  appearance: AppearanceSettings
  email: EmailSettings
  notifications: NotificationSettings
  display: DisplaySettings
  data: DataSettings
  financialYear: FinancialYearSettings
  socialPosts: SocialPostSettings
}

export interface FinancialYearSettings {
  startMonth: number  // 1–12: month the FY begins (e.g. 7 = July)
}

export interface GeneralSettings {
  launchOnStartup: boolean
  startMinimised: boolean
  autoLoadLatestOnLaunch: boolean
  defaultFeedSchedule: string
  coworkWatchFolder: string
  coworkBatchDelaySeconds: number
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  accentColour: 'purple' | 'teal' | 'blue'
  fontSize: 'small' | 'medium' | 'large'
}

export interface EmailSettings {
  senderDisplayName: string
  senderEmail: string
  sendTimeLocal: string
  sendIfNoItems: boolean
  replyTo: string
  unsubscribeEnabled: boolean
  unsubscribeCheckIntervalMinutes: number
}

export interface NotificationSettings {
  fetchComplete: boolean
  fetchError: boolean
  coworkComplete: boolean
  emailSent: boolean
  emailFailed: boolean
  changedItemsDetected: boolean
}

export interface DisplaySettings {
  cardDensity: 'compact' | 'comfortable' | 'spacious'
  defaultSort: 'urgency' | 'newest' | 'feedOrder' | 'category'
  showSourceUrlOnCard: boolean
  expandLearningByDefault: boolean
  groupByCategory: boolean
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  timeFormat: '12h' | '24h'
}

export interface DataSettings {
  keepRawDays: number | -1
  keepProcessedDays: number | -1
  keepEmailLogDays: number | -1
  autoCleanupOnLaunch: boolean
}

export interface SocialPostSettings {
  enabled: boolean
  tone: 'professional' | 'casual' | 'clickbait' | 'executive'
  maxLength: number
  includeEmoji: boolean
  includeHashtags: boolean
  targetAudience: string
  callToAction: boolean
  platform: 'linkedin' | 'teams' | 'slack' | 'generic'
}

// ── Feeds ────────────────────────────────────────────────────────

export interface Feed {
  id: string
  name: string
  url: string
  category: string
  sourceType: 'rss' | 'newsletter' | 'podcast' | 'clip' | 'mcp'
  schedule: FeedSchedule
  enabled: boolean
  lastFetchedAt: string | null
  addedAt: string
  skillVersion: number | null  // current SKILL.md version (replaces criteria)
}

export interface FeedSchedule {
  type: 'interval' | 'daily' | 'weekdays' | 'custom'
  intervalMinutes?: number
  timeLocal?: string
  cronExpression?: string
}

// ── SKILL.md System ──────────────────────────────────────────────

export interface SkillVersion {
  id: number
  feedId: string
  version: number
  content: string             // full SKILL.md markdown
  instruction: string | null  // NL instruction that produced this version
  diffSummary: string | null  // plain-English change description
  createdAt: string
}

export interface SkillConfig {
  surfaceCriteria: string
  filterCriteria: string
  summarisationStyle: string
  priorityScoring: string
  digestPresentation: string
  socialPostStyle: string
}

// ── Articles ─────────────────────────────────────────────────────

export interface Article {
  id: string
  feedId: string
  title: string
  link: string
  content: string | null       // full text
  contentHtml: string | null   // original HTML
  summary: string | null       // AI-generated
  priority: 'high' | 'medium' | 'low' | null
  status: 'new' | 'changed' | 'unchanged' | 'filtered'
  teaser: string | null        // social post teaser
  publishedAt: string | null
  fetchedAt: string
  metadata: Record<string, string>  // JSON: dates, categories, product, platform
}

// ── Reasoning Log ────────────────────────────────────────────────

export interface ReasoningEntry {
  id: number
  articleId: string
  feedId: string
  skillVersion: number
  decision: 'surfaced' | 'filtered' | 'priority_changed'
  priority: string | null
  explanation: string
  signals: string[]           // keyword/entity matches
  createdAt: string
}

// ── Subscribers ──────────────────────────────────────────────────

export interface Subscriber {
  id: string
  name: string
  email: string
  addedAt: string
  enabled: boolean
  feedIds: string[]
}

// ── Digest ───────────────────────────────────────────────────────

export interface DigestRun {
  id: string
  startedAt: string
  completedAt: string | null
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  contentPlan: object | null
  outputMarkdown: string | null
  outputHtml: string | null
  runLog: object[]
  error: string | null
}

export interface SavedDigestConfig {
  feedId: string
  feedName: string
  categories: string[]
  releaseStatus: string
  gaQuarters: string[]
  previewQuarters: string[]
  latestOnly: boolean
  savedAt: string
}

export interface DigestItem {
  id: string
  title: string
  source: string
  sourceUrl: string
  category: string
  urgency: 'high' | 'medium' | 'low'
  summary: string
  learning: string
  teaser: string
  isNew: boolean
  isChanged: boolean
  publishedAt: string
  link: string
  releaseStatus: string
  gaDate: string
  previewDate: string
  product: string
  platform: string
}

// ── Social Agent ─────────────────────────────────────────────────

export interface SocialPost {
  id: string
  articleId: string | null
  platform: SocialPlatform
  content: string
  angle: string | null
  reasoning: string | null
  status: 'draft' | 'queued' | 'approved' | 'published' | 'failed'
  publishedAt: string | null
  platformPostId: string | null
  platformPostUrl: string | null
  createdAt: string
}

export type SocialPlatform = 'x' | 'linkedin' | 'instagram' | 'facebook' | 'bluesky' | 'threads'

export interface SocialAnalytics {
  id: number
  postId: string
  fetchedAt: string
  reach: number
  impressions: number
  likes: number
  shares: number
  comments: number
  clicks: number
  saves: number
  engagementRate: number
}

// ── Feed Suggestions ─────────────────────────────────────────────

export interface FeedSuggestion {
  id: string
  suggestedBy: string
  suggestedByName: string
  feedNameOrUrl: string
  suggestedAt: string
  status: 'pending' | 'approved' | 'rejected'
}

// ── SKILL.md Marketplace ─────────────────────────────────────────

export interface MarketplaceEntry {
  domain: string
  feedName: string
  description: string
  skillContent: string
  usageCount: number
  lastUpdated: string
}
