# 🎨 TOLLGATE — Design Document (v3)
> Stitch-Ready UI Specification | Light, Clean, Manifest-Aware
> Copy each section's prompt directly into Stitch

---

## Design Philosophy

Clean, light, developer-infrastructure aesthetic. Think Stripe docs or Railway dashboard — confident, minimal, nothing decorative that doesn't serve meaning. The manifest is the star of the show: every card should make it feel like you're looking at a real contract between an agent and a service, not just a listing.

---

## Design Tokens (Paste Into Stitch First)

```
Background:         #FFFFFF
Surface:            #F9FAFB
Surface Hover:      #F3F4F6
Border:             #E5E7EB
Border Strong:      #D1D5DB

Text Primary:       #111827
Text Secondary:     #6B7280
Text Muted:         #9CA3AF

Accent Indigo:      #6366F1   (primary CTA, links, MCP badge)
Accent Indigo Dark: #4F46E5   (hover)
Accent Indigo Light:#EEF2FF   (badge backgrounds)
Accent Emerald:     #10B981   (live status, validation pass, payments)
Accent Emerald BG:  #ECFDF5
Accent Amber:       #F59E0B   (prices, per-tool costs)
Accent Amber BG:    #FFFBEB
Accent Red:         #EF4444   (validation fail, errors)
Accent Blue:        #3B82F6   (API type, secondary)

Font Sans:   "Inter", system-ui
Font Mono:   "JetBrains Mono", "Fira Code", monospace
Radius:      8px cards | 6px buttons | 4px badges
Shadow Card: 0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)
Shadow Hover:0 4px 12px rgba(0,0,0,0.09)
```

---

## Global Header

```
STICKY HEADER (height 60px, bg white, border-bottom 1px #E5E7EB, backdrop-blur):
  Left:   ⬡ Tollgate — hex SVG icon #6366F1 + "Tollgate" 17px semibold #111827
  Center: nav — "Directory" | "Register" | "Agent Demo" — 14px #6B7280, active #111827 + underline #6366F1
  Right:  "▶ Try Agent" — bg #6366F1 text white, 13px, border-radius 6px, px 14px py 7px
```

---

## Page 1: Home — Directory

### Stitch Prompt:

