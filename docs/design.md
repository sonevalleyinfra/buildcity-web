# BuildCity — Design System & UI/UX Guidelines

**Design Philosophy:** Clean, Industrial-Modern, High-Contrast Mobile-First Architecture.  
Built for construction site contractors, district suppliers, and homeowners using low-cost smartphones under direct sunlight.

---

## Mobile Viewport Layout Hierarchy

```
┌────────────────────────────────────────────────────────┐
│ [Logo]       📍 Mirzapur [▼]               🛒 Cart (2) │  ◀── Sticky Top Navigation
├────────────────────────────────────────────────────────┤
│ 🔍 Search cement, TMT, bricks, sand...                │  ◀── Live Catalog Search
├────────────────────────────────────────────────────────┤
│ (🧱 Bricks)  (🏗️ TMT)  (📦 Cement)  (🪨 Sand)  (💧 Pipes)│  ◀── Category Carousel
├────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐ │
│ │  ⚡ DIRECT DISTRICT WHOLESALE SUPPLY               │ │  ◀── Compact Hero Banner
│ │  Guaranteed site delivery within 4 hours           │ │
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐      ┌──────────────────────┐ │
│ │ Ultratech Cement     │      │ Tata Tiscon 550D TMT │ │  ◀── Responsive Product Grid
│ │ ₹380 / bag           │      │ ₹68 / kg             │ │      (2-col mobile, tactile)
│ │ [+ Add to Cart]      │      │ [+ Add to Cart]      │ │
│ └──────────────────────┘      └──────────────────────┘ │
├────────────────────────────────────────────────────────┤
│   🏠 Home   │   📁 Categories   │   📦 Orders   │  👤 Account │  ◀── Sticky Bottom Bar
└────────────────────────────────────────────────────────┘
```

---

## 1. Color Palette & Brand Tokens

| Token | Hex / Class | Purpose | Usage Guideline |
| :--- | :--- | :--- | :--- |
| **Brand Primary** | `#0f172a` / `bg-navy-950` | Primary action buttons, header navigation | Core brand anchor; high contrast |
| **Brand Accent** | `#0284c7` / `text-sky-600` | Secondary links, active highlights | Interactive cues, category icons |
| **Success / Approved**| `#059669` / `bg-emerald-600`| Confirmations, delivered status, cash refund | Positive financial & operational metrics |
| **Warning / Pending** | `#d97706` / `bg-amber-500` | In-progress orders, stock warnings | Non-blocking alerts requiring attention |
| **Danger / Rejected** | `#dc2626` / `bg-rose-600` | Stock out, order cancel, delete | Destructive actions, deductions |
| **Background Neutral**| `#f8fafc` / `bg-slate-50` | Page body background | Neutral canvas preventing eye fatigue |
| **Surface Card** | `#ffffff` / `bg-white` | Content containers, product tiles | Elevated surface with border-slate-200 |

---

## 2. Typography & Hierarchy

- **Font Family:** Inter / System UI Font Stack (`font-sans`)
- **Number & Currency Rendering:** All currency amounts (`₹`) and IDs must use tabular figures (`tabular-nums`) to ensure vertical alignment across data grids and bills.
- **Hierarchy Standard:**
  - **Page Headline:** `text-lg font-bold text-slate-900 tracking-tight sm:text-xl`
  - **Section Title:** `text-sm font-semibold uppercase tracking-wider text-slate-700`
  - **Card Header:** `text-sm font-bold text-slate-900`
  - **Body Text:** `text-xs font-normal text-slate-600 sm:text-sm`
  - **Micro Label:** `text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400`

---

## 3. Tactile Feedback & Micro-Interactions

Every interactive button, pill, and card must obey tactile mobile standards:
- **Active Scale Feedback:** `active:scale-[0.98] transition-all duration-150` on all primary and secondary buttons.
- **Minimum Touch Target:** Buttons and counter controls must never be smaller than $36\text{px} \times 36\text{px}$ (preferably $44\text{px}$ on mobile).
- **Disabled State:** `disabled:opacity-45 disabled:pointer-events-none cursor-not-allowed`.
- **Loading Spinners:** Every async action button (`Place Order`, `Confirm Return`, `Save Product`) must render an inline `<Spinner className="h-4 w-4" />` with disabled state to prevent duplicate submissions.

---

## 4. Reusable Primitives (`src/pages/vendor/ui/`)

### 4.1 Card Container
```jsx
<div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm">
  {children}
</div>
```

### 4.2 Status Badges
Status pills must use semantic colors with subtle borders and 10% opacity backdrops:
- `DELIVERED` / `COMPLETED`: `bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20`
- `PENDING` / `PROCESSING`: `bg-amber-50 text-amber-700 ring-1 ring-amber-600/20`
- `CANCELLED` / `REJECTED`: `bg-rose-50 text-rose-700 ring-1 ring-rose-600/20`

### 4.3 Modal & Dialog Backdrops
- All dialog backdrops must use blurred dimming: `fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs`.
- Modal panels must have rounded-2xl corners, white background, and a dedicated close button.

### 4.4 Quantity Counter Controls (`[-] [ 2 ] [+]`)
- Clean square touch buttons (`h-8 w-8 sm:h-9 sm:w-9`) flanking an outlined numerical input.
- Input must use `outline-none focus:border-emerald-500` and `text-center tabular-nums`.

---

## 5. Anti-Slop Rules (Strict Design Guardrails)

1. **No Neon / AI Gimmicks:** Avoid intense neon purple glows, generic AI card borders, and gratuitous 3D floating illustrations.
2. **No Native `window.alert()`:** All notifications and confirmation dialogues must use the centralized `AlertContext` (`showAlert(...)`) modal.
3. **Consistent Spacing:** Use strict 4px grid rhythm (`space-y-3`, `gap-2.5`, `p-4`).
4. **No Horizontal Scroll Glitches:** Every table and data row must have responsive wrappers (`overflow-x-auto`) to prevent mobile viewports from expanding beyond 100vw.
