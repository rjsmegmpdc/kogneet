# Kogneet

AI-native content intelligence platform. Local-first, SKILL.md-powered feed triage, agentic digest pipeline, and closed-loop social publishing.

## Vision

A research colleague who knows your interests, watches what you pay attention to, synthesises it into the formats you need, publishes it to the audiences you choose, and learns continuously from what works — all running locally on your machine, with your AI keys, without your data leaving your control.

## Core Differentiators

- **SKILL.md system** — per-feed AI behaviour files generated from natural language instructions, versioned, shareable via community marketplace
- **Multi-format ingestion** — RSS, newsletters (SMTP inbound), podcasts, browser clipper, MCP sources
- **Agentic digest pipeline** — planning, gathering, synthesis, production across written, audio, and podcast formats
- **Closed-loop social agent** — publishes to X/LinkedIn/Instagram/Facebook/Bluesky/Threads with analytics-driven self-tuning
- **Four-layer interaction** — ambient AI, conversational AI (Slack/Teams/SMS), smart notifications, legacy email
- **BYOK + BYOM** — bring your own AI keys and MCP endpoints

## Architecture

Local-first Electron desktop app with optional cloud-touch components:

| Component | Description |
|-----------|-------------|
| Ingestion engine | RSS, newsletter SMTP, podcast, browser extension, MCP sources |
| SKILL.md processor | Per-feed AI behaviour via Claude Cowork |
| Digest MCP | Agentic production pipeline (async job queue) |
| Social Agent MCP | Publish, read analytics, update performance model |
| Content store | Local SQLite with encrypted full-text and SKILL.md version history |
| Subscriber portal | Read-only web view of owner-curated content (optional) |
| SKILL.md marketplace | Community feed configurations (optional) |
| Encrypted sync | User-controlled storage — NAS, S3, Backblaze B2 (optional) |

## Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 33+ |
| Bundler | electron-vite (Vite 6) |
| Frontend | React 19, TypeScript, Tailwind CSS 4, Zustand |
| Backend | Node.js (main process) |
| Database | SQLite (better-sqlite3) |
| AI | BYOK multi-provider (Anthropic, OpenAI, Gemini, Mistral, Ollama) |
| RSS | rss-parser |
| Email (outbound) | nodemailer (SMTP) |
| Email (inbound) | imapflow (IMAP) |
| Scheduling | node-cron |
| Enrichment | Claude Cowork + SKILL.md |

## Status

Early development. Evolving from [RSS Intelligence v1](https://github.com/rjsmegmpdc/RSSIntelligence).

## License

Proprietary. All rights reserved.

## Current Position

Snapshot: 2026-05-21

- Branch: `main`, **19 dirty files**
- Last commit: 2026-04-12 — *Phase 4: Settings panel with 7 tabs including AI Keys*
- Modified: `src/main/index.ts`, `ipc-handlers.ts`, `preload/index.ts`, `renderer/App.tsx`
- Untracked services: `email-scheduler.ts`, `email-sender.ts`, `feed-fetcher.ts`, `reasoning-logger.ts`, `scheduler.ts`, `skill-editor.ts`, `skill-manager.ts`, `skill-processor.ts`
- State: Phase 5+ in flight — agentic pipeline services not yet committed
- Next: checkpoint commit so the v0.4 baseline stops drifting from reality