```
Light, clean SaaS directory page. Inter font. White background.
Sticky header: ⬡ Tollgate logo left, nav center (Directory active), "▶ Try Agent" button right.

HERO (padding: 72px 0 48px, text-center, max-width 1100px margin auto):

  EYEBROW PILL (inline-flex, bg #EEF2FF, border 1px #C7D2FE, rounded-full, px 12px py 4px):
    "MCP Marketplace · Powered by ENS" — text-xs uppercase tracking-wide text #4F46E5

  HEADLINE (text-4xl font-bold #111827, margin-top 16px):
  "The toll road for AI agents"

  SUBLINE (text-lg #6B7280, max-width 500px, margin: 12px auto):
  "Publish MCP servers under ENS names. Agents discover the manifest, pay per tool call,
  and validate the response — without API keys."

  BUTTONS (flex center gap-3, margin-top 32px):
    "Register an MCP →"  bg #6366F1 text white px-6 py-3 rounded-lg font-medium
    "How it works ↓"     bg white border #D1D5DB text #374151 px-6 py-3 rounded-lg

  STATS ROW (flex center gap-12, margin-top 44px):
    "3" bold #111827 + "MCPs live" #6B7280 text-sm
    "·"  #D1D5DB
    "0.01 USDC" amber font-mono bold + "per call" #6B7280 text-sm
    "·"  #D1D5DB
    "Base Sepolia" emerald + "testnet" #6B7280 text-sm

  ══════════════════════════════════════════════════
  HERO FLOW ILLUSTRATION (SVG, max-width 680px, margin: 48px auto, height 160px)

  Draw this as a horizontal SVG flow diagram:

  Step 1 — "🤖 Agent" circle node (r28, fill #EEF2FF, stroke #6366F1 2px)
    Label below: "AI Agent" text-xs #9CA3AF

  Arrow →  (dashed, #D1D5DB) labelled "resolve name" in text-xs #9CA3AF above

  Step 2 — "⬡ ENS" hexagon node (fill #F0FDF4, stroke #10B981 2px)
    Label: "ENS Name" text-xs #9CA3AF

  Arrow →  (dashed) labelled "fetch manifest" above

  Step 3 — "📄 Manifest" doc node (rounded rect, fill #FFFBEB, stroke #F59E0B 2px, 80x44px)
    Text inside: "{ tools }" font-mono text-xs #92400E
    Label: "Tollgate Contract" text-xs #9CA3AF

  Arrow →  (solid #6366F1 2px) labelled "pay 0.01 USDC" above
    Animated: small USDC coin circle (#10B981 fill, white text "$") slides along this arrow
    CSS animation: translateX 0→100% in 1.2s, ease-in-out, loop every 3s

  Step 4 — "{ } MCP" server node (rounded rect, fill #EEF2FF, stroke #6366F1 2px, 80x44px)
    Text: "MCP Server" font-mono text-xs #4F46E5
    Label: "get_price()" text-xs #9CA3AF

  Return arrow ← (dashed #10B981) below all nodes, left-pointing
    Labelled: "validated data ✓" text-xs #10B981 italic
    Brief flash animation on MCP node when coin arrives (bg shifts #ECFDF5 for 0.3s)
  ══════════════════════════════════════════════════

HOW IT WORKS (3 cards, padding: 56px 0):
  "How it works" text-2xl font-bold text-center #111827 margin-bottom 32px

  3 cards (bg #F9FAFB, border #E5E7EB, rounded-xl, padding 24px, gap 16px):

  Card 1 — "01" circle bg #EEF2FF text #6366F1:
    "Publish under ENS"
    "Register your MCP server as crypto.tollgate.eth. The ENS record holds a manifest URL —
    a machine-readable contract declaring your tools, schemas, and per-call prices."

  Card 2 — "02" circle bg #ECFDF5 text #10B981:
    "Agents read the contract first"
    "Before paying, agents fetch the Tollgate Manifest. They know exactly what inputs to send,
    what they'll get back, and how much each tool costs. No surprises."

  Card 3 — "03" circle bg #FFFBEB text #F59E0B:
    "Pay, get data, validate"
    "Agents pay per tool call via USDC. The MCP returns data matching the declared schema.
    The agent validates required fields before using the result. You earn per call."

DIRECTORY (padding: 0 0 64px):
  Row (flex space-between align-center margin-bottom 24px):
    "Live Services" text-xl font-semibold #111827
    Filter pills: [All] [MCP] [API] — active bg #6366F1 text white, else bg white border text #6B7280

  GRID (3 columns desktop, 2 tablet, 1 mobile, gap 16px):

  ─────────────────────────────────────────────────
  SERVICE CARD (bg white, border #E5E7EB, rounded-xl, padding 20px):
  hover: shadow 0 4px 12px rgba(0,0,0,0.08), border #C7D2FE, translateY(-1px), transition 0.15s

    TOP ROW (flex space-between):
      Type badge: "MCP" — bg #EEF2FF text #4F46E5 text-xs font-medium px-2.5 py-1 rounded-full
      Live pill: green dot 6px (pulse animation) + "Live" text-xs #10B981

    ENS NAME (margin-top 12px):
      "crypto.tollgate.eth" font-mono text-sm font-semibold #111827

    DESCRIPTION (margin-top 6px):
      2-line clamp, text-sm #6B7280

    PER-TOOL PRICING (margin-top 12px):
      Label: "Tools & prices" text-xs #9CA3AF uppercase tracking-wide margin-bottom 6px
      Tool rows (each: flex space-between, padding 6px 8px, bg #F9FAFB rounded-md, mb 2px):
        Left:  "get_price" font-mono text-xs #374151
        Right: "0.01 USDC" font-mono text-xs font-semibold #F59E0B
        [second row] "get_trending" / "0.01 USDC"
        [third row]  "get_market_data" / "0.02 USDC"
      (show max 3 tools. If more: "+ N more tools →" link #6366F1 text-xs)

    MANIFEST VIEWER TOGGLE (margin-top 12px):
      Expandable row: "📄 View Manifest Schema ↓" text-xs #6366F1, cursor pointer
      
      EXPANDED (show on click, bg #F9FAFB rounded-lg p-3 mt-2 border #E5E7EB):
        For first tool (get_price) as example:
        "get_price" bold text-xs #374151 mb-2
        
        Input:
          "Input" label text-xs #9CA3AF uppercase mb-1
          { token: string (required) }
          — monospace, text-xs #374151, each field on own row
          required fields: dot #EF4444, optional: dot #9CA3AF
        
        Output:
          "Output" label text-xs #9CA3AF uppercase mb-1 mt-2
          Each required field: green dot #10B981 + "field: type" font-mono text-xs #374151
          { token: string ✓
            price_usd: number ✓
            currency: string ✓
            source: string ✓
            timestamp: number ✓ }
        
        Bottom link: "View full manifest JSON ↗" text-xs #6366F1 → opens manifest URL in new tab
    
    BOTTOM (margin-top 16px, padding-top 12px, border-top #F3F4F6, flex space-between align-center):
      Left:  "from 0.01 USDC / call" font-mono text-sm #F59E0B font-semibold
      Right: "Connect →" text-sm #6366F1 hover:underline
  ─────────────────────────────────────────────────

BOTTOM TICKER (fixed, height 36px, bg white, border-top #E5E7EB):
  Left: "Live:" text-xs #9CA3AF 40px fixed
  Scrolling (CSS marquee animation):
  "⚡ crypto.tollgate.eth → get_price → validated ✓ → 0.01 USDC · 2s ago   ·   
   ⚡ weather.tollgate.eth → get_weather → validated ✓ → 0.01 USDC · 7s ago   ·"
  Text: font-mono 12px #6B7280, ⚡ #F59E0B, "validated ✓" #10B981
```

