# POD (Port of Discharge) Lines Module — Implementation Reference

> **Purpose of this document.** This README is a self-contained implementation specification for the **POD Lines** feature set of a freight / shipping rate-management application. It is written so that another AI assistant (or developer) can take an arbitrary project and **replicate the same POD destination + shipping-line discovery and management flows** without needing access to the original codebase.
>
> Read it top-to-bottom: it covers architecture, data model, API contract, UI behavior, algorithms (fuzzy matching, validity computation), state management, security/RBAC, and step-by-step implementation guidance with code patterns you can adapt.

---

## Table of Contents

1. [Feature Summary](#1-feature-summary)
2. [System Architecture](#2-system-architecture)
3. [Folder & File Structure](#3-folder--file-structure)
4. [Tech Stack & Dependencies](#4-tech-stack--dependencies)
5. [Backend API Contract](#5-backend-api-contract)
6. [Data Models](#6-data-models)
7. [Module 1 — POD Lines (User-Facing Search Page)](#7-module-1--pod-lines-user-facing-search-page)
8. [Module 2 — POD Management (Admin CRUD Page)](#8-module-2--pod-management-admin-crud-page)
9. [Master Shipping-Lines Data File](#9-master-shipping-lines-data-file)
10. [Global Data Layer (Cache + Cross-Module API)](#10-global-data-layer-cache--cross-module-api)
11. [Core Algorithms](#11-core-algorithms)
12. [Authentication & Authorization](#12-authentication--authorization)
13. [Routing](#13-routing)
14. [UI / UX Patterns](#14-ui--ux-patterns)
15. [Step-by-Step Replication Guide](#15-step-by-step-replication-guide)
16. [Configuration Reference](#16-configuration-reference)

---

## 1. Feature Summary

The POD module provides two complementary screens around a single domain entity — a **Destination (Port of Discharge)** that owns a list of **Shipping Lines**:

| # | Screen | Audience | Purpose |
|---|--------|----------|---------|
| 1 | **POD Lines** (`/pod_lines`) | Any authenticated user | Search a POD by name (with autocomplete + fuzzy matching), see all shipping lines that serve that POD, view the latest freight rate per shipping line with validity status, and click through to detailed rate views. |
| 2 | **POD Management** (`/pod_management`) | Admins only (whitelist) | Full CRUD over destinations and their nested shipping lines. Add, rename, delete destinations; add/bulk-add/update/remove shipping lines per destination. |

Both screens share:
- A central **DataContext** that pre-fetches destinations + freight rates and caches them for 10 minutes.
- A **master shipping-line list** (`ShippingLines_for_POD.js`) used as the canonical autocomplete source.
- A REST backend exposing destination + nested-shipping-line resources.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend (SPA)                          │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │  POD_lines   │    │ POD_Management   │    │  Other rate  │  │
│  │  (search)    │    │     (CRUD)       │    │  modules     │  │
│  └──────┬───────┘    └────────┬─────────┘    └──────┬───────┘  │
│         │                     │                     │          │
│         └──────────┬──────────┴──────────┬──────────┘          │
│                    ▼                     ▼                     │
│          ┌────────────────────┐  ┌──────────────────┐          │
│          │   DataContext      │  │ destinationAPI / │          │
│          │ (cache + fuzzy)    │  │ inline fetch fns │          │
│          └─────────┬──────────┘  └────────┬─────────┘          │
│                    └──────────┬───────────┘                    │
│                               ▼                                │
│                ┌──────────────────────────────┐                │
│                │ Auth: JWT in localStorage    │                │
│                │ Bearer token in every call   │                │
│                └──────────────┬───────────────┘                │
└───────────────────────────────┼────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend REST API                             │
│             https://<host>/api                                  │
│                                                                 │
│   /destinations            (CRUD destinations)                  │
│   /destinations/:id/shipping-lines        (nested CRUD)         │
│   /destinations/:id/shipping-lines/bulk   (bulk insert)         │
│   /forms/all                              (freight rates feed)  │
└─────────────────────────────────────────────────────────────────┘
```

**Architectural principles**
- **Read-heavy data** (destinations, freight-rate index) is fetched once globally via a React Context, cached in memory, and served instantly to all consumers. A 10-minute TTL plus a manual refresh button keep data fresh.
- **Write operations** (POD Management) hit the REST API directly, then trigger a context refresh to invalidate the cache and re-render dependent screens.
- **Fuzzy matching** is performed client-side so the same backend dataset can serve loose queries (e.g. `"jeddah"` matches `"JEDDAH PORT, SAUDI ARABIA"`).

---

## 3. Folder & File Structure

```
src/
├── POD_lines/
│   ├── POD_lines.jsx              # User search page (route: /pod_lines)
│   ├── POD_Management.jsx         # Admin CRUD page (route: /pod_management)
│   ├── ShippingLines_for_POD.js   # Master shipping-line list + helpers
│   └── README.md                  # ← this file
│
├── context/
│   └── DataContext.jsx            # Global cache + fuzzy lookups (consumed by POD_lines)
│
├── utils/
│   └── destinationAPI.js          # Reusable destination/shipping-line API helpers
│
└── components/
    └── Navbar.jsx                 # Shared top nav (rendered on both screens)
```

> If you are porting this feature into a different project, you can collapse `destinationAPI.js` into `POD_Management.jsx` (the admin page already inlines duplicate copies of every endpoint). The duplication exists because POD_Management is intentionally self-contained.

---

## 4. Tech Stack & Dependencies

| Layer | Choice | Notes |
|------|--------|------|
| Framework | **React 18+** (works on 19) | Functional components + hooks. |
| Build | **Vite** | Any bundler works; no Vite-specific code is used in the POD module. |
| Routing | **react-router-dom v6/v7** | Uses `useNavigate`, `useLocation`. |
| Styling | **Tailwind CSS** | All components are styled with utility classes. Replace with your own classes if needed — markup structure is independent of Tailwind. |
| Icons | **react-icons** | Subsets used: `lu` (Lucide), `fi` (Feather), `hi` (Heroicons), `io`, `md`. |
| HTTP | Native `fetch` | No axios required. JWT sent as `Authorization: Bearer <token>`. |
| State | **React Context API** | No Redux / Zustand. Context lives in `src/context/DataContext.jsx`. |
| Notifications | Inline toast component | A simple `{show, message, type}` state object — no library required. |

**Required `package.json` deps (minimum):**

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-router-dom": "^6.0.0",
    "react-icons": "^5.0.0"
  }
}
```

---

## 5. Backend API Contract

> Base URL is configured via a single constant: `API_BASE_URL = "https://<your-host>/api"`.
> All endpoints expect `Authorization: Bearer <jwt>` and `Content-Type: application/json`.

### 5.1 Destinations (POD)

| Method | Path | Body | Response | Purpose |
|--------|------|------|----------|---------|
| `GET`  | `/destinations` | — | `{ success, data: Destination[] }` *or* `Destination[]` | List all destinations with their nested shipping lines. |
| `GET`  | `/destinations/active` | — | `Destination[]` | List only `isActive: true` destinations (optional). |
| `GET`  | `/destinations/:id` | — | `Destination` | Fetch a single destination. |
| `POST` | `/destinations` | `{ destinationName, shippingLines? }` | `{ success, data: Destination }` | Create a new POD. `shippingLines` is optional `string[]`. |
| `PUT`  | `/destinations/:id` | `{ destinationName?, isActive? }` | `Destination` | Rename / toggle active. |
| `DELETE` | `/destinations/:id` | — | `{ success }` | Delete a POD and its nested shipping lines. |

### 5.2 Shipping Lines (nested under a destination)

| Method | Path | Body | Response | Purpose |
|--------|------|------|----------|---------|
| `POST` | `/destinations/:id/shipping-lines` | `{ lineName }` | `{ success, data: ShippingLine }` | Add a single shipping line to a POD. |
| `POST` | `/destinations/:id/shipping-lines/bulk` | `{ lineNames: string[] }` | `{ success, data: ShippingLine[] }` | Add many shipping lines in one call. |
| `PUT`  | `/destinations/:id/shipping-lines/:shippingLineId` | `{ lineName?, isActive? }` | `ShippingLine` | Update a single shipping line. |
| `DELETE` | `/destinations/:id/shipping-lines/:shippingLineId` | — | `{ success }` | Remove a shipping line from the destination. |

### 5.3 Freight Rates Feed (consumed by POD_lines)

| Method | Path | Notes |
|--------|------|------|
| `GET`  | `/forms/all` | Returns all freight-rate records used to derive "latest rate per shipping line" and "shipping-line counts per POD". The POD module does **not** write to this endpoint — it only reads. |

**FreightRate-shaped response (relevant fields):**
```ts
{
  pod: string,                    // Port of Discharge name
  shipping_lines | shipping_line: string,
  created_at | dateCreated | date: string (ISO),
  validity | validity_period | valid_until | expiry_date | expires_at | validity_date: string,
  // ... other rate fields (rate amounts, container size, etc.)
}
```

> **Field-name tolerance is deliberate.** The frontend reads any of several aliases for both shipping line and validity date. Replicate this looseness if your backend schema is similar; otherwise, normalize it on the server.

---

## 6. Data Models

### `Destination`
```ts
interface Destination {
  _id: string;                 // Mongo-style id (also accepts `id` or `destinationId`)
  destinationName: string;     // Canonical POD name, e.g. "JEDDAH PORT, SAUDI ARABIA"
  isActive?: boolean;          // Defaults to true
  shippingLines: ShippingLine[];
  createdAt?: string;
  updatedAt?: string;
}
```

### `ShippingLine`
```ts
interface ShippingLine {
  _id: string;
  lineName: string;            // e.g. "Maersk", "MSC", "CMA CGM"
  isActive?: boolean;
}
```

### `FreightRate` (read-only for this module)
```ts
interface FreightRate {
  _id: string;
  pod: string;
  shipping_lines?: string;     // OR shipping_line
  shipping_line?: string;
  created_at?: string;         // any of: created_at | dateCreated | date | createdAt
  validity?: string;           // any of the 6 validity aliases listed above
  // + rate amounts / container size / route fields used by detail screens
}
```

---

## 7. Module 1 — POD Lines (User-Facing Search Page)

**File:** `POD_lines.jsx` · **Route:** `/pod_lines`

### 7.1 Responsibilities
1. Render a hero search input with **debounced** autocomplete suggestions.
2. For each suggestion, show the **count of unique shipping lines** that serve that POD (derived from cached freight rates).
3. After selecting a POD, list every shipping line that has a rate for it, plus:
   - the **latest rate** per shipping line (newest `created_at` wins),
   - the rate's **validity date** (parsed from any of 6 aliases, or computed as `created_at + 30 days` fallback),
   - an **Active / Expired** chip computed against the current date,
   - a click-through to a detail screen (Active → `/view_rates`, Expired → `/expired_rates`) with auto-highlight.
4. Provide pagination (default **20 rows / page**) and a staggered row-fade-in animation.
5. Provide a "Refresh" button that re-pulls the global cache.

### 7.2 Component State (high level)
```js
const [selectedPOD, setSelectedPOD] = useState("");
const [searchInput, setSearchInput]   = useState("");
const [debouncedSearchInput, setDebouncedSearchInput] = useState(""); // 300ms debounce
const [shippingLines, setShippingLines] = useState([]);   // rows displayed for selected POD
const [freightRates, setFreightRates]   = useState([]);
const [hasSearched, setHasSearched]     = useState(false);
const [currentPage, setCurrentPage]     = useState(1);
const [animatingRows, setAnimatingRows] = useState(new Set());
```

### 7.3 Data Pulled from the Global Context
```js
const {
  allDestinations,                 // string[] | object[]
  getFreightRatesByPOD,            // (podName) => FreightRate[]
  getShippingLinesCountByPOD,      // (podName) => number
  isDataLoading, isInitialized,
  refreshData,                     // () => Promise<void>
} = useDataContext();
```

### 7.4 Autocomplete Algorithm
1. Wait 300 ms after typing stops (debounce).
2. Lowercase + trim the search term.
3. Build a `Map<destinationName, suggestionObject>` from both local state and context destinations (de-duplicated).
4. For each candidate, look up `getShippingLinesCountByPOD(name)` so the dropdown displays a live count.
5. Filter: `name.includes(term) && name !== term`.
6. Sort: prefix matches first, then alphabetical (`localeCompare`).
7. Slice top **8** suggestions.

### 7.5 "Latest rate per shipping line" Pipeline
On POD selection:
1. Pull `freightRates = getFreightRatesByPOD(selectedPOD)` from cache (instant).
2. Run **fuzzy matching** (see §11.1) to widen `selectedPOD` to all near-equivalent PODs in the dataset (handles `"JEDDAH"` ≈ `"JEDDAH PORT, SAUDI ARABIA"`).
3. Group rates by `shipping_lines || shipping_line || "Unknown"`.
4. For each group, keep the row with the newest `created_at` (or alias).
5. For each kept row, compute validity status (see §11.2) → `{ isActive, statusText, className }`.
6. Render rows; clicking a row navigates to:
   - `/view_rates` if active, `/expired_rates` if expired,
   - passes `state: { highlightId, highlightShippingLine, highlightPOD }` so the destination screen can scroll to + flash the matched row.

### 7.6 Pagination
- Pure client-side slice: `currentItems = shippingLines.slice((page-1)*20, page*20)`.
- Reset to page 1 whenever a new POD is selected.

---

## 8. Module 2 — POD Management (Admin CRUD Page)

**File:** `POD_Management.jsx` · **Route:** `/pod_management`

### 8.1 Responsibilities
1. **RBAC gate** on mount — only admins (whitelisted usernames) may view; others are redirected to `/pod_lines` after a toast.
2. Provide a single combined form:
   - Field 1: **POD name** (autocomplete from existing destinations + master list).
   - Field 2: **Shipping line name** (autocomplete from the master list in `ShippingLines_for_POD.js`).
3. Below the form, show all shipping lines currently attached to the typed POD with delete buttons.
4. Below that, show a **list of all destinations** with edit / delete actions, expandable to reveal nested shipping lines.
5. Every successful mutation:
   - Shows a notification (success / error).
   - Calls `refreshDestinationsData()` to re-pull `/destinations` and rebuild local lookup maps.

### 8.2 Inlined API Helpers
The component **inlines** all the destination/shipping-line endpoints rather than depending on `destinationAPI.js`. This keeps the admin screen portable. Functions defined inside the file:

```
fetchDestinations()
fetchDestinationById(destinationId)
createDestination(destinationName, shippingLines = [])
updateDestination(destinationId, updateData)
deleteDestination(destinationId)
addShippingLineToDestination(destinationId, lineName)
addBulkShippingLinesToDestination(destinationId, lineNames)
updateShippingLine(destinationId, shippingLineId, updateData)
removeShippingLineFromDestination(destinationId, shippingLineId)
```

All wrap `fetch(API_BASE_URL + path, { headers: getAuthHeaders(), … })`, parse JSON, surface text-body errors, and unwrap `result.data` if present (response-shape tolerance).

### 8.3 State Shape

```js
// Form state
const [podInput, setPodInput] = useState('');
const [shippingLineInput, setShippingLineInput] = useState('');
const [showPodSuggestions, setShowPodSuggestions] = useState(false);
const [showShippingLineSuggestions, setShowShippingLineSuggestions] = useState(false);
const [filteredPodSuggestions, setFilteredPodSuggestions] = useState([]);
const [filteredShippingLineSuggestions, setFilteredShippingLineSuggestions] = useState([]);

// Currently-selected POD context
const [currentPODShippingLines, setCurrentPODShippingLines] = useState([]);
const [currentDestinationId, setCurrentDestinationId] = useState(null);

// Master data
const [existingPODs, setExistingPODs] = useState([]);          // unique sorted POD names
const [allShippingLines, setAllShippingLines] = useState([]);  // master list
const [shippingLinesData, setShippingLinesData] = useState({}); // { [podName]: {name, id}[] }
const [destinationsData, setDestinationsData] = useState([]);   // raw API response
```

### 8.4 Mutation Flow (typical add-shipping-line example)
```
1. User types POD → autocomplete → selects existing POD (or types new)
2. User types shipping line → autocomplete from master list
3. Click "Save"
   ├── If POD exists (currentDestinationId set):
   │     await addShippingLineToDestination(id, lineName)
   └── Else:
         await createDestination(podInput, [lineName])
4. await refreshDestinationsData()
5. showNotification('Saved', 'success')
6. Clear inputs
```

### 8.5 Authorization Logic
```js
const adminNames = ['Ravi', 'Harmeet', 'Vikram'];
const name = localStorage.getItem('username') || localStorage.getItem('userEmail') || '';
const hasAccess = token && adminNames.some(a => name.toLowerCase().includes(a.toLowerCase()));
if (!hasAccess) { /* redirect */ }
```
> **Security note.** This is a **UI-level** gate only. The backend MUST enforce the same authorization on every `POST/PUT/DELETE`. Treat the whitelist as a UX convenience, not a security boundary.

---

## 9. Master Shipping-Lines Data File

**File:** `ShippingLines_for_POD.js`

A static JS module exporting the canonical universe of shipping-line names that may be associated with any POD. Used by POD_Management's autocomplete so admins cannot create arbitrary line-name typos.

### Public API
```js
import {
  getShippingLinesForPOD,   // () => string[]   — sorted, de-duplicated
  searchShippingLines,      // (term: string) => string[]
  isValidShippingLine,      // (lineName: string) => boolean
  getShippingLineStats,     // () => { total, categories: { majorLines, regionalLines } }
  MASTER_SHIPPING_LINES,    // raw const array (named export)
} from './ShippingLines_for_POD.js';

// Default export === getShippingLinesForPOD
```

### Embedded list (~55 entries)
```
Aegon Shipping, Akkon, ANL, Arkas Line, BARCO, BLPL Singapore, CARAVEL, CMA CGM,
Cordelia Cruises, COSCO, CU Lines, Econ Line, Emirates Shipping, Evergreen,
FESCO LINE, GALEON, Goodrich Maritime, Hapag-Lloyd, HMM, Hub & Link, HYUNDAI,
INOX, KMTC, LEO GLOBAL, Maersk, Majestic Line, Maxicon Shipping Agencies, MSC,
NAVIO, NAVIS, Novel Lines, ONE, OOCL, PIL, RCL LINE, Samsara Group, SCI,
SeaLead Shipping, Seahorse Ship Agencies Pvt Ltd, Sinokor Merchant, Trans Asia,
Transafe Global Limited, Transworld Group, TS Lines, Turkon Line, UAFL,
Unifeeder, UNITED LINER, Wan Hai, WINOCEAN Maritime Pvt. Ltd., WINWIN Lines,
Yang Ming, Z LINE, ZIM
```
Customize this list freely — it is plain data.

---

## 10. Global Data Layer (Cache + Cross-Module API)

**File:** `src/context/DataContext.jsx`

The POD search screen relies on a global context that fetches **all destinations** and **all freight rates** once and exposes derived selectors.

### Required exports from `useDataContext()`
| Property | Type | Description |
|---------|------|------|
| `allDestinations` | `Array<string \| {destinationName, name?, destination?, isActive?}>` | Master destination list (mixed shape supported). |
| `getFreightRatesByPOD(podName)` | `(string) => FreightRate[]` | Returns cached rates filtered by POD (uses fuzzy match internally). |
| `getShippingLinesCountByPOD(podName)` | `(string) => number` | Distinct count of shipping lines that have any rate for the POD. |
| `isDataLoading` | `boolean` | True while initial fetch is in flight. |
| `isInitialized` | `boolean` | True once both endpoints (`/destinations`, `/forms/all`) have resolved. |
| `error` | `string \| null` | Last fetch error message. |
| `refreshData()` | `() => Promise<void>` | Force-refresh both feeds and bust the cache. |
| `totalRates` | `number` | Convenience total (used in headers / counters). |

### Caching strategy
- TTL **10 minutes** (`CACHE_DURATION = 10 * 60 * 1000`).
- Retry on network failure with exponential backoff (3 attempts).
- Lazy initialization on first `Provider` mount.
- Manual refresh bypasses TTL.

> If you don't have an equivalent context in your target project, the simplest replacement is a custom hook (`useDestinations`) that fetches `/destinations` + `/forms/all` once on mount and memoizes the selectors above.

---

## 11. Core Algorithms

### 11.1 Fuzzy Destination Matching

Used to make `"jeddah"` match `"JEDDAH PORT, SAUDI ARABIA"` and similar near-duplicates.

```js
// 1. Normalize: lowercase, trim, strip country/region suffixes,
//    strip "port of"/"harbor of" prefixes, collapse punctuation.
const normalizeDestination = (d) => d
  .toLowerCase().trim()
  .replace(/,?\s*(saudi arabia|uae|india|china|germany|netherlands|belgium|italy|...|port|harbor|harbour)$/i, '')
  .replace(/^(port of|port|harbor of|harbour of)\s+/i, '')
  .replace(/[,.\-_()\[\]]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// 2. Similarity = exact-after-normalize ? 1.0
//                 : substring containment ? 0.9
//                 : Jaccard over word sets (words length > 2)
const calculateSimilarity = (a, b) => {
  const A = normalizeDestination(a), B = normalizeDestination(b);
  if (A === B) return 1.0;
  if (A.includes(B) || B.includes(A)) return 0.9;
  const w1 = new Set(A.split(' ').filter(w => w.length > 2));
  const w2 = new Set(B.split(' ').filter(w => w.length > 2));
  const inter = [...w1].filter(x => w2.has(x)).length;
  const union = new Set([...w1, ...w2]).size;
  return union ? inter / union : 0;
};

// 3. findSimilarDestinations(query, list, threshold = 0.7) → sorted matches.
//    POD_lines uses threshold 0.6 when widening filter sets.
```

The **suffix-strip regex** must be tailored to the country tokens that appear in your destination dataset. The reference implementation strips: `saudi arabia, argentina, australia, uae, bangladesh, angola, united arab emirates, cameron, china, india, germany, netherlands, belgium, italy, indonesia, ecuador, mexico, colombia, egypt, vietnam, sri lanka, russia, us, israel, france, uk, oman, united kingdom, usa, united states, peru, japan, uruguay, algeria, harbour, harbor, port, NY`.

### 11.2 Validity Date Resolution & Active/Expired Status

```js
const VALIDITY_FIELDS = ['validity','validity_period','valid_until','expiry_date','expires_at','validity_date'];
const CREATED_FIELDS  = ['created_at','dateCreated','date','createdAt'];

const getValidityDate = (rate) => {
  for (const f of VALIDITY_FIELDS) {
    if (rate[f] && typeof rate[f] !== 'boolean') {
      const d = new Date(rate[f]);
      if (!isNaN(d)) return d;
    }
  }
  // Fallback: created_at + 30 days
  for (const f of CREATED_FIELDS) {
    if (rate[f]) {
      const c = new Date(rate[f]);
      if (!isNaN(c)) return new Date(c.getTime() + 30*24*60*60*1000);
    }
  }
  return null;
};

const getRateValidityStatus = (rate) => {
  const v = getValidityDate(rate);
  if (!v) return { isActive: false, statusText: 'No Validity', className: 'text-gray-400' };
  const today = new Date(); today.setHours(0,0,0,0);
  v.setHours(0,0,0,0);
  return v >= today
    ? { isActive: true,  statusText: 'Active',  className: 'text-green-600' }
    : { isActive: false, statusText: 'Expired', className: 'text-red-600'   };
};

const formatDateDDMMYYYY = (d) =>
  d ? `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` : 'N/A';
```

### 11.3 Latest-rate-per-shipping-line Reduce

```js
const latest = {};
for (const rate of podFilteredRates) {
  const line = rate.shipping_lines || rate.shipping_line || 'Unknown';
  const created = new Date(rate.created_at || rate.dateCreated || rate.date || Date.now());
  const prev = latest[line];
  if (!prev || created > new Date(prev.created_at || prev.dateCreated || prev.date)) {
    latest[line] = { ...rate, created_at: rate.created_at || rate.dateCreated || rate.date, shipping_line: line };
  }
}
return Object.values(latest);
```

---

## 12. Authentication & Authorization

- **Token storage:** `localStorage.getItem('token')` (JWT issued by the auth/login flow).
- **Header injection:** every request uses
  ```js
  { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  ```
- **Username for RBAC:** read from `localStorage.getItem('username')` (or fall back to `userEmail`).
- **Admin whitelist (UI-only):** `['Ravi', 'Harmeet', 'Vikram']` — substring match, case-insensitive. Replace with your role/claim system; **always re-check on the server**.
- **Unauthorized navigation:** show toast + `setTimeout(() => navigate('/pod_lines'), 2000)`.

---

## 13. Routing

Add these routes to your top-level router (e.g. `App.jsx`):

```jsx
import POD_lines      from './POD_lines/POD_lines';
import POD_Management from './POD_lines/POD_Management';

<Routes>
  <Route path="/pod_lines"      element={<POD_lines />} />
  <Route path="/pod_management" element={<POD_Management />} />
  {/* … your other routes … */}
</Routes>
```

The POD_lines page uses `useNavigate()` to redirect to detail screens with state:
```js
navigate('/view_rates', {
  state: { highlightId: rate._id, highlightShippingLine: rate.shipping_line, highlightPOD: selectedPOD }
});
```
Wire your detail screens to read `useLocation().state` and scroll-to / flash the matched row.

---

## 14. UI / UX Patterns

| Pattern | Implementation |
|--------|---------------|
| **Hero search bar** with floating icon | Tailwind `relative` wrapper + absolutely-positioned `FiSearch` icon. Large rounded input, focus ring. |
| **Autocomplete dropdown** | Conditional `<ul>` rendered when `showSuggestions && filteredSuggestions.length`. Each `<li>` shows the destination name + small shipping-line count badge. Click selects + closes. |
| **Debounce** | `setTimeout` inside a `useEffect` watching `searchInput`, cleaned up on re-run. **300 ms** delay. |
| **Staggered row animation** | After selecting a POD, push row index into `animatingRows` Set with `setTimeout(..., index*100)`. CSS class fades + translates from `opacity-0 translate-y-2` to fully visible. |
| **Status chips** | Two variants (Active = green, Expired = red, plus muted "No Validity"). |
| **Pagination** | Prev/Next buttons + numbered pills. Default 20 rows/page. |
| **Refresh button** | Calls `refreshData()` from context; spinner via `isLoading || isRefreshing`. |
| **Inline notifications** | `{show, message, type: 'success'\|'error'\|'info'}` state object, auto-hide after ~3s with a `setTimeout`. |
| **Modals (POD_Management)** | Plain divs with fixed inset overlay; not from any modal lib. |

---

## 15. Step-by-Step Replication Guide

Use this checklist when porting the POD module to a new project.

### Step 1 — Backend
1. Create the `Destination` resource (see §6) with nested `shippingLines: ShippingLine[]`.
2. Implement the 6 destination endpoints (§5.1) and 4 nested shipping-line endpoints (§5.2). Enforce admin-role authorization on every write endpoint.
3. Ensure your existing freight-rate feed (or equivalent) is reachable at a single endpoint and returns at least: `pod`, a shipping-line field, a created-at field, and (optionally) a validity field. The frontend will tolerate name aliases.

### Step 2 — Frontend scaffold
1. Install `react`, `react-dom`, `react-router-dom`, `react-icons` (or your icon set).
2. Create folder `src/POD_lines/` and the four files in §3.
3. Set `API_BASE_URL` in **two** places: `POD_Management.jsx` and `src/utils/destinationAPI.js` (or a shared `config.js`).
4. Implement `getAuthHeaders()` reading your JWT from wherever it lives.

### Step 3 — Data layer
1. Build a `DataContext` (or a plain `useDestinations()` hook) exposing the contract in §10.
2. Implement the **fuzzy match** helpers (§11.1) inside the context so `getFreightRatesByPOD` and `getShippingLinesCountByPOD` are tolerant of name variations.

### Step 4 — Master shipping lines
1. Copy `ShippingLines_for_POD.js` verbatim, then edit `SHIPPING_LINES` to fit your domain.

### Step 5 — POD Management page
1. Inline all 9 API helper functions from §8.2.
2. Build the combined form (POD name + shipping line) with two parallel autocompletes.
3. On save, branch on `currentDestinationId` (existing → `addShippingLineToDestination`; missing → `createDestination`).
4. After every mutation call `refreshDestinationsData()`.
5. Wrap mount in the admin-whitelist gate (§12).

### Step 6 — POD Lines page
1. Subscribe to the data context.
2. Implement the autocomplete suggestions block (§7.4).
3. On selection, run the `filterAndSortFreightRates` pipeline (§7.5 + §11.3) and the validity computation (§11.2).
4. Render a paginated table with status chips and click-through navigation.
5. Add a **Refresh** button calling `refreshData()`.

### Step 7 — Wire-up
1. Register the two routes (§13).
2. Add navigation entries in your top nav (e.g. "POD Lines" for everyone, "POD Management" gated by admin claim).
3. Verify end-to-end: create a destination + shipping line via Management, then search for it on POD Lines.

### Step 8 — Hardening
- Server-side validation of `destinationName` uniqueness.
- Server-side admin enforcement on every write.
- Rate-limit the bulk shipping-line endpoint.
- Log + monitor unauthorized 401/403s.

---

## 16. Configuration Reference

### Constants you will likely need to change
| Constant | File | Default | Purpose |
|---------|------|---------|---------|
| `API_BASE_URL` | `POD_Management.jsx`, `utils/destinationAPI.js`, `DataContext.jsx` | `https://olive-ferret-249197.hostingersite.com/api` | Backend root. |
| `CACHE_DURATION` | `DataContext.jsx` | `10 * 60 * 1000` (10 min) | TTL for the global cache. |
| `itemsPerPage` | `POD_lines.jsx` | `20` | Table page size. |
| Debounce delay | `POD_lines.jsx` | `300 ms` | Search input idle time before filtering. |
| Suggestion cap | `POD_lines.jsx` | `8` | Max items in autocomplete dropdown. |
| Default validity fallback | `POD_lines.jsx` | `30 days` after `created_at` | Used when no validity field is present. |
| Fuzzy threshold | `POD_lines.jsx` | `0.6` (rate filter) / `0.7` (general) | Jaccard similarity cutoff. |
| Admin whitelist | `POD_Management.jsx` | `['Ravi','Harmeet','Vikram']` | UI-level RBAC. |

### Environment variables (recommended for portability)
Replace hard-coded `API_BASE_URL` strings with one of:
```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;     // Vite
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;    // CRA
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;  // Next.js
```

---

## Appendix A — Minimal Reference Snippet (drop-in starter)

```jsx
// useDestinations.js — minimal stand-in for the full DataContext
import { useEffect, useMemo, useState, useCallback } from 'react';

const API = import.meta.env.VITE_API_BASE_URL;
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export function useDestinations() {
  const [destinations, setDestinations] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([
        fetch(`${API}/destinations`, { headers: headers() }).then(r => r.json()),
        fetch(`${API}/forms/all`,    { headers: headers() }).then(r => r.json()),
      ]);
      setDestinations(d.data ?? d);
      setRates(r.data ?? r);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const getRatesByPOD  = useCallback((pod) =>
    rates.filter(rt => rt.pod?.toLowerCase() === pod?.toLowerCase()), [rates]);

  const getLineCountByPOD = useCallback((pod) => {
    const set = new Set();
    rates.forEach(rt => {
      if (rt.pod?.toLowerCase() === pod?.toLowerCase()) {
        set.add(rt.shipping_lines || rt.shipping_line);
      }
    });
    return set.size;
  }, [rates]);

  return { destinations, rates, loading, refresh, getRatesByPOD, getLineCountByPOD };
}
```

---

**End of specification.** Hand this document to another AI/developer along with a target codebase and they should be able to fully reconstruct the POD Lines feature surface.
