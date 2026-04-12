# RSS Intelligence

## Product Requirements Document

**Version 2.0 | April 2026 | Confidential**

---

## 1. Executive Summary

RSS Intelligence is a local-first, AI-native content intelligence platform built for knowledge workers who need to stay genuinely informed -- not just subscribed. It competes directly against Feedly Pro+ by offering superior AI triage at a lower price point, while introducing capabilities no competitor has attempted: a natural-language feed behaviour system (SKILL.md), a multi-format agentic digest pipeline, a closed-loop social publishing agent, and a four-layer ambient interaction model.

The product's primary moat is the SKILL.md system: per-feed AI behaviour files generated from natural language instructions, applied live, shareable via a community marketplace. This is not a configuration system -- it is the mechanism by which the AI learns to see each information source the way the user sees it. No competitor has anything comparable.

## 2. Product Vision

A research colleague who knows your interests, watches what you pay attention to, synthesises it into the formats you need, publishes it to the audiences you choose, and learns continuously from what works -- all running locally on your machine, with your AI keys, without your data leaving your control.

The vision in one sentence: intelligence production at the speed of thought, owned entirely by the person using it.

## 3. Target Users

### Primary -- the serious individual reader

Knowledge workers reading 50-300+ articles per week for professional awareness. Journalists, independent researchers, startup founders, product managers, investors, analysts. Currently using Feedly Pro+ or a fragmented stack of tools. They feel the friction of Feedly's paywalling, resent paying $156/year for features that should be standard, and have no good option for AI triage that respects their data.

### Secondary -- small intelligence teams

2-10 person teams doing competitive intelligence, market research, threat monitoring, or content operations. Too small for Feedly Enterprise ($18+/user/month), too sophisticated for free tools. They need shared curation with per-subscriber personalisation -- a use case no current tool serves.

### Out of scope for v1