---

## Page 2: Register

### Stitch Prompt:

```
Clean, focused form page. Same sticky header.

PAGE HEADER (pt-48px pb-32px):
  "← Directory" text-sm #6366F1
  "Register a service" text-3xl font-bold #111827 mt-2
  "Publish your MCP server as an ENS subname. Your manifest defines the contract." text-base #6B7280 mt-2

TWO-COLUMN LAYOUT (max-width 900px margin auto, gap 48px):

LEFT: FORM (flex-1):

  TYPE TOGGLE:
    "Service type" label text-sm font-medium #374151
    Two cards side-by-side (border rounded-xl p-4 cursor-pointer):
      MCP (default active): border-2 #6366F1 bg #F5F3FF
        🔌 icon + "MCP Server" font-semibold text-sm + "Tools agents call via MCP" text-xs #6B7280
      API (inactive): border #E5E7EB bg white
        🌐 + "REST API" + "Standard endpoints" — all muted

  SUBDOMAIN:
    "ENS subdomain" label
    Inline: [input font-mono bg #F9FAFB border #E5E7EB rounded-lg px-3 py-2.5].tollgate.eth
    Helper: "Lowercase, hyphens only" text-xs #9CA3AF

  ENDPOINT URL:
    "Endpoint URL"
    Input placeholder: "https://your-mcp-server.railway.app"
    
    MANIFEST VALIDATION (shows when URL is entered, after 500ms debounce):
      Loading: "Checking manifest..." text-xs #9CA3AF + spinner
      
      SUCCESS state (bg #F0FDF4, border #D1FAE5, rounded-lg p-3):
        ✓ "Manifest found" text-sm font-medium #065F46
        "3 tools detected: get_price (0.01), get_trending (0.01), get_market_data (0.02)"
        text-xs #6B7280 mt-1
        
      ERROR state (bg #FEF2F2, border #FECACA, rounded-lg p-3):
        ✗ "No manifest found at {url}/.well-known/tollgate.json"
        "Deploy your MCP server first. See docs for manifest spec." text-xs #9CA3AF

  MANIFEST URL (auto-filled from endpoint URL):
    "Manifest URL" label
    Input: auto-populated with "{endpoint}/.well-known/tollgate.json" — editable
    Helper: "Agents fetch this to read your tool contracts" text-xs #9CA3AF

  PRICE PER CALL:
    "Default price (USDC)" — note: "(tools can override in manifest)"
    "$" prefix + number input 120px + "per call" suffix
    Placeholder: "0.01"

  PAYEE WALLET:
    "Payment wallet" label
    Input font-mono placeholder: "0x..."
    "Fill from wallet" link text-xs #6366F1 right

  DESCRIPTION + CATEGORY: (same as before)

  SUBMIT:
    "Register on ENS →" full-width h-12 bg #6366F1 text white font-semibold rounded-lg
    Loading: "Registering..."

RIGHT: MANIFEST PREVIEW (sticky, top: 80px):
  Card (border #E5E7EB rounded-xl overflow hidden):
  
  HEADER (bg #111827 px-4 py-3):
    "📄 tollgate.json" font-mono text-sm text-white
    "Auto-generated from your inputs" text-xs #9CA3AF mt-1
  
  CODE PREVIEW (bg #1E2433 px-4 py-4 font-mono text-xs leading-relaxed):
    Syntax-highlighted JSON preview that UPDATES LIVE as form fields change:
    {
      "ens": "<subdomain>.tollgate.eth",       ← #98C379 (green string)
      "payee": "<wallet address>",              ← #98C379
      "defaultPrice": "<price>",               ← #E5C07B (amber number)
      "tools": [
        {
          "name": "...",                        ← populated from manifest fetch
          "price": "...",
          "inputSchema": { ... },
          "outputSchema": { ... }
        }
      ]
    }
  
  FOOTER (bg #F9FAFB px-4 py-3, border-top #E5E7EB):
    "This file will be served at /.well-known/tollgate.json on your MCP server"
    text-xs #9CA3AF

SUCCESS STATE:
  Centered card, bg #F0FDF4 border #D1FAE5 rounded-xl p-8
  ✓ circle 48px bg #10B981 text white — centered
  "Registered!" text-xl font-bold #111827 mt-4
  "{subdomain}.tollgate.eth" font-mono bg #EEF2FF #6366F1 px-3 py-1 rounded mt-2
  "Agents can now discover your MCP, read your manifest, and pay per tool call."
  text-sm #6B7280 mt-2
  Links: "View on ENS ↗" | "Register Another" | "View Directory" — text-sm #6366F1
```

