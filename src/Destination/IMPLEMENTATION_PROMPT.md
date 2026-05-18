# Prompt — Implement the POD Lines Feature in My Web App

> Copy everything below the `─── BEGIN PROMPT ───` line and paste it into your target AI assistant (Claude, ChatGPT, Copilot, etc.) **together with** the `README.md` from `src/POD_lines/README.md`. The README is the spec; this prompt is the instruction wrapper that tells the AI exactly how to apply it.

---

─── BEGIN PROMPT ───

You are a senior full-stack engineer. I am giving you:

1. **A specification document** named `POD_LINES_README.md` (attached/pasted alongside this message). It fully describes a "POD (Port of Discharge) Lines" feature from a freight-rate management application — its architecture, data models, API contract, algorithms, UI patterns, and step-by-step replication guide.
2. **My target project** (the codebase I'm working in right now). You must inspect it before writing code.

## Your task

Implement the **complete POD Lines feature** described in `POD_LINES_README.md` inside my current project, adapting it to my project's conventions (framework, styling system, state management, auth flow, file layout). The end result must give me **two working screens**:

- `POD Lines` — public-facing search page where any authenticated user can search a Port of Discharge, see all shipping lines that serve it, view the latest rate per line with Active/Expired status, and click through to detail screens.
- `POD Management` — admin-only CRUD page for destinations and their nested shipping lines.

## Mandatory steps (do them in order)

### Step 1 — Discover my project
Before writing any code:
- Identify the framework (React/Vue/Next/etc.), bundler, styling system (Tailwind/CSS modules/styled-components/etc.), routing library, and state-management pattern in use.
- Locate the existing auth flow: where is the JWT/session token stored, how are authenticated requests made, how is the current user/role exposed?
- Locate any existing API client / fetch wrapper / axios instance and **reuse it** instead of inlining `fetch` calls.
- Locate any existing freight-rate or "forms" data feed in the project. If one exists, reuse it; if not, flag this and ask me for the endpoint.
- Determine the project's file/folder conventions and naming style (PascalCase vs kebab-case, `.jsx` vs `.tsx`, feature folders vs type folders, etc.).

Summarize what you found in a short paragraph **before** generating code, so I can confirm or correct.

### Step 2 — Confirm the backend contract
List every endpoint from §5 of the README and tell me whether it already exists in my backend, needs to be created, or needs adapting. If endpoints are missing, **propose** the route signatures and request/response shapes that match my project's existing API style. Wait for my approval before generating backend code.

### Step 3 — Plan the file layout
Output a concrete file tree for everything you will add or modify, mapped to my project's conventions. Example:
```
src/features/pod/
  POD_Lines.tsx
  POD_Management.tsx
  shipping-lines.ts
  api.ts
  hooks/useDestinations.ts
src/routes/index.tsx        (modified)
src/api/client.ts           (modified, only if needed)
```

### Step 4 — Implement
Generate the code for each file in the plan. Requirements:

- **Match my project's language**: if my project is TypeScript, write TypeScript with proper types for `Destination`, `ShippingLine`, `FreightRate`, and component props. If JavaScript, write JS.
- **Match my project's styling system**: do not introduce Tailwind if my project doesn't use it. Re-implement the visual structure with whatever I have (CSS modules, MUI, Chakra, styled-components, plain CSS).
- **Match my project's state pattern**: if I use Redux/Zustand/Pinia/Vuex/React Query, integrate with that instead of building a fresh React Context. The README describes the contract — implement that contract on top of my existing tools.
- **Reuse my existing HTTP client and auth header injection.** Do not duplicate token reading from `localStorage` if my project has a centralized helper.
- **Implement every algorithm in §11 of the README**:
  - Fuzzy destination matching (normalize + containment + Jaccard, threshold 0.6 for rate filtering, 0.7 for general lookups).
  - Validity-date resolution from any of `validity / validity_period / valid_until / expiry_date / expires_at / validity_date`, with `created_at + 30 days` fallback.
  - Latest-rate-per-shipping-line reduce.
- **Replicate every UX behavior in §14 of the README**:
  - 300 ms debounced autocomplete capped at 8 suggestions, prefix matches first.
  - Pagination at 20 rows per page, reset to page 1 on POD change.
  - Active (green) / Expired (red) status chips.
  - Refresh button calling the cache-refresh function.
  - Click-through navigation passing `{ highlightId, highlightShippingLine, highlightPOD }` so detail screens can scroll to and flash the matched row.
  - Inline `{show, message, type}` toast pattern (no new toast library unless I already use one).
- **Implement the master shipping-lines file** (`§9`) as a plain data module exporting `getShippingLinesForPOD()`, `searchShippingLines()`, `isValidShippingLine()`. Use the full embedded list in the README.
- **POD_Management RBAC**: gate the page behind an admin check. Use my project's existing role/claim mechanism if one exists; otherwise fall back to the substring-username whitelist documented in the README, **and** explicitly tell me to enforce the same check on the backend.
- **Configuration**: read `API_BASE_URL` from an environment variable appropriate for my framework (`import.meta.env.VITE_*`, `process.env.NEXT_PUBLIC_*`, `process.env.REACT_APP_*`, etc.). Do not hard-code URLs.

### Step 5 — Wire-up
- Register both routes (`/pod_lines`, `/pod_management` — or rename to match my project's URL conventions) in my router.
- Add navigation entries to my existing top-nav / sidebar component, gating the Management entry behind the admin check.
- If my project's detail screens (View Rates / Expired Rates / equivalent) already exist, wire the click-through state correctly. If they don't, generate **stub** detail screens that read `location.state` and display the highlighted record so navigation works end-to-end.

### Step 6 — Tests & verification
- Add unit tests for the three core algorithms (fuzzy match, validity resolution, latest-rate reduce) using whatever test runner my project already uses (Jest/Vitest/etc.). If no test setup exists, skip this and tell me.
- Provide a short manual QA checklist I can run: create a destination → add shipping lines → search for the destination on POD Lines → confirm count + rows + status chips → click a row → confirm navigation + highlight.

### Step 7 — Hand-off summary
At the end, output:
- A bullet list of every file added/modified with one-line descriptions.
- A list of any **assumptions** you made about my project (so I can correct them).
- A list of any **TODOs** you left for me (e.g. "backend endpoint X does not exist yet — implement on server").
- Any `.env` keys I need to add.

## Hard rules

- **Do not** copy Freight_Pro-specific paths (`src/POD_lines/...`), brand names, the admin username whitelist `['Ravi','Harmeet','Vikram']`, or the exact backend host from the README into my project. Those are reference values only — replace with my project's equivalents.
- **Do not** introduce new dependencies if my project already has an equivalent. Confirm with me before running `npm install` for anything new.
- **Do not** silently change my project's existing routing, auth, or HTTP client. If a change is required, surface it and wait for approval.
- **Do not** generate placeholder code (`// TODO: implement`) for any of the three core algorithms — they must be fully implemented per §11.
- **Do** ask me clarifying questions if the README's contract conflicts with my project's existing conventions, instead of guessing.

## Deliverable order

Reply in this order:
1. Discovery summary (Step 1).
2. Backend gap analysis (Step 2) — wait for my approval.
3. File-layout plan (Step 3) — wait for my approval.
4. Code for each file (Step 4) in fenced code blocks, one block per file, with the path as the block's first line comment.
5. Wire-up diff/snippets (Step 5).
6. Tests + QA checklist (Step 6).
7. Hand-off summary (Step 7).

Begin with Step 1 now.

─── END PROMPT ───

---

## How to use this prompt

1. Open the target AI tool (Claude, ChatGPT, Copilot Chat, Cursor, etc.).
2. Attach or paste the contents of `src/POD_lines/README.md` first, labeled as `POD_LINES_README.md`.
3. Then paste everything between `─── BEGIN PROMPT ───` and `─── END PROMPT ───` above.
4. Make sure the AI also has access to your target project's source (open the workspace in Cursor/Copilot, or paste key files into Claude/ChatGPT).
5. Answer the AI's discovery / approval questions as they come in. Don't let it skip ahead — the gated steps exist so it doesn't generate code that conflicts with your project's conventions.

## Optional add-ons

If you want, append any of the following to the bottom of the prompt before sending:

- **"My project uses TypeScript strict mode — emit `.tsx` files with full types."**
- **"My project uses Next.js App Router — use server components where appropriate and put API helpers under `app/api/`."**
- **"My auth context exposes `useAuth()` returning `{ user, token, isAdmin }` — use it for header injection and the RBAC gate."**
- **"Skip the POD Management screen for now; only build POD Lines."**
- **"Use React Query for data fetching with a 10-minute `staleTime`."**

These narrow the AI's choices and reduce back-and-forth.
