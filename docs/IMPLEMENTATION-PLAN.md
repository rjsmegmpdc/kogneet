# Kogneet — Implementation Plan

**Last updated:** 2026-04-12
**Audience:** Graduate/junior developers new to the codebase
**Predecessor:** RSS Intelligence v1 (https://github.com/rjsmegmpdc/RSSIntelligence)

---

## How to Read This Document

This plan describes every feature in Kogneet, grouped into phases aligned with the PRD v2.0 roadmap. Each phase lists:

- **What it does** — plain-English explanation
- **Key files** — which source files you'll need to read or modify
- **How it works** — step-by-step technical explanation
- **Carries forward from v1** — what can be reused from RSS Intelligence v1
- **Things to watch out for** — gotchas, edge cases, or non-obvious behaviour

Phases are grouped into three releases (v1 launch, v2 intelligence, v3 portal+team). Within a release, phases are listed in dependency order.

---

## Architecture Overview

### Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Shell | Electron 33+ | Local-first, cross-platform desktop |
| Bundler | electron-vite (Vite 6) | Fast HMR, triple-build (main/preload/renderer) |
| Frontend | React 19, TypeScript, Tailwind CSS 4, Zustand | Component model, type safety, utility CSS, lightweight state |
| Backend | Node.js (main process) | Full Node API access for filesystem, network, crypto |
| Database | SQLite via better-sqlite3 | Replaces flat-file JSON. Full-text search, version history, transactions |
| AI | Multi-provider via BYOK | Anthropic, OpenAI, Gemini, Mistral, Ollama, Azure OpenAI |
| RSS | rss-parser | Proven RSS/Atom parser |
| Email (out) | nodemailer (SMTP) | SMTP sending |
| Email (in) | imapflow (IMAP) | Inbox polling for NL email interface |
| Scheduling | node-cron | Cron-based feed and digest scheduling |
| File watching | chokidar | Cowork trigger on raw file creation |
| Audio | BYOK TTS provider API | Text-to-speech for podcast digest (v2) |

### Storage Model — SQLite Migration

v1 used flat JSON/CSV files with atomic writes. v2 migrates to SQLite for:

- **Version history**: SKILL.md revisions with instant rollback
- **Full-text search**: article content searchable across all feeds
- **Reasoning log**: every AI decision stored with explanation
- **Relational queries**: subscriber profiles, feed-to-article, post performance
- **Transactions**: atomic multi-table updates (e.g. batch article scoring)

The two-layer split is preserved:

| Layer | Location | Contains |
|-------|----------|----------|
| Machine-specific | `%APPDATA%\Kogneet\appconfig.json` | Data folder path, encrypted API keys (BYOK), SMTP/IMAP credentials, window bounds |
| Portable | `{dataFolder}/kogneet.db` | SQLite database with all user data, SKILL.md versions, articles, reasoning logs |
| Portable | `{dataFolder}/settings.json` | User preferences (theme, display, notifications) — remains JSON for portability |
| Portable | `{dataFolder}/skills/` | Per-feed SKILL.md files (human-readable, git-friendly) |
| Portable | `{dataFolder}/raw/` | Raw fetched content by date |
| Portable | `{dataFolder}/processed/` | AI-processed content by date |
| Portable | `{dataFolder}/audio/` | Generated audio/podcast files (v2) |

### IPC Communication Pattern (unchanged from v1)

Every feature follows this pattern:

1. **Main process** (`ipc-handlers.ts`): register with `ipcMain.handle('channel:name', handler)`
2. **Preload** (`preload/index.ts`): expose as `channelName: (...args) => ipcRenderer.invoke('channel:name', ...args)`
3. **Renderer** (React): call as `await window.electronAPI.channelName(...args)`

When adding a new feature, you must update all three files.

---

# v1 — LAUNCH (Months 1–3)

## Foundation Layer

---

### Phase 1: Project Scaffold + SQLite Setup

**What it does:** Sets up the Electron + React + TypeScript project, installs dependencies, configures SQLite.

**Key files:**
- `package.json` — dependencies and scripts
- `electron.vite.config.ts` — triple Vite build config
- `src/main/index.ts` — Electron main process entry
- `src/preload/index.ts` — context bridge
- `src/renderer/App.tsx` — React root
- `src/main/database/index.ts` — SQLite initialisation and migrations (NEW)
- `src/main/database/migrations/` — versioned schema files (NEW)

**Carries forward from v1:** electron-vite config, preload pattern, Tailwind 4 dark mode setup, shared components (Button, Select, TextInput, Toggle, Modal, etc.), globals.css.

**How it works:**
1. Copy the electron-vite scaffold from v1 (triple build: main, preload, renderer).
2. Replace flat-file storage modules with `better-sqlite3`.
3. Create a migration system: `src/main/database/migrations/001-initial.sql` defines the base schema.
4. On startup, `initDatabase()` opens the SQLite file and runs any pending migrations.
5. Core tables for Phase 1: `feeds`, `settings_kv`, `skill_versions`.

**Things to watch out for:**
- `better-sqlite3` is a native module — it needs `electron-rebuild` or the electron-vite `externalizeDepsPlugin()` to work.
- SQLite must be opened in WAL mode (`PRAGMA journal_mode=WAL`) for concurrent read/write from the main process.
- Keep `settings.json` as a separate JSON file (not in SQLite) so it remains human-readable and portable.

---

### Phase 2: Two-Layer Storage + First Launch Wizard

**What it does:** Machine-specific config in `%APPDATA%`, portable data in user-chosen folder. Wizard on first launch.

**Key files:**
- `src/main/storage/appconfig.ts` — reads/writes `%APPDATA%/Kogneet/appconfig.json`
- `src/main/storage/settings.ts` — reads/writes `{dataFolder}/settings.json`
- `src/main/types.ts` — all TypeScript interfaces
- `src/renderer/components/wizard/FirstLaunchWizard.tsx` — onboarding UI

**Carries forward from v1:** Both storage modules, wizard component, deep-merge defaults pattern, atomic-write utility.

**How it works:**
1. Unchanged from v1 except the `appconfig.json` gains a `byok` section (see Phase 5).
2. Wizard now also collects the user's preferred AI provider (or "skip for now").

---

### Phase 3: BYOK Key Management

**What it does:** Stores and manages API keys for multiple AI providers. Keys encrypted at rest. Per-feature routing.

**Key files:**
- `src/main/services/ai-provider.ts` — provider abstraction layer (NEW)
- `src/main/services/key-manager.ts` — encryption, storage, validation (NEW)
- `src/main/storage/appconfig.ts` — `byok` section in appconfig
- `src/renderer/components/settings/AIKeysTab.tsx` — key management UI (NEW)

**How it works:**
1. **Key storage**: keys are AES-256 encrypted using a machine-derived key (from `electron.safeStorage`) and stored in `appconfig.json` under `byok`:
   ```json
   {
     "byok": {
       "providers": {
         "anthropic": { "key": "encrypted...", "models": ["claude-sonnet-4-6"] },
         "openai": { "key": "encrypted...", "models": ["gpt-4o"] }
       },
       "featureRouting": {
         "summarisation": "anthropic",
         "priorityScoring": "anthropic",
         "socialPosts": "openai",
         "digestGeneration": "anthropic"
       }
     }
   }
   ```
2. **`ai-provider.ts`**: exports `callAI(feature, prompt, options)` which:
   - Looks up the configured provider for that feature
   - Decrypts the key
   - Routes to the correct API (Anthropic SDK, OpenAI SDK, or generic OpenAI-compatible endpoint)
   - Returns the response in a normalised format
   - Tracks token usage per call
3. **Validation on save**: each provider has a test call (e.g. Anthropic → `messages.create` with a tiny prompt). The UI shows a green checkmark or error.
4. **Model capability detection**: warns if the selected model is unlikely to perform well (e.g. haiku for complex summarisation).
5. **Token usage display**: aggregated per-provider, per-feature, per-day. Stored in SQLite.

**Things to watch out for:**
- `electron.safeStorage` is only available after `app.whenReady()`. Don't try to decrypt keys during module import.
- OpenAI-compatible endpoints (Ollama, Azure) need a `baseURL` override — the provider config must support this.
- Keys must NEVER appear in logs, error messages, or analytics. Sanitise all error output from provider calls.

---

### Phase 4: Settings Panel

**What it does:** Tabbed settings UI — extends v1 with AI Keys tab and per-feature AI routing.

**Key files:**
- `src/renderer/components/settings/SettingsPanel.tsx` — tab container
- `src/renderer/components/settings/GeneralTab.tsx` — startup, defaults
- `src/renderer/components/settings/AppearanceTab.tsx` — theme, accent, font
- `src/renderer/components/settings/AIKeysTab.tsx` — BYOK config (NEW)
- `src/renderer/components/settings/EmailTab.tsx` — SMTP + IMAP config
- `src/renderer/stores/settings-store.ts` — Zustand store

**Carries forward from v1:** All existing tabs (General, Appearance, Email, Notifications, Display, Data & Storage). Settings store with auto-save.

---

## SKILL.md System (THE MOAT)

---

### Phase 5: SKILL.md File Format + Per-Feed Storage

**What it does:** Defines the SKILL.md specification and stores one per feed with version history.

**Key files:**
- `src/main/services/skill-manager.ts` — CRUD, versioning, rollback (NEW)
- `src/main/database/migrations/002-skills.sql` — skill_versions table (NEW)
- `src/main/types.ts` — `SkillConfig` interface
- `{dataFolder}/skills/{feedId}.skill.md` — human-readable skill files

**How it works:**
1. **File format**: each SKILL.md is a Markdown file with YAML frontmatter:
   ```markdown
   ---
   feed_id: abc12345
   feed_name: Reuters World News
   feed_domain: reuters.com
   version: 3
   created_at: 2026-04-12T08:00:00Z
   updated_at: 2026-04-12T14:30:00Z
   ---

   ## Surface Criteria
   Include articles about: geopolitics, trade policy, central bank decisions.
   Keyword signals: "sanctions", "tariff", "rate decision", "summit".
   Always include if: mentions Australia, New Zealand, or APAC region.

   ## Filter Criteria
   Exclude: sports results, entertainment news, opinion pieces (byline contains "Opinion").
   Exclude: articles shorter than 200 words (likely wire stubs).

   ## Summarisation Style
   Format: 2-3 sentence executive summary.
   Always include: which countries/entities are involved, what changed, why it matters.
   Language register: formal, factual, no editorialising.

   ## Priority Scoring
   HIGH: sanctions, military action, central bank rate changes, trade agreements.
   MEDIUM: diplomatic meetings, policy proposals, economic data releases.
   LOW: cultural exchanges, sports diplomacy, human interest.

   ## Digest Presentation
   Group by: region (APAC, Europe, Americas).
   Sort within group: priority descending, then recency.
   Citation format: "Reuters — [headline]" with link.

   ## Social Post Style
   LinkedIn: professional analysis angle, 200 chars, no emoji.
   X/Twitter: news-breaking tone, 280 chars, 1-2 relevant hashtags.
   Slack: brief factual summary, link to full digest.
   ```
2. **Version history**: every save writes a new row to `skill_versions` table:
   ```sql
   CREATE TABLE skill_versions (
     id INTEGER PRIMARY KEY,
     feed_id TEXT NOT NULL,
     version INTEGER NOT NULL,
     content TEXT NOT NULL,       -- full SKILL.md content
     instruction TEXT,            -- the NL instruction that produced this version
     diff_summary TEXT,           -- plain-English description of what changed
     created_at TEXT NOT NULL,
     UNIQUE(feed_id, version)
   );
   ```
3. **Rollback**: `rollbackSkill(feedId, version)` copies that version's content to a new version (append-only, never destructive).
4. **Disk sync**: the `.skill.md` file on disk always reflects the latest version. Power users can edit it directly — the app detects external changes via mtime comparison.

**Things to watch out for:**
- The SKILL.md file is BOTH a file on disk (for human editing / git tracking) AND versioned in SQLite (for rollback / history). Keep them in sync: disk is the source of truth for content, SQLite is the source of truth for history.
- Feed domain extraction: `new URL(feed.url).hostname` — handle edge cases like subdomains (`news.ycombinator.com` → `ycombinator.com`).

---

### Phase 6: SKILL.md Natural Language Editor

**What it does:** Users type plain English instructions. The AI reads the current SKILL.md, generates an updated version, and previews the impact on recent articles before committing.

**Key files:**
- `src/main/services/skill-editor.ts` — NL → SKILL.md generation pipeline (NEW)
- `src/renderer/components/skills/SkillEditor.tsx` — main editor UI (NEW)
- `src/renderer/components/skills/SkillPreview.tsx` — article impact preview (NEW)
- `src/renderer/components/skills/SkillHistory.tsx` — version timeline (NEW)

**How it works:**
1. **Editor UI**: split-pane layout:
   - Left: natural language input (textarea) + instruction history
   - Right: current SKILL.md content (read-only Markdown, or editable for power users)
   - Bottom: article impact preview (see step 4)
2. **NL → SKILL.md pipeline** (`skill-editor.ts`):
   a. User submits an instruction (e.g. "Ignore opinion pieces and prioritise anything about AI regulation").
   b. Build a prompt:
      ```
      You are updating a SKILL.md file for the feed "{feedName}".
      Current SKILL.md:
      {currentContent}

      User instruction:
      {instruction}

      Rules:
      - Honour all existing configuration unless the instruction explicitly contradicts it
      - Output the complete updated SKILL.md (not a diff)
      - After the SKILL.md, output a ## Changes section explaining what changed and why
      ```
   c. Call `callAI('skillEditor', prompt)` via the BYOK provider.
   d. Parse the response: extract the updated SKILL.md content and the changes explanation.
   e. Return both to the renderer.
3. **Preview before commit**: the updated SKILL.md is NOT saved yet. Instead:
   a. Load the last 20 articles for this feed from the `articles` table.
   b. Run each article through both the OLD and NEW SKILL.md criteria (via a scoring prompt).
   c. Show a diff view: which articles changed status (surfaced ↔ filtered), which changed priority, which changed summary style.
   d. Each article shows its reasoning in plain English.
4. **Commit**: user clicks "Apply" → new version saved to `skill_versions` + disk file updated. Or "Discard" → nothing saved.
5. **Direct edit mode**: power users can toggle to raw Markdown editing. On save, the same preview pipeline runs.

**Things to watch out for:**
- The preview step requires 20 × 2 AI calls (old + new scoring for each article). This is expensive. Batch them into a single prompt with all 20 articles to reduce cost.
- If the user has no BYOK key configured, the editor cannot function. Show a clear "Configure an AI provider in Settings → AI Keys" message.
- The SKILL.md format must be stable enough that AI-generated updates don't drift from the spec. Include format validation after generation.

---

### Phase 7: Article Reasoning Log

**What it does:** Every AI decision about every article is stored with a plain-language explanation. Users can audit, search, and correct.

**Key files:**
- `src/main/database/migrations/003-reasoning.sql` — reasoning_log table (NEW)
- `src/main/services/reasoning-logger.ts` — logging service (NEW)
- `src/renderer/components/digest/ReasoningPanel.tsx` — per-article reasoning viewer (NEW)

**How it works:**
1. **Schema**:
   ```sql
   CREATE TABLE reasoning_log (
     id INTEGER PRIMARY KEY,
     article_id TEXT NOT NULL,
     feed_id TEXT NOT NULL,
     skill_version INTEGER NOT NULL,
     decision TEXT NOT NULL,        -- 'surfaced' | 'filtered' | 'priority_changed'
     priority TEXT,                 -- 'high' | 'medium' | 'low'
     explanation TEXT NOT NULL,     -- plain-English reasoning
     signals TEXT,                  -- JSON array of keyword/entity matches
     created_at TEXT NOT NULL
   );
   ```
2. Every time the SKILL.md processor runs on an article, it writes a reasoning_log entry.
3. **UI**: clicking "Why?" on any DigestCard opens a panel showing:
   - The decision (surfaced / filtered / priority level)
   - The plain-English explanation
   - Which SKILL.md rules triggered
   - The SKILL.md version used
   - A "This is wrong" button → opens the NL editor pre-filled with a correction context

**Things to watch out for:**
- Reasoning logs grow fast (20 articles × 10 feeds × daily = 200 rows/day). Add retention cleanup.
- The "This is wrong" correction flow is critical for the product loop: bad decisions → corrections → better SKILL.md → better decisions.

---

## Content Ingestion Layer

---

### Phase 8: RSS/Atom Ingestion + Full-Text Extraction

**What it does:** Fetches RSS feeds, extracts full text (even from excerpt-only feeds), applies SKILL.md, writes to SQLite + raw files.

**Key files:**
- `src/main/services/feed-fetcher.ts` — RSS fetch pipeline
- `src/main/services/full-text-extractor.ts` — article full-text from URL (NEW)
- `src/main/services/skill-processor.ts` — applies SKILL.md to articles (NEW)
- `src/main/database/migrations/004-articles.sql` — articles table (NEW)

**Carries forward from v1:** rss-parser usage, content cleansing (`stripHtml`, `cleanseContent`), date extraction, change detection, raw file writing.

**How it works:**
1. rss-parser fetches the feed. For each item:
   a. If the item has full content, use it.
   b. If excerpt-only (< 500 chars or truncated), call `fullTextExtract(item.link)` which fetches the page HTML, extracts the article body using readability heuristics (Mozilla Readability or similar), and returns clean text.
2. Store in `articles` table:
   ```sql
   CREATE TABLE articles (
     id TEXT PRIMARY KEY,
     feed_id TEXT NOT NULL,
     title TEXT NOT NULL,
     link TEXT UNIQUE,
     content TEXT,                  -- full text
     content_html TEXT,             -- original HTML (for re-processing)
     summary TEXT,                  -- AI-generated
     priority TEXT,                 -- from SKILL.md scoring
     status TEXT DEFAULT 'new',     -- new | changed | unchanged | filtered
     reasoning_id INTEGER,         -- FK to reasoning_log
     published_at TEXT,
     fetched_at TEXT NOT NULL,
     metadata TEXT,                 -- JSON blob for dates, categories, etc.
     FOREIGN KEY (feed_id) REFERENCES feeds(id)
   );
   ```
3. After fetch, run `applySkill(feedId, articles)`:
   a. Load the feed's current SKILL.md.
   b. For each article, call the AI to score priority, decide surface/filter, and generate a summary.
   c. Write results to `articles` table + `reasoning_log`.
4. Continue writing raw Markdown files (for Cowork compatibility and human readability).

**Things to watch out for:**
- Full-text extraction is rate-sensitive. Some sites block rapid requests. Add a per-domain rate limiter (1 req/sec default).
- Readability extraction fails on SPAs and JS-rendered pages. These get the excerpt only — note it in the article metadata.
- The PRD says "full-text extraction is non-negotiable at launch." But some feeds genuinely only have excerpts and block scraping. Be honest in the UI: show "Excerpt only — source blocks full-text" rather than silently failing.

---

### Phase 9: Newsletter Ingestion (SMTP Inbound)

**What it does:** Each user gets a local SMTP listener. Subscribe to newsletters with that address. Newsletters appear alongside RSS content.

**Key files:**
- `src/main/services/newsletter-receiver.ts` — local SMTP server (NEW)
- `src/main/services/newsletter-parser.ts` — email → article conversion (NEW)

**How it works:**
1. Use `smtp-server` npm package to run a local SMTP server on a configurable port (default 2525).
2. Incoming emails are parsed with `mailparser`: extract sender, subject, HTML body, plain text, attachments.
3. HTML body → `stripHtml()` → article content. Metadata extracted from email headers.
4. Inserted into `articles` table with `source_type = 'newsletter'` and the sender's domain as the feed.
5. SKILL.md applies identically — each newsletter sender gets its own feed entry and skill file.

**Things to watch out for:**
- A local SMTP server is only reachable on the local machine (or LAN). For external newsletter delivery, users need port forwarding or a mail relay. Document this clearly.
- Alternative approach: use the existing IMAP polling (from v1) to read newsletters from a Gmail/M365 inbox instead of running a local SMTP server. This is simpler and more practical for most users. Offer both options.

---

### Phase 10: Podcast Ingestion

**What it does:** Subscribes to podcast RSS feeds, downloads episodes, extracts transcripts via speech-to-text, applies SKILL.md.

**Key files:**
- `src/main/services/podcast-fetcher.ts` — podcast RSS + audio download (NEW)
- `src/main/services/transcriber.ts` — speech-to-text via BYOK (NEW)

**How it works:**
1. Podcast RSS feeds are standard RSS with `<enclosure>` tags pointing to audio files.
2. Download the audio file to `{dataFolder}/audio/episodes/`.
3. Transcribe using the user's BYOK provider:
   - OpenAI Whisper API: send audio, receive transcript
   - Local Whisper (via Ollama or standalone): same interface
   - Anthropic: no native STT — use a third-party or skip transcription
4. Transcript → `articles` table with `source_type = 'podcast'`.
5. SKILL.md applies normally. Episode metadata (duration, show notes) stored in `metadata` JSON.

**Things to watch out for:**
- Audio files are large (50-200MB per episode). Add configurable retention (keep last N episodes).
- Transcription is slow (minutes per episode). Must be async with progress indication.
- Not all BYOK providers support STT. Show clear messaging when the configured provider can't transcribe.

---

### Phase 11: Browser Clipper Extension

**What it does:** Chrome/Firefox extension that saves any web page to Kogneet with immediate AI summary and relevance score.

**Key files:**
- `extensions/chrome/` — Chrome extension (NEW)
- `extensions/firefox/` — Firefox extension (NEW)
- `src/main/services/clipper-server.ts` — local HTTP endpoint for extension communication (NEW)

**How it works:**
1. The Electron app runs a local HTTP server on a fixed port (e.g. `http://localhost:19222`).
2. The browser extension:
   a. Injects a content script that can extract the full page HTML.
   b. On click: sends `{ url, title, html, selectedText }` to the local server.
3. The local server:
   a. Extracts article body from the HTML (same readability pipeline as Phase 8).
   b. Runs a quick AI call: summary + relevance score + suggested feed.
   c. Returns the result to the extension popup: "Saved. Relevance: HIGH. Suggest subscribing to this source?"
4. If the user clips from the same domain 3+ times, suggest adding it as a feed with an auto-configured SKILL.md.

**Things to watch out for:**
- The extension communicates over localhost HTTP — no CORS issues, but the port must be consistent and discoverable.
- Chrome Manifest V3 restrictions: service workers can't maintain persistent connections. Use fetch-based communication.
- The Electron app must be running for the clipper to work. Show a clear "Kogneet is not running" message in the extension when the local server is unreachable.

---

## Feed Management

---

### Phase 12: Feed CRUD + Scheduling

**What it does:** Add, edit, delete, enable/disable feeds. Per-feed scheduling. Import/export.

**Carries forward from v1:** FeedList, FeedForm, SchedulePicker, feeds storage, feed-fetcher scheduling via node-cron, import/export (CSV + Markdown table), delete cascade.

**Key files:**
- `src/renderer/components/feeds/FeedList.tsx`
- `src/renderer/components/feeds/FeedForm.tsx`
- `src/main/storage/feeds.ts` — now reads/writes SQLite `feeds` table
- `src/main/services/scheduler.ts`

**Migration note:** Move from `feeds.json` to SQLite `feeds` table. The schema is the same as the v1 `Feed` interface but as SQL columns. The `criteria` field is replaced by a FK reference to the SKILL.md system.

---

### Phase 13: Feed Assessment + Auto SKILL.md Generation

**What it does:** When a feed is first added, automatically analyses its content and generates an initial SKILL.md.

**Carries forward from v1:** criteria-analyser.ts (category extraction, date field detection, urgency rule proposals).

**Key files:**
- `src/main/services/criteria-analyser.ts` — analysis logic (refactored)
- `src/main/services/skill-editor.ts` — generates initial SKILL.md from analysis results

**How it works:**
1. On feed add: fetch first batch of articles.
2. Run v1 criteria analysis: extract categories, detect date fields, propose urgency rules.
3. Convert the analysis result into an initial SKILL.md using an AI call:
   ```
   Generate a SKILL.md for this feed based on the analysis:
   Feed: {name} ({url})
   Detected categories: {categories}
   Detected date fields: {dateFields}
   Proposed urgency rules: {rules}

   The user has not given any instructions yet. Create a reasonable default configuration.
   ```
4. Save as version 1 of the feed's SKILL.md.
5. User can then refine via the NL editor (Phase 6).

---

## Digest System

---

### Phase 14: Digest View + Filtering

**What it does:** Displays articles as filterable, sortable cards. Per-feed cascading filters. Saved filter configurations.

**Carries forward from v1:** DigestView, DigestCard, DigestToolbar, MultiSelectDropdown, FY quarter calculation, digest config save/load. The teaser display callout on DigestCard.

**Key files:**
- `src/renderer/components/digest/DigestView.tsx`
- `src/renderer/components/digest/DigestCard.tsx`
- `src/renderer/components/digest/DigestToolbar.tsx`
- `src/renderer/components/digest/ReasoningPanel.tsx` — NEW (from Phase 7)

**Changes from v1:**
- Article data now comes from SQLite instead of parsing Markdown files.
- Each card has a "Why?" button linking to the reasoning log.
- Teaser display carries forward unchanged.

---

### Phase 15: Digest MCP v1 — Agentic Production Pipeline

**What it does:** Multi-step agent that plans, gathers, synthesises, and produces publication-quality digests. Not a single prompt — a multi-turn loop with tool calls.

**Key files:**
- `src/main/services/digest-agent/index.ts` — agent orchestrator (NEW)
- `src/main/services/digest-agent/planner.ts` — content plan generation (NEW)
- `src/main/services/digest-agent/gatherer.ts` — full-text fetch + enrichment (NEW)
- `src/main/services/digest-agent/synthesiser.ts` — narrative generation (NEW)
- `src/main/services/digest-agent/producer.ts` — multi-format output (NEW)
- `src/main/services/digest-agent/tools.ts` — agent tool definitions (NEW)
- `src/main/database/migrations/005-digest-runs.sql` — run log schema (NEW)
- `src/renderer/components/digest/DigestRunView.tsx` — run inspector UI (NEW)

**How it works:**

1. **Planning phase** (`planner.ts`):
   - Reads all articles scored HIGH or MEDIUM from today (or specified date range).
   - Calls AI with tool access: `get_priority_articles`, `get_prior_digest_context` (last 3 digests for continuity).
   - AI identifies top stories, detects clusters of related coverage, builds a content plan.
   - Content plan is a structured JSON: `{ sections: [{ title, articles: [id], angle, format }] }`.
   - Plan is saved to `digest_runs` table and shown in UI for user inspection/override.

2. **Gathering phase** (`gatherer.ts`):
   - For each article in the plan, ensure full text is available.
   - If excerpt-only, run `fullTextExtract()`.
   - For podcasts, ensure transcript exists.
   - Can invoke MCP sources (v2) for enrichment.

3. **Synthesis phase** (`synthesiser.ts`):
   - Takes the content plan + gathered full text.
   - AI writes the digest as a **coherent narrative** — not a list of summaries.
   - Identifies threads connecting top stories.
   - Includes per-article teasers (social post style from SKILL.md).
   - Output: structured Markdown with metadata per section.

4. **Production phase** (`producer.ts`):
   - Takes synthesised content and produces output formats:
     - **Written**: Markdown → styled HTML (for email), plain Markdown (for Obsidian/Notion export)
     - **Email**: sent via nodemailer to all active subscribers (per-subscriber filtering from v1)
     - **Slack**: formatted message via webhook URL (configurable in settings)
   - Audio and podcast output deferred to v2.

5. **Run log**: every step writes to `digest_runs`:
   ```sql
   CREATE TABLE digest_runs (
     id TEXT PRIMARY KEY,
     started_at TEXT NOT NULL,
     completed_at TEXT,
     status TEXT DEFAULT 'running',  -- running | completed | failed | cancelled
     content_plan TEXT,              -- JSON
     output_markdown TEXT,
     output_html TEXT,
     run_log TEXT,                   -- JSON array of step logs
     error TEXT
   );
   ```

6. **Run inspector UI** (`DigestRunView.tsx`): shows the content plan, each step's status, the output, and a "Re-run" button for failed steps.

**Things to watch out for:**
- The synthesis step is the most expensive AI call. For a 20-article digest, expect 5,000-10,000 tokens of input. Use the user's BYOK key.
- The digest agent is NOT the same as Cowork enrichment from v1. Cowork was an external process; this is built into the app. Cowork integration is still available as a BYOM option.
- Content plan inspection is critical. Users must be able to remove articles, reorder sections, or add notes before synthesis runs.

---

### Phase 16: Email Digest Delivery

**What it does:** Sends personalised digest emails to subscribers. Per-subscriber feed filtering. Scheduled daily send.

**Carries forward from v1:** email-sender.ts (SMTP verify, test email, welcome email, markdown-to-HTML, per-subscriber filtering, manage/unsubscribe mailto links, List-Unsubscribe header), email-scheduler.ts (cron scheduling, duplicate prevention), subscriber management (CRUD, CSV storage → SQLite migration), unsubscribe-processor.ts (IMAP polling, manage subscription parsing, feed suggestions).

**Key files:**
- `src/main/services/email-sender.ts`
- `src/main/services/email-scheduler.ts`
- `src/main/services/unsubscribe-processor.ts`
- `src/renderer/components/subscribers/SubscriberList.tsx`
- `src/renderer/components/subscribers/SubscriberForm.tsx`

**Changes from v1:**
- Digest content now comes from the digest agent output (Phase 15) instead of raw/processed files.
- Subscriber data migrates from CSV to SQLite `subscribers` table.
- The NL email interface (Layer 4) enhances the existing IMAP processor: replies are no longer keyword-only but parsed by AI for natural language instructions.

---

## Social Publishing Agent

---

### Phase 17: Social Agent v1 — Publish + Basic Analytics

**What it does:** Publishes content to X, LinkedIn, Instagram, Facebook, Bluesky. Reads back analytics. Human approval queue.

**Key files:**
- `src/main/services/social-agent/index.ts` — agent orchestrator (NEW)
- `src/main/services/social-agent/platforms/x.ts` — X/Twitter API (NEW)
- `src/main/services/social-agent/platforms/linkedin.ts` — LinkedIn API (NEW)
- `src/main/services/social-agent/platforms/instagram.ts` — Instagram Graph API (NEW)
- `src/main/services/social-agent/platforms/facebook.ts` — Facebook Graph API (NEW)
- `src/main/services/social-agent/platforms/bluesky.ts` — AT Protocol (NEW)
- `src/main/services/social-agent/post-generator.ts` — AI post writing (NEW)
- `src/main/services/social-agent/analytics.ts` — platform analytics ingestion (NEW)
- `src/main/database/migrations/006-social.sql` — posts, analytics tables (NEW)
- `src/renderer/components/social/SocialDashboard.tsx` — overview (NEW)
- `src/renderer/components/social/ApprovalQueue.tsx` — human review (NEW)
- `src/renderer/components/social/PostComposer.tsx` — edit before publish (NEW)

**How it works:**

1. **Post generation** (`post-generator.ts`):
   - For each digest item, reads the SKILL.md `social_post_style` section for the source feed.
   - Generates platform-native posts:
     - X: single tweet or thread (if content warrants), with hashtags
     - LinkedIn: professional register, 200-500 chars, career/industry framing
     - Bluesky: conversational, short, AT Protocol post format
     - Instagram: caption-optimised, call-to-action, hashtags
     - Facebook: longer form, link preview optimised
   - Each post includes: the angle chosen (contrarian, data-led, explainer, etc.), reasoning for the angle choice, and source article reference.

2. **Human approval queue** (`ApprovalQueue.tsx`):
   - Shows generated posts in a card list: post text, target platform, angle, reasoning.
   - Actions: Approve, Edit, Reject, Reschedule.
   - Batch approve for trusted feeds.
   - Approved posts enter the publish queue.

3. **Publishing**:
   - Platform SDKs/APIs handle actual posting.
   - OAuth2 token management per platform (stored encrypted in appconfig).
   - Post results (URL, ID) stored in `social_posts` table.

4. **Analytics ingestion** (`analytics.ts`):
   - Scheduled job (hourly): for each post published in the last 7 days, fetch engagement metrics from the platform API.
   - Metrics: reach, impressions, engagement rate, likes, shares/reposts, comments, click-throughs, saves.
   - Stored in `social_analytics` table, tagged with post ID, platform, angle, source article, time.

5. **Schema**:
   ```sql
   CREATE TABLE social_posts (
     id TEXT PRIMARY KEY,
     article_id TEXT,
     platform TEXT NOT NULL,
     content TEXT NOT NULL,
     angle TEXT,
     reasoning TEXT,
     status TEXT DEFAULT 'draft',  -- draft | queued | published | failed
     published_at TEXT,
     platform_post_id TEXT,
     platform_post_url TEXT
   );

   CREATE TABLE social_analytics (
     id INTEGER PRIMARY KEY,
     post_id TEXT NOT NULL,
     fetched_at TEXT NOT NULL,
     reach INTEGER, impressions INTEGER,
     likes INTEGER, shares INTEGER, comments INTEGER,
     clicks INTEGER, saves INTEGER,
     engagement_rate REAL,
     FOREIGN KEY (post_id) REFERENCES social_posts(id)
   );
   ```

**Things to watch out for:**
- Each platform has different OAuth flows. X uses OAuth 2.0 PKCE. LinkedIn uses 3-legged OAuth. Bluesky uses app passwords (AT Protocol). Handle each separately.
- Instagram posting requires a Facebook Business account + Instagram Graph API. Document this.
- Rate limits vary wildly per platform. X: 50 tweets/day (free tier). LinkedIn: 100 posts/day. Build rate limit tracking.
- Platform API changes can break integrations. Build a health-check system that detects and reports degradation.

---

### Phase 18: GA4 Integration

**What it does:** Connects Google Analytics 4 to track which social posts drive actual website conversions (signups, purchases, return visits).

**Key files:**
- `src/main/services/social-agent/ga4.ts` — GA4 Data API integration (NEW)
- `src/renderer/components/social/ConversionDashboard.tsx` — attribution view (NEW)

**How it works:**
1. User connects GA4 property via OAuth (Google Cloud credentials).
2. Each social post URL includes UTM parameters: `utm_source=kogneet&utm_medium=social&utm_campaign={postId}&utm_content={platform}`.
3. GA4 Data API fetched daily: sessions, conversions, revenue by UTM campaign.
4. Mapped back to `social_posts` → shows which posts drove real business outcomes vs vanity engagement.

---

## Interaction Layers

---

### Phase 19: Smart Notifications (Layer 3)

**What it does:** Desktop notifications with AI-chosen one-tap actions contextual to each article.

**Key files:**
- `src/main/services/smart-notifications.ts` — notification generation (NEW)
- `src/main/utils/notifications.ts` — extended from v1

**Carries forward from v1:** Basic notification infrastructure (fetch complete, error, email sent).

**How it works:**
1. When articles are scored HIGH by SKILL.md, generate a notification.
2. AI determines contextual actions based on article topic and user's boards:
   - Legal article → "Add to Legal Board"
   - Competitor mention → "Add to Competitive Intel"
   - Product update → "Draft social post"
3. Notification shows: title, 1-line summary, priority badge, and 1-2 action buttons.
4. Actions are executed via IPC when the button is clicked.

---

### Phase 20: AI-Enhanced Email Interface (Layer 4)

**What it does:** IMAP inbox processing upgraded from keyword commands to natural language understanding. A single email reply can trigger multiple actions.

**Carries forward from v1:** unsubscribe-processor.ts (IMAP connection, inbox polling, UNSUB/MANAGE parsing).

**Key files:**
- `src/main/services/email-ai-interface.ts` — NL email parser (NEW, extends unsubscribe-processor)

**How it works:**
1. Existing IMAP polling continues unchanged.
2. For emails that don't match UNSUBSCRIBE or MANAGE SUBSCRIPTION patterns, pass the body to AI:
   ```
   Parse this email reply from subscriber {name}. Determine what actions they want:
   - Save articles (by title reference)
   - Change feed subscriptions
   - Adjust delivery preferences
   - Ask a question about recent content
   - Other instructions
   
   Email body: {body}
   ```
3. AI returns structured actions which are executed via the existing service layer.
4. Confirmation email sent back to subscriber with what was done.

---

### Phase 21: SKILL.md Marketplace (Seed)

**What it does:** A local catalog of community SKILL.md configurations. Seeded with 20-30 popular feeds. Users can browse and apply when adding a new source.

**Key files:**
- `src/main/services/marketplace.ts` — catalog management (NEW)
- `src/main/database/migrations/007-marketplace.sql` — local marketplace cache (NEW)
- `src/renderer/components/skills/MarketplaceBrowser.tsx` — browse + preview UI (NEW)

**How it works:**
1. **v1 launch**: marketplace is a bundled JSON catalog shipped with the app (no cloud backend yet).
2. Each entry: `{ domain, feedName, description, skillContent, usageCount, lastUpdated }`.
3. When user adds a new feed, check if the domain matches a marketplace entry.
4. If match found: show a preview — "Community config available for reuters.com. Apply it?"
5. Applied config becomes the feed's initial SKILL.md (version 1). User can then customise via NL editor.
6. v3 will add a cloud-hosted marketplace with fork/contribute flow.

---

# v2 — INTELLIGENCE LAYER (Months 4–6)

---

### Phase 22: Audio/Podcast Digest Output

**What it does:** TTS rendering of written digests into MP3. Private podcast RSS feed for listening in any podcast app.

**Key files:**
- `src/main/services/digest-agent/audio-producer.ts` — TTS pipeline (NEW)
- `src/main/services/podcast-feed.ts` — private RSS feed generator (NEW)

**How it works:**
1. Synthesis phase (Phase 15) writes a spoken script variant: natural transitions, host framing, segment breaks.
2. TTS via BYOK provider: OpenAI TTS API, ElevenLabs, or local TTS.
3. Output: MP3 file in `{dataFolder}/audio/digests/`.
4. Private podcast feed: a local HTTP endpoint serves an RSS XML feed with `<enclosure>` tags pointing to the MP3 files. User adds `http://localhost:{port}/podcast.xml` to their podcast app.

---

### Phase 23: Ambient Behaviour Model (Layer 1)

**What it does:** Silently observes reading behaviour. Acts on reversible inferences. Proposes before acting on consequential ones.

**Key files:**
- `src/main/services/behaviour-model.ts` — signal accumulation (NEW)
- `src/renderer/hooks/useReadingSignals.ts` — dwell time, scroll depth tracking (NEW)

**How it works:**
1. Track in-app signals: article dwell time, scroll depth, clipboard copies, re-opens, search queries.
2. Store signals in SQLite `behaviour_signals` table.
3. Periodically (daily), analyse signals to infer preferences:
   - Topics with high dwell → increase priority weight in SKILL.md
   - Topics consistently skipped → propose filter addition
4. **Reversible actions** (auto): adjust SKILL.md filter weights silently.
5. **Consequential actions** (propose): "You've read 8 articles about AI regulation this week. Should I add an AI regulation priority rule?" — shown as a non-blocking suggestion card.

---

### Phase 24: Conversational AI Layer (Layer 2)

**What it does:** Natural language bot accessible via Slack, Teams, SMS, WhatsApp. Full access to the intelligence core.

**Key files:**
- `src/main/services/conversational/index.ts` — NL command router (NEW)
- `src/main/services/conversational/slack-bot.ts` — Slack integration (NEW)
- `src/main/services/conversational/teams-bot.ts` — Teams integration (NEW)

**How it works:**
1. Slack bot: uses Slack Bolt SDK. User sends messages in a DM channel.
2. Messages parsed by AI with full context: SKILL.md files, article database, digest queue, social drafts.
3. AI responds with structured actions + natural language confirmation.
4. Examples: "What were the top 3 stories today?" → queries articles, returns summary. "Draft a LinkedIn post about the AWS outage" → generates post, returns for approval.

---

### Phase 25: Social Agent — Closed-Loop Tuning

**What it does:** Analytics-driven self-tuning of post format, angle, timing, and voice per platform.

**Key files:**
- `src/main/services/social-agent/tuner.ts` — performance model (NEW)
- `src/renderer/components/social/WeeklyReview.tsx` — AI-written review (NEW)

**How it works:**
1. After 30+ posts with analytics data, build a performance model:
   - Which angle (contrarian, data-led, etc.) gets highest engagement per platform
   - Which posting times perform best per platform
   - Which source feeds generate the best social content
2. Weekly review: AI writes a plain-language analysis (not charts) explaining what worked, what didn't, what it proposes to change.
3. User confirms/overrides/refines via conversational interface.

---

### Phase 26: Encrypted Sync Layer

**What it does:** Optional sync to user-controlled storage (NAS, S3, Backblaze B2). AES-256. Platform never sees the key.

**Key files:**
- `src/main/services/sync/index.ts` — sync orchestrator (NEW)
- `src/main/services/sync/providers/s3.ts` — S3-compatible provider (NEW)
- `src/main/services/sync/encryption.ts` — AES-256 file encryption (NEW)

---

### Phase 27: Social A/B Testing

**What it does:** Generate two post variants per article. Auto-publish winner after 4h engagement signal.

---

### Phase 28: BYOM — User-Supplied Digest MCP

**What it does:** Users can replace the built-in digest agent with their own MCP endpoint.

**Key files:**
- `src/main/services/digest-agent/byom-bridge.ts` — structured I/O contract (NEW)

**How it works:**
1. User configures an MCP endpoint URL in settings.
2. Platform sends structured input: `{ articles: [...], userPreferences, priorDigestContext }`.
3. Expects structured output: `{ sections: [...], markdown, html }`.
4. The built-in digest agent is bypassed entirely. Platform handles delivery.

---

# v3 — PORTAL + TEAM LAYER (Months 7–9)

---

### Phase 29: Shared Intelligence Portal

**What it does:** A web page subscribers log into. Owner curates; visitors consume.

### Phase 30: Subscriber Analytics Layer

**What it does:** Who read what, which sections drove engagement, which profiles are most active.

### Phase 31: Team Shared Feeds + Boards

**What it does:** Collaborative curation. One-direction content flow.

### Phase 32: SKILL.md Marketplace (Community)

**What it does:** Full community contribution model with fork, customise, contribute back.

### Phase 33: Transaction API

**What it does:** Internal API exposed with account-scoped tokens. Metered usage.

### Phase 34: SSO + Team Admin

**What it does:** SAML/OIDC. User management for team accounts.

---

## Key Concepts for New Developers

### SKILL.md is the Centre of Everything

Almost every feature touches the SKILL.md system:
- Feeds generate SKILL.md on first add
- The NL editor modifies SKILL.md
- Article scoring reads SKILL.md
- Digest planning uses SKILL.md priority scores
- Social post generation reads SKILL.md style section
- The ambient model proposes SKILL.md changes
- The marketplace distributes SKILL.md files

If you're unsure how a feature should work, ask: "What does the SKILL.md say?"

### AI Calls Go Through One Place

All AI usage goes through `ai-provider.ts` → `callAI(feature, prompt, options)`. This:
- Routes to the user's configured provider for that feature
- Handles key decryption
- Tracks token usage
- Normalises responses across providers
- Respects rate limits

Never call an AI API directly from a service. Always go through `callAI()`.

### SQLite, Not JSON

v2 uses SQLite for all structured data except `settings.json` and `appconfig.json`. This means:
- Use SQL queries, not `JSON.parse(fs.readFileSync())`.
- Use transactions for multi-step operations.
- Use `better-sqlite3` (synchronous API) — simpler than async SQLite wrappers in Node.
- Run migrations on startup. Never modify the schema manually.

### The Agent Pattern

Both the Digest MCP (Phase 15) and Social Agent (Phase 17) follow the same pattern:
1. **Orchestrator**: manages the agent loop, decides which step to run next.
2. **Tools**: defined as functions the AI can call (`get_priority_articles`, `fetch_full_text`, etc.).
3. **Run log**: every step recorded with inputs, outputs, and reasoning.
4. **Human checkpoint**: the agent pauses at defined points for user review (content plan, post approval).

This is not a single prompt → response. It's a multi-turn loop where the AI calls tools, gets results, reasons about them, and decides the next step.

### Tailwind CSS 4 Dark Mode (unchanged from v1)

```css
@custom-variant dark (&:where(.dark, .dark *));
```

Without this line, Tailwind 4 uses `@media (prefers-color-scheme: dark)` instead of the `.dark` class.