---

## Page 3: Agent Demo

### Stitch Prompt:

```
Split-panel agent interface. Same header. Background white.

PAGE HEADER (pt-48px pb-28px text-center):
  "Watch an agent use the manifest" — text-3xl font-bold #111827
  "The agent reads the contract, confirms prices, pays, and validates data — automatically."
    text-base #6B7280 mt-2

MINI FLOW DIAGRAM (max-width 560px margin auto mb-36px):
  4 steps in horizontal row + connecting arrows:
  ① "Discover"  ─→  ② "Read manifest"  ─→  ③ "Pay & call"  ─→  ④ "Validate"
  Each: circle bg #EEF2FF #6366F1 + label text-xs #6B7280 below
  Arrows: → in #D1D5DB

TASK INPUT (max-width 640px margin auto mb-28px):
  Input h-13 border-1.5 #D1D5DB rounded-xl text-base
    placeholder: "Try: 'Give me a morning briefing with top crypto and NYC weather'"
    focus: border #6366F1 ring-2 ring-#EEF2FF
  "Run Agent →" button inside right, bg #6366F1 text white px-5 py-2 rounded-lg

  PRESET PILLS (flex gap-2 mt-3, font-size xs):
    "ETH price →" | "Morning briefing →" | "Analyse Vitalik's wallet →"
    bg #F9FAFB border #E5E7EB text #6B7280 px-3 py-1.5 rounded-full cursor-pointer
    hover: bg #EEF2FF border #C7D2FE text #4F46E5

SPLIT LAYOUT (2 equal panels, gap 20px):

──────── LEFT PANEL — Agent Reasoning ────────
Card bg white border #E5E7EB rounded-xl:

  HEADER (h-11 px-4 border-bottom #F3F4F6 flex items-center justify-between):
    "Agent" font-semibold text-sm #111827
    Status chip: "● Idle" bg #F9FAFB text #9CA3AF text-xs px-2 py-0.5 rounded-full
                 "● Running" bg #ECFDF5 text #10B981 (pulsing dot)
                 "● Done" bg #EEF2FF text #6366F1

  CHAT AREA (min-h 440px overflow-y-auto p-4):
  
    EMPTY (centered p-10):
      Small toll-gate icon 36px #D1D5DB
      "Run a task above" text-sm #9CA3AF

    THINKING (stream):
      border-l-2 #D1D5DB bg #F9FAFB rounded-r-lg px-3 py-2 mb-2
      "Thinking" text-xs #9CA3AF uppercase + bouncing dots animation
      text: text-sm #6B7280 italic

    MANIFEST FETCH (special event):
      border-l-2 #F59E0B bg #FFFBEB rounded-r-lg px-3 py-2.5 mb-2
      Top: 📄 icon #F59E0B text-xs + "Reading manifest: crypto.tollgate.eth" text-xs #92400E font-mono
      Expandable below (click): show tool list with prices
        "get_price — 0.01 USDC" / "get_trending — 0.01 USDC" / etc.
        text-xs font-mono #374151, price in amber

    PRICE CHECK event:
      border-l-2 #10B981 bg #F0FDF4 rounded-r-lg px-3 py-2 mb-2
      "✓ Price confirmed: 0.01 USDC (manifest: 0.01, 402 challenge: 0.01)"
      text-xs #065F46 font-mono

    PAYMENT:
      border-l-2 #6366F1 bg #EEF2FF rounded-r-lg px-3 py-2.5 mb-2
      Row 1: ⚡ #6366F1 + "0.01 USDC paid" font-semibold text-sm #3730A3
      Row 2: "crypto.tollgate.eth → get_price" font-mono text-xs #6B7280
      Row 3: tx hash "0xabc...def ↗" text-xs #6366F1 font-mono

    VALIDATION RESULT:
      PASS: border-l-2 #10B981 bg #F0FDF4 rounded-r-lg px-3 py-2 mb-2
        "✓ Validated: all 5 required fields present" text-xs #065F46 font-mono
      
      FAIL (would show red): border-l-2 #EF4444 bg #FEF2F2 px-3 py-2 mb-2
        "✗ Validation failed: missing [price_usd, source]" text-xs #B91C1C font-mono

    RESULT (agent answer):
      bg none, label "Agent" text-xs #9CA3AF uppercase mb-1
      Text: text-sm #111827
      
      SUMMARY CHIP (mt-3 bg #F9FAFB border #E5E7EB rounded-lg px-3 py-2):
        "2 MCPs · 3 tool calls · 2/2 validated ✓ · 0.02 USDC spent · $4.98 remaining"
        text-xs font-mono #6B7280
        Note: "2/2 validated" turns red if any validation failed

  INPUT AREA (border-top #E5E7EB p-4):
    BUDGET METER (mb-3):
      "Budget" text-xs #9CA3AF + "$4.98 / $5.00" font-mono text-xs #374151 ml-auto — same row
      Progress bar h-1.5 rounded-full: track #F3F4F6, fill #6366F1, animated width
    
    Text input + "Run →" button (same style as main input above, compact)

──────── RIGHT PANEL — Activity + Manifest Details ────────
Two sub-panels stacked:

BUDGET CARD (border #E5E7EB rounded-xl p-4 mb-3):
  "Budget" text-sm font-semibold #111827
  Large budget display: "$4.97" text-2xl font-bold #111827 + "remaining" text-sm #6B7280
  Progress bar h-2 mt-2: fill #6366F1
  Row: "$0.03 spent" amber font-mono text-xs + "3 calls" #6B7280 text-xs ml-auto

ACTIVITY FEED (border #E5E7EB rounded-xl overflow-hidden flex-1):
  HEADER (h-11 px-4 border-bottom #F3F4F6 flex items-center justify-between):
    "Activity" font-semibold text-sm #111827
    "Live" pill bg #ECFDF5 text #10B981 text-xs

  FEED (overflow-y-auto max-h-320px):
  Each item (px-4 py-3 border-bottom #F9FAFB hover:bg-#F9FAFB):
    Row 1 (flex items-center gap-2):
      ⚡ 12px #F59E0B
      MCP + tool: "crypto → get_price" font-mono text-xs #374151 (truncate, flex-1)
      Amount: "0.01 USDC" font-mono text-xs font-semibold #F59E0B
      Time: "2s ago" text-xs #9CA3AF
    Row 2:
      Validation: "✓ validated" text-xs #10B981 font-mono
      OR "✗ validation failed" text-xs #EF4444 font-mono
      Tx hash: "0xabc...def ↗" text-xs #6366F1 font-mono ml-2

  EMPTY (p-8 centered):
    "No activity yet" text-sm #9CA3AF

  FOOTER (bg #F9FAFB border-top #F3F4F6 px-4 py-3):
    "KeeperHub x402 · Base Sepolia" text-xs #9CA3AF text-center
```

