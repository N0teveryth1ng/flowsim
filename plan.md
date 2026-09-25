# FlowSim — Product & Build Plan (Source of Truth)

This document is the single plan. If anything in the codebase or an old note conflicts with this file, **this file wins**.

---

## One-line claim

**Eraser.io for engineers — same UI — plus n8n-style red highlight when the architecture won’t hold.**

---

## What we are building (locked — plain language)

We are building **exactly Eraser.io**, for **engineers / system design only**, with **one extra thing**: simulation awareness.

When you design a pipeline in n8n and something breaks, **that node goes red**. Nothing fancy. Nothing complex.  
FlowSim does the same for system design: bad numbers / bad topology → **that component goes red** + a short reason.

The canvas is compact and workflow-like: icons, names, ports, and edges belong on the diagram. Configuration belongs in a selected-component inspector, never in oversized canvas cards.

That is the entire product idea.

---

## Who it’s for

**Engineers only.** System design diagrams. Not a generic art whiteboard. Not a teaching toy. Not a game.

---

## UI — Eraser parity

The UI must feel like **Eraser.io** — same energy as their left toolbar:

| Tool | Shortcut | Notes |
|---|---|---|
| Insert / add | `/` | Insert components / icons |
| AI (optional stub) | `Ctrl+J` | Can stub later — do not block MVP |
| Select | `V` | |
| Rectangle | `R` | **Optional** — drop if useless for MVP |
| Ellipse | `O` | **Optional** — drop if useless for MVP |
| Arrow | `A` | Connect architecture |
| Line | `L` | Optional |
| Draw | `D` | Optional |
| Text | `T` | Labels |
| Insert / icon search | `I` | Search AWS, GCP, Azure, generic arch icons — **this matters** |
| Frame | `F` | Optional |
| Comment | `C` | Optional / stub |

**Shapes (squares/circles) are not sacred.** If they clutter MVP, remove them. Keep the **Eraser-looking chrome** and the **insert icon library** so it still reads as Eraser for architecture — not a 6-button toy strip.

**Do not** ship a left panel that only says Client / Server / DB / Cache / Queue / LB and call it Eraser.  
**Do** ship Eraser-like toolbar + searchable icon/component insert (`I` / `/`).

We cannot steal Eraser’s proprietary code. We **rebuild the same UX** (open canvas underneath is fine: Excalidraw/tldraw/custom — whatever gets Eraser-like UI fastest). The **skin and workflow must match Eraser**, not “Excalidraw default and hope.”

---

## Simulation — n8n only (nothing else)

### What users see when something is wrong

- That node: **red highlight**
- Small warning mark
- Short reason with real numbers  
  Example: `Incoming demand 1,000,000 req/s exceeds throughput 5,000 req/s`

### What users must NEVER see

| Banned | Why |
|---|---|
| Packet / dot animation | Theater |
| Heartbeat / pulse on nodes | Theater |
| Play / Pause / Spawn burst | Wrong product |
| HUD: In flight / Avg latency / Dropped / Completed | Wrong product |
| Abbreviations like **lat**, **rate**, **cap** | Looks cheap / gamey — **banned** |
| Auto-crash + auto-revive timers | Fake |

Healthy nodes stay quiet. Fail = red. Fix the design → red goes away. Same as n8n.

### Run analysis

The user may click **Run analysis** to make the current deterministic result explicit. It is not a time simulation and never animates packets. The result marks checked nodes with a green check, failed nodes with a red warning, and shows an issue list with exact reasons. Editing the graph invalidates the prior result until the next analysis run.

---

## Node fields (engineer labels only)

Use full words. Never `lat` / `rate` / `cap`.

| Field | On which nodes | Meaning |
|---|---|---|
| **Throughput (req/s)** | Client = demand emitted; others = max they can handle | Primary FAIL driver |
| **Latency (ms)** | Optional display on services | Secondary; not required to FAIL in MVP |
| **Queue limit (N)** | Queue (and optionally services) | Explicit bound; keep simple |
| **Hit rate (%)** | Cache only | Hit vs miss split |
| **Down** | Any sim node | Manual offline |