Large enterprise security teams (Feedly's core market). Mass-market casual readers. Social media managers who don't produce original intelligence content.

## 4. Core Principles

- **Local-first, always.** All data lives on the user's machine. Cloud components (portal, sync) are opt-in and user-controlled.
- **BYOK and BYOM.** Users supply their own AI keys and, at higher tiers, their own MCP endpoints. The platform earns on the wrapper, not the inference.
- **Reversibility before automation.** The ambient AI acts silently only on reversible operations. Consequential actions always surface as proposals first.
- **Transparency as a feature.** Every AI decision -- what was surfaced, what was filtered, why -- is logged and readable in plain language. Users who understand the system improve it faster.
- **SKILL.md is the moat.** Per-feed AI behaviour is the primary competitive differentiator. Every product decision should ask: does this make SKILL.md more powerful, more accessible, or more shareable?

## 5. The SKILL.md System -- Core Moat

Every feed in the platform has a SKILL.md file. It is the AI's instruction set for that source: what to surface, what to filter, how to summarise, how to score priority, how to present in the digest, and how to write social posts. It is generated automatically from natural language instructions and maintained by the AI -- users never need to know it exists, but power users can read and edit it directly.

### What a SKILL.md contains

- **surface_criteria** -- inclusion rules with keyword signals the model uses as evidence
- **filter_criteria** -- exclusion rules: byline formats, content type flags, framing patterns
- **summarisation_style** -- format, length, what to always include, language register per source type
- **priority_scoring** -- urgency conditions: named entities, court levels, company flags, topic thresholds
- **digest_presentation** -- grouping logic, sort order, citation format for this source in digests
- **social_post_style** -- voice register, format preference, angle guidance per platform

### The natural language pipeline

User types a plain English instruction. The LLM reads the current SKILL.md as context and produces an updated version that honours both existing configuration and the new instruction. The update is applied immediately to the last 20 articles -- the user sees which articles changed status and why, in plain language, before committing. Rollback to any previous version is available. Every version is stored.

### Reasoning transparency

Every article decision is stored with a plain-language explanation. Users can audit the system over time, correct it precisely rather than broadly, and refine their instructions based on specific disagreements. The reasoning log drives better instructions which drive better SKILL.md files.

### SKILL.md marketplace

Every SKILL.md is associated with a feed domain. When a user adds a new source, the platform checks the community marketplace for existing configurations. Marketplace entries show: what the config does in plain English, usage count, last updated, and a live preview against recent articles. Users can fork and customise. Configurations are living documents -- if a feed changes its content patterns, users who have forked that config can see community updates and choose to apply them.

## 6. Content Ingestion Layer

The platform ingests all content formats as first-class sources with identical AI treatment applied via SKILL.md.

- **RSS / Atom feeds** -- standard ingestion with full-text extraction for excerpt-only sources. Full-text is non-negotiable at launch.
- **Newsletters** -- each account gets a dedicated inbound email address. Any newsletter can be subscribed to via that address and lands in the reading app alongside RSS content.
- **Podcasts** -- native support at launch. Transcript extraction enables AI triage parity with text articles. Highlights, notes, and episode-level saving supported.
- **Browser clipper** -- one-click save from any web page. Immediate AI summary and relevance score surfaced before the user navigates away. Authenticated sessions used for full-text save from paywalled pages the user already has access to. Source subscription suggestion after repeated clips from the same domain.
- **MCP sources** -- connected MCP servers can feed structured content into the ingestion layer. Internal wikis, Notion databases, proprietary data feeds treated identically to RSS sources.

## 7. Digest MCP -- Agentic Content Production

The digest is not a scheduled email. It is the output of a purpose-built agentic pipeline -- a Digest MCP server -- that plans, gathers, reasons across content, and produces publication-quality output in multiple formats.

### Agent phases

- **Planning** -- agent reads priority scores, identifies top stories by relevance and novelty, detects clusters of related coverage, builds a content plan. The plan is inspectable: users can see what the agent decided to include and why, and override before production runs.
- **Gathering** -- agent fetches full-text for each planned item. For podcasts, retrieves transcripts. Can invoke connected MCP sources to enrich coverage with private context.
- **Synthesis** -- agent writes the digest as a coherent narrative, not a list of summaries. Identifies the thread connecting top stories. For audio output, writes a full script with natural spoken transitions, host framing, and segment breaks.
- **Production** -- output formats from one synthesis run: written digest (email, Notion, Obsidian, Slack, web permalink), audio narration (TTS via BYOK voice provider, delivered as MP3 attachment), podcast episode (private RSS feed published to a URL the user adds to any podcast app, including back to this platform).

### Agentic design

Multi-step tool use across a run: get_priority_articles, fetch_full_text, query_mcp_source, get_prior_digest_context, generate_audio, publish_to_feed, send_email, post_to_slack. The agent is not a single prompt -- it is a multi-turn loop with tool calls, intermediate reasoning, and self-correction on fetch failures. Every run produces a full run log. Users can re-run failed steps, fork a run, and edit the content plan before regenerating.

### BYOM -- Bring Your Own MCP

The Digest MCP is replaceable. Users can point the platform at their own Digest MCP endpoint -- a custom agent built in any framework (LangGraph, CrewAI, Python). The platform provides structured inputs (priority article list, user preferences, prior digest context) and expects structured outputs. The platform handles reading and delivery; the agent is entirely swappable.

## 8. Social Publishing Agent

The social agent is not a scheduler. It is a closed-loop intelligence system: it publishes content derived from the platform's curated intelligence, reads back performance signals from every platform, and continuously tunes its own writing and publishing behaviour based on what actually works for this specific account and audience.

### Publishing

- Outbound to: X/Twitter, LinkedIn, Instagram, Facebook, Bluesky, Threads
- Platform-native format intelligence: threads vs single posts on X, professional register on LinkedIn, short conversational on Bluesky. Applied automatically, not by template.
- Angle selection per post: contrarian take, data-led insight, personal framing, explainer, trend observation, news commentary. The agent chooses based on topic, platform, and historical performance for this account.
- Human approval queue with agent reasoning shown: what triggered this post, what angle was chosen, why that angle for this platform.

### Analytics integration

- Platform analytics APIs: X, LinkedIn, Instagram, Facebook, TikTok -- reach, engagement, saves, shares, click-through.
- Google Analytics 4 -- web conversion attribution. Which posts drove signups, purchases, return visits. Separates vanity engagement from business outcomes.
- Unified performance model: every post tagged with source content, angle, format, time, platform, voice register, topic cluster. Performance data mapped back after 24h, 72h, 7 days.

### Closed-loop tuning

- **Format optimisation:** the agent tracks which format works for which topic type on which platform and adjusts selection as data accumulates.
- **Angle optimisation:** performance data tells the agent which rhetorical angles resonate with this specific account's audience. Weights update per-platform.
- **Timing optimisation:** posting schedule recommendations update dynamically from historical performance rather than generic best-practice defaults.
- **Source attribution:** which of the user's subscribed feeds generate content that performs well socially. High-performing sources surfaced as recommendations within the reading platform.

### Tuning interface

A weekly performance review screen shows the agent's own analysis in plain language, not charts. The agent explains what worked, what didn't, and what it proposes to change. The user confirms, overrides, or refines via a conversational interface with the agent. Strategic context the data cannot capture -- a product launch, a topic pivot -- is communicated here.

## 9. Interaction Model -- Four Layers

The product is not something users interact with. It is something that knows them. Four interaction surfaces serve different user preferences and contexts, all connected to the same intelligence core.

### Layer 1 -- Ambient AI (modern, zero interaction)

The AI observes reading behaviour across all surfaces: dwell time, scroll depth, clipboard copies, re-opens, search patterns, OS share sheet usage. It acts silently on reversible inferences (saving, tagging, adjusting SKILL.md filter weights) and proposes before acting on consequential ones (posting, sharing, subscribing). The behaviour model lives locally. No cloud inference required.

### Layer 2 -- Conversational AI (modern, natural language)

A persistent AI presence the user can address across Slack, Teams, SMS, WhatsApp, or voice. Not keyword commands -- natural language understood by the same model running the rest of the product. Full access to the intelligence core: SKILL.md files, boards, digest queue, social drafts, subscriber profiles. Works wherever the user already is. No app switching required for most intelligence tasks.

### Layer 3 -- Smart notifications (semi-modern, one-tap)

Notifications contain the summary, the relevance score, and contextually appropriate one-tap actions for that specific article. A court ruling gets 'Add to legal board'. A competitor story gets 'Add to competitive intelligence board'. Actions are surfaced by the AI based on what board the article belongs to, before the user thinks to command anything.

### Layer 4 -- Legacy email (backward compatible, AI-enhanced)

IMAP still works. But the email the platform sends is richer, and the reply the user can send is no longer limited to keywords. 'Save' still works. So does any natural language instruction -- a single reply can trigger multiple actions simultaneously. Users who live in email never need to open the app. The email is a natural language terminal to the AI, not a keyword command system.

## 10. Shared Intelligence Portal

A shareable web page -- private newsletter meets curated dashboard -- that subscribers log into. The owner curates; visitors consume in their own preferred layout and style. Not a collaboration tool. Content flows one direction.

- Owner configures which feeds, digest outputs, AI-curated boards, and manually pinned articles appear.
- Three or four opinionated layout presets: executive briefing, research dump, curated reading list, competitive intelligence snapshot.
- Visitors adjust their own display preferences (density, dark/light) without affecting the owner's curation. Content is the owner's; presentation is the visitor's.
- Copy-paste friendly by design. No friction on selecting and copying text. Clean print/export to PDF for any view.
- Subscriber profiles -- per-subscriber filter configurations. Different subscribers see different filtered views of the same curated content. Named profiles assigned per subscriber. Makes the portal dramatically more powerful for small teams and curated newsletter audiences.
- Visitor analytics -- who read what, which digest sections drove engagement, which subscriber profiles are most active.

Portal publishing is gated behind the Reader tier. Visitor seat counts and portal count scale with plan. Team tier adds custom domain support and deeper visitor analytics.

## 11. BYOK and MCP Framework

### Bring Your Own Key (BYOK)

Users can connect their own API key from any major provider: Anthropic, OpenAI, Google Gemini, Mistral, or any OpenAI-compatible endpoint (Ollama, local LLMs, Azure OpenAI). All AI feature calls -- summarisation, priority scoring, mute filters, digest generation, social post writing -- route through the user-supplied key. The platform never sees or stores article content sent to third-party models.

- Keys encrypted at rest (AES-256), never logged, never included in analytics.
- Per-feature toggle: users choose which features use their key vs the platform's rate-limited hosted tier.
- Live token usage display in account settings.
- Model capability detection on save -- warnings if the connected model is unlikely to perform well for a given feature.
- Data residency disclosure when BYOK is active. Toggle to exclude specific feeds from AI processing.

### MCP server integration

- **As a source:** MCP server feeds structured content into the ingestion layer -- internal wikis, Notion databases, proprietary scrapers -- treated identically to RSS.
- **As an action target:** MCP server receives output from the AI layer. Priority articles push to any connected MCP endpoint. Replaces Zapier for users already running MCP infrastructure.
- v1: cloud-hosted MCP servers supported. v2: self-hosted / intranet MCP via lightweight local proxy.
- BYOM (Bring Your Own MCP): the Digest MCP and Social Agent MCP are replaceable with user-supplied endpoints at Team tier and above.

## 12. Transaction API

Not a separate developer product. The platform's internal API -- the same one the UI uses -- exposed with an account-scoped token. Every platform capability is callable: fetch a feed, run a digest, query prioritised articles, trigger an agent run, post to a social channel.

Usage is metered against the subscriber's monthly transaction allowance. A transaction is a discrete platform operation. Light users never approach their limit. Heavy automation workflows consume more and can purchase top-up bundles rather than upgrading tiers for a feature they don't need.

| Plan | Monthly transactions | Top-up |
|------|---------------------|--------|
| Free | 0 (no API access) | -- |
| Reader | 5,000 | $4 per 2,500 |
| Team | 25,000 per user | $4 per 5,000 |
| Enterprise | Unlimited | Included |

## 13. Competitive Positioning

| Feature | Feedly Pro+ | RSSbrew | RSS Intelligence |
|---------|------------|---------|-----------------|
| AI summarisation | Leo (proprietary) | OpenAI API | Claude Cowork / BYOK |
| AI priority scoring | Generic topics only | None | Per-feed custom criteria |
| Per-subscriber filtering | None | None | Per-subscriber + per-feed |
| Email digests | None | None | Full SMTP with attachments |
| Audio / podcast digest | None | None | TTS via BYOK voice provider |
| Subscriber self-service | None | None | NL email interface (Layer 4) |
| Social publishing + analytics | None | None | Full closed-loop agent |
| Boolean filter rules | Mute filters only | AND/OR/NOT groups | Category + status + quarter + NL |
| Custom AI prompts per feed | None | Per-feed | Per-feed via SKILL.md + marketplace |
| Ambient behaviour AI | None | None | Silent intent inference |
| Deployment | Cloud SaaS | Self-hosted Docker | Local desktop + opt-in sync |
| Data ownership | Feedly owns it | You host it | Fully local |
| Price | $156/year | Free + API costs | Free + Claude subscription |

## 14. Pricing Model

| | Free | Reader | Team | Enterprise* |
|--|------|--------|------|-------------|
| **Price** | $0 forever | $8/mo billed annually | $14/user/mo billed annually | Custom contact us |
| **Sources** | 500 sources | 2,500 sources | 10,000 sources | Unlimited sources |
| **Features** | Unlimited feeds, Full-text extraction, No AI features, No API | SKILL.md editor, AI triage (BYOK/platform), Newsletter + podcast, Slack / email delivery, Social agent, Browser clipper, Smart notifications | Everything in Reader, Shared feeds + boards, Subscriber profiles, Portal publishing, Transaction API (25K/user/mo), SSO | Everything in Team, Custom MCP endpoints (BYOM), Dedicated support, Compliance logging, SLA guarantee |

\* Enterprise pricing by negotiation. Includes BYOM, compliance logging, SLA, and dedicated support.

### BYOK pricing logic

BYOK users on the Reader tier get effectively unlimited AI at cost -- the platform charges only for the SaaS wrapper, not the inference. This is a strong acquisition message for technical users already paying for AI subscriptions they underutilise. Platform-hosted AI is rate-limited to approximately 50 AI summaries/day for Reader tier users.

### Mobile and multi-device access

The encrypted sync layer is the solution to local desktop's single-machine constraint. All data lives locally by default. Sync is opt-in to user-controlled storage. This preserves the data ownership promise while enabling phone, tablet, and second-machine access. The portal provides subscriber-facing web access without requiring the owner to expose their local instance.

## 15. Architecture Overview

The platform is a local-first desktop application (Claude Cowork) with four optional cloud-touch components: the subscriber portal (web), the social platform integrations (outbound API calls), the SKILL.md community marketplace (shared repository), and the optional encrypted sync layer (user-controlled storage).

### Core local components

- **Ingestion engine** -- RSS, newsletter SMTP, podcast, browser extension, MCP sources
- **SKILL.md processor** -- per-feed AI behaviour applied via Claude Cowork
- **Local behaviour model** -- ambient signal accumulation and intent inference
- **Digest MCP** -- agentic production pipeline (async job queue)
- **Social Agent MCP** -- publish, read analytics, update performance model
- **Content store** -- local SQLite with encrypted full-text and SKILL.md version history

### Optional cloud components

- **Subscriber portal** -- read-only web view of owner-curated content. Stateless render from local content pushed on update.
- **Social platform API connections** -- outbound only. No social content stored in cloud.
- **SKILL.md marketplace** -- shared repository of community feed configurations. No article content, only configuration files.
- **Encrypted sync layer** -- optional, user-controlled (NAS, private S3, Backblaze B2). AES-256. Platform never has access to the sync store key.

## 16. Release Roadmap

### v1 -- Launch (months 1-3)

| Capability | Delivery | Why now |
|-----------|----------|--------|
| RSS, newsletter, podcast ingestion | Launch | Core value proposition. Full-text extraction is non-negotiable. |
| SKILL.md editor (NL interface) | Launch | The moat. Natural language -> SKILL.md with live article preview and reasoning. |
| SKILL.md marketplace (seed) | Launch | Cold-start solution. Seed with 20-30 popular feed configurations before launch. |
| Browser clipper | Launch | Acquisition channel. Someone installs the clipper, discovers the reader, converts to paid. |
| Written digest (Digest MCP v1) | Launch | Email + Slack delivery. Run logs and content plan inspection included. |
| Social agent -- publish + basic analytics | Launch | X, LinkedIn, Instagram, Facebook, Bluesky. Platform analytics ingestion. Weekly review screen. |
| GA4 integration | Launch | Conversion attribution from day one. Separates vanity from business outcomes. |
| Smart notifications (Layer 3) | Launch | Contextual one-tap actions. The notification is the interface. |
| AI-enhanced email interface (Layer 4) | Launch | IMAP-compatible, NL-understood replies. Legacy users feel immediately at home. |
| BYOK -- all major providers | Launch | Anthropic, OpenAI, Gemini, Mistral, OpenAI-compatible endpoints. |
| Local deployment + Claude Cowork | Launch | Privacy story from day one. No cloud dependency for core features. |

### v2 -- Intelligence layer (months 4-6)

| Capability | Delivery | Why now |
|-----------|----------|--------|
| Audio/podcast digest output | v2 | TTS via BYOK voice provider. MP3 attachment in digest email. Private podcast RSS feed. |
| Ambient behaviour model (Layer 1) | v2 | Silent intent inference from reading signals. Reversibility principle enforced. |
| Conversational AI layer (Layer 2) | v2 | Slack bot, Teams, SMS. Natural language across surfaces the user already inhabits. |
| Social agent -- closed-loop tuning | v2 | Format + angle + timing optimisation from accumulated performance data. Conversational tuning interface. |
| TikTok script generation + analytics | v2 | Script writing optimised for spoken format. TikTok analytics ingestion. |
| BYOM -- user-supplied Digest MCP | v2 | Custom agent endpoint support. Platform provides structured inputs/outputs contract. |
| Cloud MCP action targets | v2 | Push priority articles to any connected MCP endpoint. Replaces Zapier for MCP users. |
| Encrypted sync layer (opt-in) | v2 | Multi-device access via user-controlled storage. Privacy promise preserved. |
| Social A/B testing + auto-winner | v2 | Two post variants per article. Auto-publish winner at 4h engagement signal. |

### v3 -- Portal and team layer (months 7-9)

| Capability | Delivery | Why now |
|-----------|----------|--------|
| Shared Intelligence Portal | v3 | Subscriber-facing web view. Per-subscriber profiles and filtering UI. |
| Subscriber analytics layer | v3 | Who read what, which sections drove engagement, which profiles are most active. |
| Quarter-aware calendar view | v3 | Content plotted against business periods. Essential for quarterly reporting and board prep. |
| Team shared feeds + boards | v3 | Collaborative curation without collaborative editing. One-direction content flow. |
| SKILL.md marketplace (community) | v3 | Full community contribution model. Fork, customise, contribute back. |
| Transaction API (external) | v3 | Account-scoped token access. Metered against plan allowance. |
| SSO + team admin | v3 | SAML/OIDC. User management for team accounts. |
| Self-hosted MCP proxy (intranet) | v3 | Local proxy for intranet MCP sources and action targets. |

## 17. Success Metrics

| Goal | Metric | Target (12 months) |
|------|--------|-------------------|
| Paying users | Total active subscriptions | 10,000 |
| Retention | 90-day paid retention | >60% |
| AI engagement | Weekly SKILL.md feature usage | >70% of paid users |
| Satisfaction | NPS vs Feedly benchmark | +15 points |
| Marketplace adoption | Feeds using community SKILL.md | >30% of configured feeds |
| Social agent | Accounts with agent active | >40% of Reader tier |
| Acquisition | Clipper installs converting to paid | >15% conversion rate |

## 18. Risks and Mitigations

### AI compute margin at $8/month

Platform-hosted AI at Reader tier must be rate-limited. Start at 50 AI summaries/day. BYOK users are unlimited -- they absorb their own inference costs. Monitor cost per active user weekly and adjust limits before they become a margin problem.

### SKILL.md marketplace quality

Community configurations are only valuable if they are accurate and maintained. Seed the marketplace with 20-30 hand-curated configurations for popular feeds before launch. Add a reporting mechanism for inaccurate configs. Weight marketplace rankings by recency and community validation, not just usage count.

### Social platform API stability

Twitter/X and Reddit have both changed their APIs without warning, breaking integrations that users depended on. For v1, only support platforms with stable, well-documented APIs: X (via official API), LinkedIn, Instagram Graph API, Facebook Graph API. Bluesky (AT Protocol) is open and stable. Reddit is explicitly out of scope. Build status monitoring and clear in-app communication when a platform connection degrades.

### Local desktop limits mobility

The encrypted sync layer (v2) directly addresses this. Until then, the portal gives subscribers web access and the conversational AI layer (Layer 2, also v2) gives the owner mobile access via Slack or SMS. Frame the v1 limitation honestly: the product is desktop-first. Users who need mobile as a primary surface should wait for v2.

### Feedly response

Feedly's moat is Leo's training data and their cybersecurity vertical. They are unlikely to respond to this product in their enterprise segment. Their consumer response, if any, would be to lower Pro+ pricing or improve their free tier. The SKILL.md marketplace network effect is the primary defence: the more community configurations exist, the harder it is for a competitor to replicate the cold-start advantage.

## 19. Way Forward -- Next 90 Days

### Days 1-14: Foundation

- Define the SKILL.md file format specification completely. This is the load-bearing architecture decision everything else depends on.
- Seed 20 SKILL.md configurations for high-value feeds (Reuters, FT, SEC filings, Hacker News, arXiv). These are the marketplace foundation.
- Stand up the local ingestion engine: RSS, SMTP newsletter, and podcast transcript extraction. Validate full-text extraction against the 20 most common excerpt-only feeds.
- Implement BYOK key management: storage, encryption, provider routing, connection test on save.

### Days 15-45: The moat

- Build the SKILL.md natural language editor: NL input -> SKILL.md generation -> live article preview with reasoning. This is the product's core experience.
- Build the article reasoning log. Every decision stored with a plain-language explanation. Users must be able to audit and correct from day one.
- Build the browser clipper: save, immediate AI summary, relevance score, source suggestion. Ship to Chrome and Firefox simultaneously.
- Integrate GA4. Conversion attribution from the first social post published.

### Days 46-90: Delivery and distribution

- Ship the Digest MCP v1: written digest, email + Slack delivery, run logs, content plan inspection.
- Ship the Social Agent v1: publish to X + LinkedIn + Instagram. Platform analytics ingestion. Weekly review screen. Human approval queue with agent reasoning.
- Launch the SKILL.md marketplace with seeded configurations. Build the fork and contribute flow.
- Soft launch to a waitlist of 500 users. Focus on researchers and journalists. Collect SKILL.md feedback intensively for the first 30 days post-launch.

---

### SKILL.md moat

Per-feed AI behaviour | Local-first -- Your data, your machine | Agentic pipeline -- Digest + social intelligence

### Strategic positioning

Feedly abandoned the serious individual reader in pursuit of enterprise cybersecurity revenue. Their consumer product is a loss-leader with an increasingly hostile free tier. RSS Intelligence wins the knowledge worker segment -- researchers, analysts, journalists, founders -- who need genuine intelligence tooling without enterprise pricing.

### Why this is the moat

The SKILL.md system gets better as more users use it. Community configurations improve cold-start for new users. Power user edits contribute back to the marketplace. The more feeds that are configured, the richer the library. No competitor can replicate this network effect without rebuilding the underlying architecture.

### Technical constraint

Digest production for a full week of content with audio rendering takes minutes, not seconds. The Digest MCP must be an async job with a status webhook, a queue, and a push notification on completion. This informs the API contract for BYOM implementations.

### The single most important thing

Ship the SKILL.md editor first and iterate on it before shipping anything else at scale. If users cannot configure feeds in plain English and immediately see why articles are surfaced or filtered, the moat does not exist -- it is just a file format. Every other feature depends on this working. Get 50 real users to configure 5 feeds each in the first two weeks. Watch every session. Fix everything that confuses them.