---

## Components Summary

| Component | Page | Key Props |
|---|---|---|
| `HeroAnimation` | Home | SVG flow, coin animation |
| `ServiceCard` | Home | ENS name, type, per-tool prices, ManifestViewer |
| `ManifestViewer` | Home | expandable schema for each tool |
| `RegisterForm` | Register | type toggle, URL → manifest validation, live preview |
| `ManifestPreview` | Register | live JSON preview that updates with form |
| `AgentDemo` | Agent | task input, reasoning display, validation events |
| `BudgetMeter` | Agent | total, spent, animated bar |
| `ActivityFeed` | Agent | payment events with validation status |

---

## Stitch Quick-Start

```
1. Open Stitch
2. First message:
   "I'm building Tollgate — an ENS-native marketplace for paid MCPs.
   Light theme, white background. Inter font. Tailwind CSS.
   Next.js 14 App Router, TypeScript. Clean, minimal, like Stripe.
   No dark backgrounds. No gradients. Border-radius 8px max.
   Key concept: each MCP has a Tollgate Manifest with per-tool pricing and schemas."

3. Paste design tokens block

4. Paste each page prompt one at a time

5. "Make ServiceCard, ManifestViewer, ActivityFeed, BudgetMeter, HeroAnimation
   reusable and export from components/index.ts"

6. Download → packages/nextjs/components/
```
