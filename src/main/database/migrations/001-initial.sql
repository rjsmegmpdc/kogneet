-- Kogneet initial schema
-- Covers: feeds, articles, skill versions, reasoning log, subscribers,
--         digest runs, social posts, social analytics, feed suggestions

-- ── Feeds ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feeds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'rss',  -- rss | newsletter | podcast | clip | mcp
  schedule_type TEXT NOT NULL DEFAULT 'daily',
  schedule_interval_minutes INTEGER,
  schedule_time_local TEXT,
  schedule_cron TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_fetched_at TEXT,
  added_at TEXT NOT NULL,
  skill_version INTEGER          -- current SKILL.md version (NULL if none)
);

-- ── SKILL.md versions ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS skill_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  instruction TEXT,              -- NL instruction that produced this version
  diff_summary TEXT,             -- plain-English change description
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(feed_id, version),
  FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
);

-- ── Articles ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  feed_id TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT,
  content TEXT,                  -- full text
  content_html TEXT,             -- original HTML (for re-processing)
  summary TEXT,                  -- AI-generated summary
  priority TEXT,                 -- high | medium | low
  status TEXT NOT NULL DEFAULT 'new',  -- new | changed | unchanged | filtered
  teaser TEXT,                   -- social post teaser
  published_at TEXT,
  fetched_at TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',    -- JSON blob for dates, categories, etc.
  FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_articles_feed ON articles(feed_id);
CREATE INDEX IF NOT EXISTS idx_articles_fetched ON articles(fetched_at);
CREATE INDEX IF NOT EXISTS idx_articles_priority ON articles(priority);

-- ── Reasoning log ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reasoning_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL,
  feed_id TEXT NOT NULL,
  skill_version INTEGER NOT NULL,
  decision TEXT NOT NULL,        -- surfaced | filtered | priority_changed
  priority TEXT,
  explanation TEXT NOT NULL,
  signals TEXT DEFAULT '[]',     -- JSON array of keyword/entity matches
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reasoning_article ON reasoning_log(article_id);

-- ── Subscribers ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  added_at TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  feed_ids TEXT DEFAULT '[]'     -- JSON array of feed IDs
);

-- ── Digest runs ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS digest_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',  -- running | completed | failed | cancelled
  content_plan TEXT,             -- JSON
  output_markdown TEXT,
  output_html TEXT,
  run_log TEXT DEFAULT '[]',     -- JSON array of step logs
  error TEXT
);

-- ── Digest configs (saved filter presets per feed) ───────────────

CREATE TABLE IF NOT EXISTS digest_configs (
  feed_id TEXT PRIMARY KEY,
  feed_name TEXT NOT NULL,
  categories TEXT DEFAULT '[]',
  release_status TEXT DEFAULT '',
  ga_quarters TEXT DEFAULT '[]',
  preview_quarters TEXT DEFAULT '[]',
  latest_only INTEGER NOT NULL DEFAULT 0,
  saved_at TEXT NOT NULL
);

-- ── Social posts ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  article_id TEXT,
  platform TEXT NOT NULL,        -- x | linkedin | instagram | facebook | bluesky | threads
  content TEXT NOT NULL,
  angle TEXT,
  reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | queued | approved | published | failed
  published_at TEXT,
  platform_post_id TEXT,
  platform_post_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_social_platform ON social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_status ON social_posts(status);

-- ── Social analytics ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  engagement_rate REAL DEFAULT 0,
  FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_analytics_post ON social_analytics(post_id);

-- ── Feed suggestions ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feed_suggestions (
  id TEXT PRIMARY KEY,
  suggested_by TEXT NOT NULL,       -- subscriber email
  suggested_by_name TEXT NOT NULL,
  feed_name_or_url TEXT NOT NULL,
  suggested_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'  -- pending | approved | rejected
);

-- ── BYOK token usage tracking ────────────────────────────────────

CREATE TABLE IF NOT EXISTS token_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  feature TEXT NOT NULL,
  model TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_estimate REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_token_usage_date ON token_usage(created_at);

-- ── Marketplace cache (local) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS marketplace_cache (
  domain TEXT PRIMARY KEY,
  feed_name TEXT NOT NULL,
  description TEXT NOT NULL,
  skill_content TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_updated TEXT NOT NULL
);
