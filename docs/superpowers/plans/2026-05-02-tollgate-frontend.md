# Tollgate Next.js Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Tollgate Next.js 14 frontend from scratch, translating 3 Stitch HTML prototypes into a fully responsive, props-driven TypeScript app with a CORS-safe manifest proxy.

**Architecture:** Next.js 14 App Router with a global layout (Header + Footer + LiveTicker), 3 page routes (`/`, `/register`, `/agent`), and 11 reusable components. All manifest fetches from the browser route through `/api/manifest/fetch?url=` to bypass CORS. Stub data drives all UI — no live contract calls.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS 3, Inter + JetBrains Mono (Google Fonts).

**CORS Fix:** The `/api/manifest/fetch/route.ts` proxy is the trust boundary. No component may call an external URL directly from the browser. RegisterForm and ServiceCard both proxy through `/api/manifest/fetch`.

---

## File Map

```
packages/nextjs/
├── package.json                         @se-2/nextjs workspace package
├── tsconfig.json                        ~~ path alias → ./
├── next.config.ts                       minimal config
├── postcss.config.mjs
├── tailwind.config.ts                   design tokens from DESIGN.md
├── .env.example
├── types/
│   └── index.ts                         Service, ToolEntry, ActivityEntry, AgentEvent
├── app/
│   ├── globals.css                      @tailwind directives + font vars
│   ├── layout.tsx                       root layout: Header + Footer + LiveTicker
│   ├── page.tsx                         / → Home/Directory
│   ├── register/page.tsx                /register
│   ├── agent/page.tsx                   /agent
│   └── api/
│       ├── manifest/fetch/route.ts      CORS PROXY — server-side manifest fetch
│       ├── ens/register/route.ts        stub
│       ├── ens/resolve/route.ts         stub
│       ├── ens/list/route.ts            stub
│       ├── agent/run/route.ts           stub
│       └── activity/route.ts            stub
└── components/
    ├── GlobalHeader.tsx                 sticky header, SVG logo, active nav
    ├── Footer.tsx
    ├── LiveTicker.tsx                   CSS marquee bottom bar
    ├── HeroAnimation.tsx                SVG flow diagram + coin animation
    ├── ServiceCard.tsx                  ENS card: type badge, tool rows, manifest toggle
    ├── ManifestViewer.tsx               expandable schema viewer (client)
    ├── RegisterForm.tsx                 two-column form with live validation (client)
    ├── ManifestPreview.tsx              live JSON code preview
    ├── BudgetMeter.tsx                  progress bar + spend display
    ├── ActivityFeed.tsx                 payment event rows
    ├── AgentDemo.tsx                    split-panel agent interface (client)
    └── index.ts                         barrel exports
```

---

## Task 1 — Project Scaffold

**Files:** Create `packages/nextjs/package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind.config.ts`, `.env.example`

- [ ] Create `packages/nextjs/package.json`
- [ ] Create `packages/nextjs/tsconfig.json`
- [ ] Create `packages/nextjs/next.config.ts`
- [ ] Create `packages/nextjs/postcss.config.mjs`
- [ ] Create `packages/nextjs/tailwind.config.ts`
- [ ] Create `packages/nextjs/.env.example`
- [ ] Run `yarn install` from repo root to link workspace
- [ ] Verify: `yarn next:build` exits with no module-resolution errors

---

## Task 2 — Types + Global CSS

**Files:** `types/index.ts`, `app/globals.css`

- [ ] Create `types/index.ts` with `Service`, `ToolEntry`, `ActivityEntry`, `AgentEvent`
- [ ] Create `app/globals.css` with `@tailwind` directives

---

## Task 3 — Layout Components

**Files:** `components/GlobalHeader.tsx`, `components/Footer.tsx`, `components/LiveTicker.tsx`, `app/layout.tsx`

- [ ] Write `GlobalHeader` — sticky 60px, SVG logo, active-nav underline, "▶ Try Agent" CTA
- [ ] Write `Footer` — copyright + 4 links
- [ ] Write `LiveTicker` — CSS marquee fixed 36px bottom bar
- [ ] Write `app/layout.tsx` — wraps children with Header + Footer + LiveTicker

---

## Task 4 — Home Page Components

**Files:** `components/HeroAnimation.tsx`, `components/ServiceCard.tsx`, `components/ManifestViewer.tsx`, `app/page.tsx`

- [ ] Write `HeroAnimation` — 4-node SVG flow with coin animation
- [ ] Write `ManifestViewer` — expandable tool schema (client toggle)
- [ ] Write `ServiceCard` — ENS name, type badge, live dot, tool rows, ManifestViewer, bottom CTA
- [ ] Write `app/page.tsx` — hero + how-it-works + directory grid with stub service data

---

## Task 5 — Register Page

**Files:** `components/RegisterForm.tsx`, `components/ManifestPreview.tsx`, `app/register/page.tsx`

- [ ] Write `ManifestPreview` — syntax-highlighted JSON panel, updates with form state
- [ ] Write `RegisterForm` — type toggle, ENS input, URL input with 500ms debounced validation via `/api/manifest/fetch`, manifest URL auto-fill, price + payee, submit button, success state
- [ ] Write `app/register/page.tsx` — back link + two-column layout

---

## Task 6 — Agent Demo Page

**Files:** `components/BudgetMeter.tsx`, `components/ActivityFeed.tsx`, `components/AgentDemo.tsx`, `app/agent/page.tsx`

- [ ] Write `BudgetMeter` — progress bar + $X.XX remaining display
- [ ] Write `ActivityFeed` — payment event list with validation status
- [ ] Write `AgentDemo` — split panel: left (reasoning stream) + right (budget card + activity feed)
- [ ] Write `app/agent/page.tsx` — header + mini flow diagram + task input + AgentDemo split layout

---

## Task 7 — API Routes

**Files:** `app/api/manifest/fetch/route.ts` (real), 5 stub routes

- [ ] Write `/api/manifest/fetch/route.ts` — GET `?url=`, server-side fetch, return JSON (CORS bypass)
- [ ] Write `/api/ens/register/route.ts` — POST stub → 501
- [ ] Write `/api/ens/resolve/route.ts` — GET stub → 501
- [ ] Write `/api/ens/list/route.ts` — GET stub → 501
- [ ] Write `/api/agent/run/route.ts` — POST stub → 501
- [ ] Write `/api/activity/route.ts` — GET stub → 501

---

## Task 8 — Barrel Exports + Build

**Files:** `components/index.ts`

- [ ] Write `components/index.ts` — export all components
- [ ] Run `yarn next:build` — must exit 0
- [ ] Run instructions: `yarn install && yarn start` (or `yarn workspace @se-2/nextjs dev`)