**FAIL rule (MVP):** incoming demand (req/s) **>** throughput (req/s) → that node goes **red**.

---

## Typed components (simulation brain)

These types participate in evaluation (can be placed via insert library / icons):

| Type | Rule |
|---|---|
| **Client** | Emits demand = Throughput |
| **Server** | FAIL if demand > Throughput |
| **Database** | Same |
| **Cache** | Hit rate splits demand; FAIL if demand > Throughput |
| **Load balancer** | Even-split demand across outputs |
| **Queue** | FAIL if sustained demand > Throughput |
| **Rate limiter** | FAIL if incoming demand > declared Throughput |

AWS / GCP / Azure icons are **for drawing real architecture**. Simulation attaches when the element is typed (or mapped) as one of the above. Untyped icons = decoration until typed.

Edges: default **fan-out** if multiple outs and not an LB; LB node **even-splits**.

---

## Evaluator (the only “engine”)

Static check on edit — not a live traffic movie:

1. Read graph  
2. Propagate demand from Clients  
3. Apply type rules  
4. Mark OK / UNUSED / DOWN / FAIL  
5. Paint FAIL as n8n red  

UNUSED = no path from Client → muted + reason.  
DOWN = manual.  
No fake heal — fix graph → clear.

---

## Honesty panel

Small: **What this checks** / **What it doesn’t**  
(demand vs throughput, reachability, cache hit rate, LB split — not retries, CAP, k8s, packet movies)

---

## What FlowSim is NOT

- Generic Miro for sticky notes  
- Packet simulator / heartbeat dashboard  
- Full distributed-systems science project  
- AI second brain (later)  
- Multiplayer / auth (later)  
- Bare “6 drag buttons” MVP that no engineer would call system design  

**MVP = functional Eraser-like product for engineers + red alerts.** Not bare minimum toys.

---

## Success bar

1. Opens looking like **Eraser for architecture** (toolbar + insert icons), not a toy or a game  
2. Engineer draws Client → Server → DB (or cloud icons typed as such)  
3. Bad throughput → **Server red** like n8n — nothing else flashy  
4. Fix numbers → red clears  
5. No lat/rate/cap, no packets, no burst HUD  
6. Honesty panel present  

---

## Decisions log (locked)

| ID | Decision |
|---|---|
| D1 | Product = Eraser.io UX for engineers + n8n red alerts |
| D2 | Engineers only — system design |
| D3 | No packet animation / heartbeat / burst / live stats HUD |
| D4 | Never use labels `lat`, `rate`, `cap` — full engineer words only |
| D5 | FAIL = demand > throughput → red + reason |
| D6 | Generic shapes (rect/ellipse) optional — can drop |
| D7 | Insert/search icons (AWS/GCP/etc.) required for “looks like Eraser” |
| D8 | Cannot steal Eraser code — rebuild same UX |
| D9 | Simulation is static evaluator, not a running movie |
| D10 | This file is source of truth |

---

## Build order

### Phase 0
Delete anything that looks like the old packet sim (pulse, HUD, spawn burst, lat/rate/cap).

### Phase 1
Eraser-like UI shell (toolbar + shortcuts + insert icon library). Canvas engine underneath can be Excalidraw/tldraw/custom — **UI must match Eraser**, not stock Excalidraw chrome if it looks wrong.

### Phase 2
Typed nodes + fields (Throughput, etc.) + pure evaluator + **n8n red only**.

### Phase 3
Honesty panel. Ship functional MVP.

---

## Non-negotiables

1. Looks like Eraser (for engineers), not a toy palette.  
2. Breaks like n8n (red node) — nothing fancy.  
3. No lat/rate/cap. No packets. No heartbeat.  
4. Keep it simple.

---

## Long-term (not now)

Deeper sim, save/share, AI, second brain — after this exists and feels right.
