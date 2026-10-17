# BuildCity: Design Language & UI Principles (Rebuild Reference)

> Scope: visual design, UX patterns, components and screens of the current React 19 + Vite + Tailwind v4 app, extracted so the TypeScript Next.js (App Router) rebuild keeps the same look and feel.
> Business rules (pricing, region matching, order lifecycle, wallet, coupons, roles) are covered in `docs/rebuild/idea.md`. This file only mentions them where they affect UI.
> Every reference uses `path:line` against commit `ef00035`.

---

## 0. TL;DR for the rebuild team

- **Two visual dialects share one brand.**
  - **Storefront / customer, admin, DR.** Dense, "Flipkart/Blinkit-style" commerce UI: heavy weights (`font-black`/`font-extrabold`), tiny type (`text-[9px]`–`text-[11px]`), lots of tinted pills, emoji icons, `rounded-xl`/`rounded-2xl` white cards on `#F8FAFC`.
  - **Vendor "Partner" app** (`src/pages/vendor/**`). A newer, deliberate design system: Lucide-style stroke icons, `font-medium`/`font-semibold`, 44px tap targets, sheets, a motion system that respects reduced-motion, and status colours as one table.
  - **Recommendation:** rebuild every surface on the **vendor dialect's primitives**, keeping the storefront's layouts, colours and density cues. That is "faithful look and feel" without the debt.
- **Brand colours.**
  - Orange: Tailwind `orange` scale, `#EA580C` primary.
  - Deep navy: `#07132B` / `#0A192F` / `#0A1A3A` / `#0D224D`. These are mostly hard-coded hex, not tokens.
  - Slate neutrals.
  - Coral `#FF5533` for "pending / needs you".
  - Emerald for savings, success and "live".
- **Typeface.** Inter (Google Fonts CSS link, weights 400–800). The UI uses `font-black` (900) 242 times, so 900 is browser-synthesised. Load 900 or remap.
- **Currency.** Always `₹` plus `toLocaleString("en-IN")` (Indian grouping 1,23,456). Dates and times are IST (`Asia/Kolkata`, `en-IN`).
- **No dark mode.** Light-only app; dark surfaces are "hero" panels only.
- **Mobile first, then Capacitor.**
  - Customer shell: sticky top header + 5-tab bottom nav (`lg:hidden`); desktop gets a top navbar.
  - Vendor shell: top bar + 4-tab bottom nav on phones; 256px sidebar on `md+`.

---

## 1. Brand

### 1.1 Name & wordmark

- **Name.** "BuildCity". Split-colour wordmark **Build** (navy `text-navy-900` / white on dark) + **City** (`text-brand-500` #EA580C). See `src/components/Logo.jsx:39-42`, `src/components/SplashScreen.jsx:33,68`.
- **Spelling drift.** "Build City" (with space) still appears in `src/layouts/AuthLayout.jsx:24,49` ("With Build City", "© Build City") and in the Profile link "About Build City" (`src/pages/customer/Profile.jsx:20`). Standardise on **BuildCity**.
- **Subtitle under the wordmark.** "BUILDING MATERIALS". Uppercase, `tracking-widest`, `font-bold`, `text-slate-400` (light: `text-slate-300`). Hidden on `size="sm"` below `sm` (`Logo.jsx:44-48`).
- **Partner app name.** "BuildCity Partner" (Android flavor `partner`, `android/app/build.gradle:36`). The splash shows "BuildCity" plus an uppercase "PARTNER" label at `tracking-[0.2em]` (`SplashScreen.jsx:32-35`). The sidebar shows a "Partner" chip: `bg-brand-50 text-brand-700 ring-brand-600/15`, `text-[11px] uppercase` (`VendorShell.jsx:35`).
- **Taglines in use.**
  - "India's Building Material Superstore" (customer splash, `SplashScreen.jsx:73`).
  - "Construction Materials Direct to Site" (`index.html:12`).
  - "India's Leading B2B & B2C Construction & Building Materials Platform" (`src/data/legalPolicies.js:6`, used in the Footer).
  - "Build Better, With Build City" (auth side panel, `AuthLayout.jsx:23-25`).

### 1.2 Logo / icon

| Asset | Use | Notes |
|---|---|---|
| `public/buildcity-roof-logo.png` (512²) | The only logo used in UI (`Logo.jsx:30`, splash, favicon 192, apple-touch, og:image) | Transparent PNG. Two stroked chevrons ("roof"): a front stroke in `#EA580C`, a back stroke in light peach (~`#F6B48E`). Round caps. |
| `public/buildcity-purana-logo.svg/.png` | Unused ("purana" = old). Pure SVG version of the roof in `#EA580C`, stroke-width 3.2 on a 32 grid | Use this SVG as the source for a vector `<LogoMark/>`. |
| `public/favicon.svg` | PNG embedded as base64 inside an SVG | Replace with a real vector. |
| `public/favicon.ico`, `favicon.png` | Browser icons | Keep. |
| `public/icons.svg` | Unused Vite leftover | Drop. |
| `src/assets/hero.png`, `react.svg`, `vite.svg` | Unused | Drop. |
| Android `ic_launcher*` (mipmaps) | Adaptive icon: background `@color/ic_launcher_background` = `#FFFFFF` (`android/app/src/main/res/values/ic_launcher_background.xml`) + roof foreground | `drawable/ic_launcher_background.xml` is still the Capacitor default teal `#26A69A` grid (unused by the adaptive icon, but confusing). |
| Android `splash.png` (all densities) | Navy `#0A0F1A`-ish full-bleed with a **white square** containing the roof | Visible white box on navy; see debt §7. |
| Android `ic_stat_order.xml` | White house glyph for push notifications | Keep. |

**Logo sizes** (`Logo.jsx:6-22`):

| size | badge (mark box) | title | subtitle |
|---|---|---|---|
| `sm` | `w-7 h-7` → `sm:w-8 sm:h-8` | `text-base font-black tracking-tight` | `text-[8.5px] font-bold` (hidden < sm) |
| `md` | `w-9 h-9` → `sm:w-10` | `text-xl font-black` | `text-[10px]` |
| `lg` | `w-12 h-12` → `sm:w-14` | `text-2xl sm:text-3xl font-black` | `text-xs` |

- Props: `variant="dark"|"light"` (light = white text for navy backgrounds), `iconOnly`, `hideSubtitle`.
- Hover: `group-hover:scale-105` on the mark.

### 1.3 Tone of voice

- **Storefront.** Enthusiastic, trust-heavy, Indian-commerce register.
  - Title Case Labels ("Proceed to Checkout →", "Track Live Order Status", "Browse Catalog & Order Now").
  - Lots of "100%", "Certified", "Genuine", "Site Delivery", "District".
  - Arrows `→` appended to CTAs.
  - Emoji as icons (📍 🛒 🚚 🔑 📦 💵 🎁 🏷️).
  - Frequent **Hinglish** in empty states and comments: "Hum jald hi {cat} ke certified products … launch kar rahe hain" (`Categories.jsx:427`); "Is filter ke sath koi product nahi mila" (`CategoryListing.jsx:229`); "Try "cement" … ya koi aur product" (`SearchResults.jsx:118`). Testimonials are Hinglish.
- **Vendor app.** Calm, terse, sentence case, no emoji.
  - Examples: "Orders", "Add product", "Submit for review", "Goes live after your district team approves it.", "Respond quickly so customers can plan their site work", "New orders will show up here."
  - This is the better voice to standardise on for system UI. Keep the storefront's energy only in marketing blocks.
- **Domain vocabulary to keep.** "Site" (construction site), "District", "Region", "Partner", "Vendor", "Bulk Rates / Pack Sizes", "Collect" (cash to collect), "Dispatched", "Cash on Delivery (Pay on Site Arrival)".

### 1.4 Imagery

- **Category art** (`public/categories/*`). Product cut-outs on white or transparent: cement bags + powder, paint, steel, rebars, crushed stone, tiles, plumbing.
  - Displayed as **circular crops** inside white discs (`rounded-full object-cover`) on pastel tiles (Home) or slate discs (Categories).
  - Mixed formats: `plumbing.png` and `tiles.png` are actually JPEGs; `paints.jpg` duplicates `paints.png`. Normalise to WebP/AVIF in `/public/categories`.
  - **Fallback image everywhere:** `/categories/cement.png` (`onError`), and an Unsplash cement photo `photo-1589939705384-5185137a7f0f` as the default product image (ProductCard, ProductImageSlider, OrderDetail, SearchResults, CategoryListing, Home).
- **Category tile pastel backgrounds** (`Home.jsx:16-59`):

  | Category | Tile background |
  |---|---|
  | Paints | `#FDEAE8` |
  | Steel | `#F0F4F8` |
  | Cement | `#F8FAFC` |
  | Rebars | `#F1F5F9` |
  | Crushed Stone | `#F5F3EF` |
  | Tiles | `#EFF6FF` |
  | Plumbing | `#ECFEFF` |

- **Hero banners.** Admin-managed (`banners` from AdminContext). Defaults are 2 Cloudinary images + 1 Unsplash (`Home.jsx:177-199`). Aspect `5/2`.
- **Brand "logo" discs for Top Brands.** Asian Paints, Somany, Johnson, Cera, Kajaria, UltraTech, Tata Tiscon are **drawn with text and CSS imitating third-party trademarks** (`Home.jsx:61-175`), with brand hexes `#9333EA`, `#DC2626`, `#034EA2`, `#F59E0B`, `#0284C7`, `#0369A1`, `#FBBF24`.
  - **Do not carry this over.** Use licensed logo files or plain text chips.
- **Testimonials.** Hard-coded `DEMO_REVIEWS` with names, roles, "Delivered in 3.5 Hours", and a "⭐ 4.7 / 5.0" pill (`src/components/SiteReviewsSection.jsx:3-60`, `Home.jsx:701-703`).
  - These are fabricated social proof. In the rebuild, show only real reviews or remove the section.
- **Unused images:** `public/images/hero_trust_banner.jpg`, `varanasi_delivery_banner.jpg`.
- **Play Store assets** (`play_store_assets/`):
  - Navy `#0F172A`→`#1E293B` feature graphic with the orange roof, an orange "OFFICIAL VENDOR APP" tag, and an orange top hairline.
  - Screenshots are **mock-ups that do not match the shipped UI**: "Rs." instead of ₹, "READY TO DISPATCH"/"APPROVED" statuses, an all-caps orange CTA. Regenerate from the real app after the rebuild.
- **Vendor "blueprint" motif.** A 22px white grid at 5% opacity, masked to fade in from the right, over the navy hero (`src/pages/vendor/vendor.css:12-20`). This is the most distinctive brand texture: "construction blueprint". Promote it to a shared brand pattern.
- **Brand hairline.** A 2–3px gradient strip `#C2410C → #F97316 → #FBBF24` ("orange-to-amber of the roof mark", `vendor.css:22-24`). Used on top of the vendor sidebar, mobile top bar, sheets, hero bottoms and the toast countdown.

### 1.5 Was the vendored design tooling used?

- `.claude/skills/ui-ux-pro-max` and `skills-lock.json` list taste and design skills (`design-taste-frontend`, `minimalist-ui`, `high-end-visual-design`, `redesign-existing-projects`, `industrial-brutalist-ui`, …, from `Leonxlnx/taste-skill`).
- The vendor app's comments ("one stroke family (Lucide geometry…)", "each fact once, whitespace instead of dividers", "calm, purposeful motion") strongly suggest it was redesigned with these skills. The storefront was not.

---

## 2. Design tokens

### 2.1 Declared tokens (`src/index.css:3-33`, Tailwind v4 `@theme`)

| Token | Hex | Notes |
|---|---|---|
| `--font-sans` | `"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | |
| `--color-navy-950` | `#0F172A` | **= Tailwind slate-900**. Names are shifted one step: navy-950 = slate-900. |
| `--color-navy-900` | `#1E293B` | = slate-800 (369 uses; the default "ink" for headings) |
| `--color-navy-800` | `#334155` | = slate-700 |
| `--color-navy-700` | `#475569` | = slate-600 |
| `--color-brand-700` | `#9A3412` | = orange-800 |
| `--color-brand-600` | `#C2410C` | = orange-700. **Accessible orange** (5.18:1 on white) |
| `--color-brand-500` | `#EA580C` | = orange-600. **Primary brand orange** (3.56:1 on white; fails AA for small text) |
| `--color-brand-400` | `#F97316` | = orange-500 (also `<meta name="theme-color">`, `index.html:10`) |
| `--color-brand-300` | `#FDBA74` | |
| `--color-brand-200` | `#FED7AA` | |
| `--color-brand-100` | `#FFEDD5` | |
| `--color-brand-50` | `#FFF7ED` | |
| `--color-coral-50` | `#FFF4F1` | Pending-order wash |
| `--color-coral-100` | `#FFE4DD` | |
| `--color-coral-200` | `#FFC9BC` | |
| `--color-coral-300` | `#FF9C87` | |
| `--color-coral-500` | `#FF5533` | "Needs you" (dots, lines) |
| `--color-coral-600` | `#E8461F` | |
| `--color-coral-700` | `#D23A1B` | Small coral text (4.81:1) |
| `--color-success` | `#16A34A` | Used once (`text-success`, Checkout) |
| `--color-warning` | `#F59E0B` | Never used |
| `--color-surface` | `#F8FAFC` | Page background (= slate-50) |

**Shades referenced but not defined** (they generate no CSS in v4, so those elements render without the colour):

- `brand-800` (`VendorShell.jsx:63` active nav text, 2 uses)
- `brand-900` (admin, 1 use)
- `navy-400` (`Profile.jsx` stat card hover border, 1 use)

### 2.2 Undeclared brand colours (hard-coded hex)

| Hex | Role | Where |
|---|---|---|
| `#07132B` | Deepest navy: hero/footer base | `vendor.css:6,9` (`.vd-hero`), `Footer.jsx:23` (`bg-[#07132B]`), `FirstTimeLocationModal.jsx:112`, `Home.jsx:779`, `LegalPolicyPage.jsx:45` |
| `#0A192F` | **App navy / StatusBar** | `capacitor.config.json` StatusBar, Android `colorPrimary`/`colorPrimaryDark`, partner splash `bg-[#0A192F]` (`SplashScreen.jsx:27`), dark CTA `bg-[#0A192F]` (Home login pill, location modal confirm, ErrorBoundary), FloatingCartBar gradient start |
| `#0A1A3A` | Navy mid (gradient) | `.vd-hero` 55% stop, modal header, exclusive-deals banner |
| `#0D224D` | Navy light (gradient end / dark-button hover) | `.vd-hero` 100% stop, `Button` dark hover `hover:bg-[#0d224d]` (`primitives.jsx:50`) |
| `#0B1E40` | One-off navy | 1 use |
| `#C2410C` / `#9A3412` | Typed as hex instead of `brand-600/700` | "See all" links `text-[#c2410c] hover:text-[#9a3412]` ×6 (Home, Categories) |
| `#0284C7` (sky-600) | **Secondary "selection" blue** in the storefront | Selected region row and radio, selected category tile, "All" disc, "Current" chip (`FirstTimeLocationModal.jsx:201-233`, `Categories.jsx:326-370`), call FAB |
| `#1E5FD9` | Checkbox/radio `accent-[#1E5FD9]` | `FilterSidebar.jsx:44,68`, Checkout payment radio. An off-palette blue. |
| `#2563EB`, `#3B82F6`, `#1D4ED8`, `#EFF6FF`, `#DBEAFE` | "Site Visit" service card | `Home.jsx:720-741` |
| `#38BDF8`, `#0F172A`, `#1E293B` | "Web Development" card | `Home.jsx:748-772` |
| `#25D366` / `#20bd5a` | WhatsApp FAB | `Home.jsx:820` |
| `#128C7E` / `#075E54` | WhatsApp share button | `Profile.jsx:362` |
| `#0369A1` | Call FAB hover, profile avatar gradient end | |
| `#EA580C` | Android `brand_accent` | `android/.../values/colors.xml` |
| `#F1F5F9`, `#CBD5E1`, `#94A3B8` | Custom scrollbar | `index.css:85-102` |

### 2.3 Semantic palette (as actually used; counts are class occurrences)

| Role | Classes / hex | Usage |
|---|---|---|
| **Primary action** | `bg-brand-500 hover:bg-brand-600 text-white` (74× `bg-brand-500`); checkout/confirm uses `bg-brand-600 hover:bg-brand-700`; vendor primary is a gradient `from-brand-500 to-brand-600` + inset highlight | Add to cart, Buy Now, Proceed to Checkout, Submit |
| **Dark action** | `bg-navy-950`/`bg-navy-900`/`bg-[#0A192F]` + white; hover often flips to `bg-brand-600` | Coupon "Apply", "Track Order", Location "Confirm & Explore", active tab/chip |
| **Link / accent text** | `text-brand-600` (163 brand-600 uses), `text-[#c2410c]` | "See all", "Mark all read", "Change" |
| **Ink (text)** | `text-navy-950` #0F172A (headings, prices), `text-navy-900` #1E293B (body headings), `text-slate-600/700` body, `text-slate-500` secondary, `text-slate-400` tertiary (186 uses, 2.56:1) | |
| **Surface** | page `bg-[#F8FAFC]`/`bg-surface`/`bg-slate-50`; cards `bg-white`; inset `bg-slate-50`/`bg-slate-100/70` | |
| **Border** | `border-slate-200` / `border-slate-200/80`/`/90` (the dominant hairline), dividers `divide-slate-100`/`border-slate-100` | |
| **Success / savings / live** | emerald: `bg-emerald-50 text-emerald-700 border-emerald-200`; solid `bg-emerald-600` for rating badge, "UNLOCKED", Register "Verify" button | "Save ₹X", "(18% off)", "N Live", coupon applied, free delivery unlocked, "In Stock" dot |
| **Warning / attention** | amber: `bg-amber-50 text-amber-800 border-amber-200`, solid `bg-amber-500` count pill, `bg-amber-400` (vendor "new order" bell) | Region mismatch, "Not Deliverable", listings pending, wallet |
| **Error / destructive** | rose (203×) and red (36×) mixed: `bg-rose-50 text-rose-700 border-rose-200`; logout `text-red-600 bg-red-50 border-red-200`; confirm dialog `bg-rose-600` | "Unavailable", remove, logout, cancel order |
| **Info / selection** | sky `#0284C7` family, blue | Selected region/category, free-delivery progress container `from-sky-50/90 to-blue-50/60` |
| **Promo / coupon** | purple: `text-purple-700 bg-purple-50 border-purple-200` | Coupon tag on order cards |
| **Discount badge** | solid `bg-brand-600 text-white` "18% OFF" pill on images; inline `text-emerald-600` "(18% off)" | Two colours for the same fact; see debt |

### 2.4 Order-status colours

Three different maps exist. The **vendor map is canonical**.

**Vendor:** `src/pages/vendor/ui/format.js:7-58`. One colour per status, used by badge, dot, accent bar, select, tile wash and halo.

| Status | Label | Dot / accent | Badge (`tone`) | Tile wash | Text |
|---|---|---|---|---|---|
| `PENDING` | Pending | `coral-500` #FF5533 | `bg-coral-50 text-coral-700 ring-coral-500/25` | `from-coral-50/70 to-white to-45% border-coral-300/70` | `text-coral-700` |
| `PROCESSING` | Processing | `sky-500` | `bg-sky-50 text-sky-700 ring-sky-600/20` | `from-sky-50/60 … border-sky-300/70` | `text-sky-800` |
| `OUT_FOR_DELIVERY` | Out for delivery | `indigo-500` | `bg-indigo-50 text-indigo-700 ring-indigo-600/20` | `from-indigo-50/60 … border-indigo-300/70` | `text-indigo-800` |
| `DELIVERED` | Delivered | `emerald-500` | `bg-emerald-50 text-emerald-700 ring-emerald-600/20` (+ check icon) | `from-emerald-50/60 … border-emerald-300/60` | `text-emerald-800` |
| `CANCELLED` | Cancelled | dot `rose-400`, accent `rose-300` | `bg-rose-50 text-rose-600 ring-rose-600/15` (+ x icon) | `from-slate-50/60 … border-slate-300/80` | `text-rose-700` |

**Customer Orders list:** `src/pages/customer/Orders.jsx:15-79`.

- **PENDING is amber** (`bg-amber-50 text-amber-800`, accent `amber-500`), not coral.
- It also maps `CONFIRMED` to sky and `SHIPPED` to indigo.
- `pulse: true` animates the dot for Pending, Processing, Shipped and OFD.

**Customer Order detail:** `src/pages/customer/OrderDetail.jsx:8-58`. Coral for PENDING (matches vendor); delivered accent `emerald-600`.

**Admin and DR:** `AdminDashboard.jsx:38`, `DrDashboard.jsx:28`. Amber for PENDING, as plain class strings.

**Approval badges** (vendor `primitives.jsx:22-46`):

| Approval state | Classes |
|---|---|
| In review | `bg-amber-50 text-amber-800 ring-amber-600/20` + clock |
| Rejected | `bg-rose-50 text-rose-700` + x |
| Live | `bg-emerald-50 text-emerald-700` + check |

**Order progress steps:**

- Vendor labels: Placed → Processing → Dispatched → Delivered (`ProgressTrack.jsx:3`).
- Customer labels: Pending → Processing → Out for Delivery → Delivered (`OrderDetail.jsx:60-65`).

### 2.5 Gradients

| Name | Definition | Where |
|---|---|---|
| **Navy hero** (`.vd-hero`) | `background-color:#07132b; background-image: radial-gradient(120% 140% at 100% 0%, rgba(234,88,12,.24) 0%, rgba(234,88,12,0) 48%), linear-gradient(100deg, #07132b 0%, #0a1a3a 55%, #0d224d 100%)` | `vendor.css:5-10`: vendor overview hero, account hero, catalogue sheet header, new-order toast |
| Navy banner (Tailwind) | `bg-gradient-to-r from-[#07132B] via-[#0A1A3A] to-[#0D224D]` | Location modal header, Home "Exclusive Deals" |
| Navy slate banner | `from-navy-950 via-navy-900 to-slate-900` | Admin shortcuts card, DR district banner, Wallet settings |
| Customer splash | `bg-gradient-to-b from-slate-950 via-slate-900 to-navy-950` + `bg-brand-500/15 blur-3xl` glow | `SplashScreen.jsx:42-47` |
| **Brand hairline** | `linear-gradient(90deg, #c2410c 0%, #f97316 55%, #fbbf24 100%)` | `vendor.css:22-24` |
| Floating cart bar | `from-[#0A192F] via-navy-900 to-brand-600` | `FloatingCartBar.jsx:47` |
| Primary CTA (cart) | `from-brand-500 to-brand-600` → hover `from-brand-600 to-brand-700` | `Cart.jsx` checkout buttons |
| Vendor primary button | `bg-gradient-to-b from-brand-500 to-brand-600` + `shadow-[0_1px_2px_rgba(154,52,18,0.25),inset_0_1px_0_rgba(255,255,255,0.14)]` | `primitives.jsx:49` |
| Avatar / today bar | `from-brand-500 to-amber-500` (avatar), `from-brand-600 to-amber-400` (today's bar), `from-brand-500 to-amber-400` (in-flight bar) | Vendor |
| Status tile washes | `bg-gradient-to-b from-{status}-50/60 to-white to-45%` | Vendor order cards |
| Free-delivery tracker | locked: `from-sky-50/90 to-blue-50/60 border-sky-200`; unlocked: `from-emerald-50 to-teal-50/50 border-emerald-200` | Cart, Checkout |
| Unread notification | `bg-gradient-to-r from-brand-50/60 to-white` | `NotificationPanel.jsx:188` |
| Wallet redemption | `from-amber-50 to-orange-50 border-amber-200/90` | `Checkout.jsx:814` |
| Customer profile header | `from-sky-50/80 via-white to-blue-50/60`; avatar `from-[#0284C7] to-[#0369A1]` | `Profile.jsx:184-186` |
| Toast top bar | `from-sky-400 via-brand-500 to-rose-500 animate-pulse` | `NotificationContext.jsx:439` |
| Admin KPI top edges | `from-brand-500 to-brand-600`, `from-emerald-500 to-teal-500`, `from-amber-400 to-orange-500`, `from-blue-500 to-indigo-600`, `from-purple-500 to-pink-500` | `AdminDashboard.jsx` overview |

### 2.6 Typography

- **Family and loading.** Inter via a Google Fonts `<link>` (`index.html:19-21`), `wght@400;500;600;700;800`, `display=swap`. `-webkit-font-smoothing: antialiased` (`index.css:63`).
- **Weight 900 is not loaded**, yet `font-black` is used 242×. Distribution:

  | Class | Uses |
  |---|---|
  | `font-bold` | 592 |
  | `font-black` | 242 |
  | `font-semibold` | 160 |
  | `font-medium` | 159 |
  | `font-extrabold` | 154 |
  | `font-normal` | 7 |

- **Default body colour:** `#0F172A` (`index.css:62`).
- **Size scale actually used.**
  - Tailwind steps `text-xs` (12), `text-sm` (14), `text-base` (16), `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`.
  - Plus arbitrary micro sizes:

    | Class | Uses |
    |---|---|
    | `text-[11px]` | 206 |
    | `text-[10px]` | 159 |
    | `text-[9px]` | 30 |
    | `text-[9.5px]` | 18 |
    | `text-[10.5px]` | 12 |
    | `text-[8px]` | 7 |
    | `text-[8.5px]` | 5 |
    | `text-[13px]` | 4 |
    | `text-[4.5px]`–`text-[7.5px]` | fake brand logos |
    | `text-[15px]` | vendor top-bar shop name |
    | `text-[32px]` | vendor hero `md` |

- **Storefront hierarchy.**

  | Element | Classes |
  |---|---|
  | Page title (mobile header) | `text-base font-extrabold tracking-tight text-navy-900` |
  | Page H1 | `text-xl sm:text-2xl font-black tracking-tight` |
  | Section H3 | `text-base sm:text-lg font-black/extrabold text-navy-950 tracking-tight` |
  | Card title | `text-xs sm:text-sm font-black` |
  | Eyebrow | `text-[10px]–text-xs font-extrabold uppercase tracking-wider text-slate-400/500` |
  | Price | `text-sm sm:text-base font-black tabular-nums` (card); `text-2xl font-black` (PDP); `text-xl font-black` (sticky bar) |
  | Body | `text-xs`/`text-[11px] font-medium text-slate-500/600` |

- **Vendor hierarchy.**

  | Element | Classes |
  |---|---|
  | Page title | `text-xl md:text-2xl font-semibold tracking-tight text-slate-900` (`primitives.jsx:90`) |
  | Section title | `text-sm font-semibold` + 1×14px colour bar (`primitives.jsx:101`) |
  | Body | `text-sm` |
  | Meta | `text-xs text-slate-500` |
  | Hero H1 | `text-2xl md:text-[32px] font-semibold tracking-[-0.02em] [text-wrap:balance]` |
  | KPI | `text-xl md:text-2xl font-semibold tabular-nums` |

  Form inputs use `text-base sm:text-sm` so iOS does not zoom.
- **Numbers.** `tabular-nums` on prices, counts and countdowns. IDs are `font-mono` (order ID `#ORD-*ZXFK`, coupon codes, referral code `tracking-widest`).
- **Letter-spacing.** `tracking-tight` on almost every heading; `tracking-wider`/`tracking-widest` on uppercase eyebrows; OTP input `tracking-[0.5em]` (login) / `tracking-[0.3em]` (register).

### 2.7 Spacing & layout widths

- **Gutters.** `px-4` mobile, `sm:px-6`, `lg:px-8` (footer). Vendor: `px-4 sm:px-6 lg:px-8`.
- **Content max widths:**

  | Width | Used by |
  |---|---|
  | `max-w-6xl` | storefront pages, navbar |
  | `max-w-7xl` | footer, admin, DR |
  | `max-w-5xl` | vendor main |
  | `max-w-4xl` | Checkout, Orders |
  | `max-w-2xl` | Profile, OrderDetail, Addresses |
  | `max-w-lg` | bottom nav, empty cart |
  | `max-w-[420px]` | auth form |

- **Vertical rhythm.** Home `space-y-3.5 sm:space-y-5`; sections `space-y-1.5 sm:space-y-2.5`; cards `p-3`–`p-5` (`p-3.5`, `p-4.5` common); grids `gap-2 sm:gap-3 lg:gap-4`.
- **Bottom padding to clear fixed bars:** `pb-20`/`pb-24`/`pb-28`/`pb-40` (cart: nav + sticky checkout bar); vendor `pb-28 md:pb-12`.

### 2.8 Radii

| Class | Uses | Role |
|---|---|---|
| `rounded-xl` (12px) | 391 | Default: buttons, inputs, small cards, chips in tab bars |
| `rounded-full` | 209 | Pills, badges, avatars, dots, FABs, category discs |
| `rounded-2xl` (16px) | 126 | Cards, product tiles, banners, sheets |
| `rounded-lg` (8px) | 128 | Small buttons, qty stepper inner buttons, tags |
| `rounded-md` / `rounded` | 43 / 53 | Micro tags ("Save ₹X", unit chip) |
| `rounded-3xl` (24px) | 14 | Modals (location, success, coupons, passbook), `sm:` hero banner, auth splash card |

Rule of thumb: **12px controls, 16px cards, 24px modals, full pills**.

### 2.9 Shadows & elevation

- Tailwind steps used:

  | Class | Uses |
  |---|---|
  | `shadow-xs` | 141 |
  | `shadow-2xs` | 134 |
  | `shadow-md` | 45 |
  | `shadow-2xl` | 22 (modals) |
  | `shadow-lg` | 7 |

- **Signature soft navy shadows** (arbitrary values), worth tokenising:

  | Token idea | Value | Source |
  |---|---|---|
  | card-rest | `0 2px 8px -2px rgba(15,23,42,0.05)` | ProductCard |
  | card-hover (brand glow) | `0 8px 24px -4px rgba(234,88,12,0.12)` | ProductCard hover |
  | panel | `0 1px 3px rgba(15,23,42,0.04), 0 8px 20px -8px rgba(15,23,42,0.06)` | OrderDetail cards |
  | tile | `0 1px 2px rgba(15,23,42,0.06), 0 10px 28px -14px rgba(15,23,42,0.24)` → hover `0 2px 4px …, 0 18px 40px -16px rgba(15,23,42,0.3)` | Vendor OrderCard |
  | header-scrolled | `0 4px 20px -4px rgba(15,23,42,0.06)` | Navbar |
  | bottom-bar | `0 -8px 30px rgba(15,23,42,0.08)` | BottomNav |
  | sheet | `0 32px 64px -16px rgba(15,23,42,0.35)` | Vendor Sheet |
  | toast | `0 24px 48px -16px rgba(7,19,43,0.55)` | Vendor toast |
  | hero | `0 18px 40px -24px rgba(7,19,43,0.6)` | Vendor overview hero |
  | primary-btn | `0 6px 16px -6px rgba(194,65,12,0.55), inset 0 1px 0 rgba(255,255,255,0.14)` | Sidebar "Add product" |
  | chip-active | `0 4px 12px -4px rgba(7,19,43,0.45)` | Vendor Chip |
  | floating-cart | `0 8px 30px rgba(0,0,0,0.25)` | FloatingCartBar |

### 2.10 Borders

- Default hairline `border border-slate-200` with opacity variants `/60 /80 /90` (inconsistent).
- Vendor prefers `ring-1 ring-inset ring-slate-200` on interactive surfaces.
- Status edge: an absolute **left accent bar** `w-1`/`w-1.5` in the status colour on order tiles (`Orders.jsx:224`, `OrderDetail.jsx:126`, `OrderCard.jsx:182`).
- Top accent edge `h-0.5`/`h-1` on KPI cards (vendor `Stat`, admin KPIs).
- Dashed `border-dashed border-slate-300` for empty states (Search, CategoryListing, Addresses) and bill separators.

### 2.11 Z-index (observed)

| z | Element |
|---|---|
| `z-10` | Overlays inside cards (badges, slider arrows `z-20`) |
| `z-20` | Footer (relative), slider controls |
| `z-30` | Sticky headers (Navbar, mobile headers, vendor sidebar/top bar, admin header) |
| `z-40` | FloatingCartBar, WhatsApp/Call FABs, Cart sticky checkout bar, vendor bottom nav |
| `z-50` | Customer BottomNav (**above** the z-40 cart bar), most modals and sheets, vendor toast |
| `z-[999]` | NotificationPanel portal |
| `z-[1000]` | FirstTimeLocationModal |
| `z-[9999]` | In-app notification toast |
| `z-[99999]` | SplashScreen, Alert/Confirm dialog |

### 2.12 Breakpoints

- Tailwind defaults: `sm` 640, `md` 768, `lg` 1024. Usage counts: `sm:` 435, `md:` 53, `lg:` 59. No custom breakpoints.
- **Storefront switches shell at `lg`.** Below 1024px: mobile header + bottom nav. At `lg` and up: desktop Navbar with nav links.
- **Vendor switches at `md`.** Bottom tabs below 768px, sidebar at `md` and up. Sheets become centred dialogs at `sm`.

### 2.13 Dark / light

- **Light only.** No `dark:` variants (the single grep hit is a variant *named* `dark`), no `prefers-color-scheme`.
- Android theme parent `Theme.AppCompat.DayNight.NoActionBar` (`styles.xml`) could tint system UI in dark mode. StatusBar is forced dark navy `#0A192F` with `style: "DARK"` (light icons), `overlaysWebView: false` (`capacitor.config.json`).
- "Dark" exists only as hero, footer, splash and toast surfaces.

### 2.14 Motion

**Global** (`src/index.css`):

| Name | Spec | Use |
|---|---|---|
| `splash-pulse` / `.animate-splash-logo` | 2.2s `cubic-bezier(0.4,0,0.6,1)` infinite; scale 1→1.06 + orange drop-shadow 20→45px (`index.css:105-114,128-130`) | Customer splash logo |
| `splash-beam` / `.animate-splash-beam` | 1.6s translateX ±100% | Defined, unused |
| `delivery-beam` / `.animate-delivery-beam` | 1.7s | Defined, unused |
| `modal-pop` / `.animate-modal-pop` | 0.22s `cubic-bezier(0.16,1,0.3,1)`, scale .92→1 + fade (`index.css:151-164`) | Profile modals |
| `.vendor-fade` | 180ms fade | Alert backdrop |
| `.vendor-rise` | 220ms `cubic-bezier(0.2,0.8,0.2,1)`, translateY 12px→0 | Alert dialog |

**Vendor** (`src/pages/vendor/vendor.css`; easing `--vd-ease: cubic-bezier(0.22,1,0.36,1)`):

| Class | Spec |
|---|---|
| `.vd-page` | Tab content rise, 0.42s, translateY 10px |
| `.vd-stagger > *` | Children rise 0.48s with `animation-delay: min(var(--i),12) * 35ms` |
| `.vd-sheet` | Slide up from 100% (0.42s) on phones; `vd-pop` (translateY 12px + scale .985, 0.3s) at `sm` and up |
| `.vd-scrim` | Fade 0.25s |
| `.vd-toast` | Drop-in 0.4s |
| `.vd-countdown` | 5s scaleX 1→0 hairline |
| `.vd-locate` | Ripple twice, brand orange, `0 0 0 14px` |
| `.vd-ring` | 1.8s amber ring pulse (pending CTA) |
| `.vd-indeterminate` | 1.2s bar (status update in flight) |
| `.vd-skeleton` | Shimmer `#f1f5f9 → #f8fafc` 1.6s |
| `.vd-bar` | Bars grow from baseline, 0.7s, staggered 45ms + 120ms |
| Sliding indicators | Sidebar active pill `translateY(calc(i*(2.75rem+0.125rem)))`; bottom-tab hairline `translateX(i*100%)` 400ms; Segmented thumb 300ms |
| `CountUp` | Ease-out-cubic count-up, 900ms; skips under reduced motion (`primitives.jsx:292-323`) |

`prefers-reduced-motion` is fully handled inside `[data-vendor-app]` (`vendor.css:138-151`, `index.css:195-200`). The storefront has **no reduced-motion handling**.

**Storefront micro-interactions (everywhere):**

- `active:scale-[0.98]`, `active:scale-95`, `active:scale-90` (tabs); `transition-all duration-200/300`.
- Image `group-hover:scale-105`; card hover border `hover:border-brand-400`; arrow nudge `group-hover:translate-x-0.5`.
- `animate-pulse` on cart count badges, status dots and "live" dots; `animate-ping` on the notification dot and the OTP cooldown dot; `animate-bounce` on the order-success check.
- Hero carousel: 700ms crossfade + `translateX(±5%) scale(0.98)`, autoplay 5s, 40px swipe threshold (`Home.jsx:288-346,460-469`).
- Free-delivery progress bar `transition-all duration-300`; OrderDetail stepper fill `width 1.25s cubic-bezier(0.22,1,0.36,1)`.
- **Broken animations:** classes from `tailwindcss-animate` (`animate-in fade-in zoom-in-95 slide-in-from-top-*`) and `animate-fade-in` / `animate-slide-up` are used in Location modal, Checkout modals, Addresses, Login error, NotificationContext toast, ProductDetail and FloatingCartBar. **None are defined**, so these surfaces appear without animation.

---

## 3. Layout patterns & app shells

Route gating and role logic live in `idea.md`. This section covers the visual shells only.

### 3.1 Global chrome (`src/App.jsx:160-290`)

- **Mount order:** `ErrorBoundary` → native-only `SplashScreen` (1200ms) → providers → `BrowserRouter`.
- **Always-mounted overlays:**
  - `StorefrontLocationModal` (not in the vendor build, not on `/vendor/login`).
  - `StorefrontMobileNav` (= `BottomNav`; hidden on `/admin*`, `/vendor*`, `/dr*`, `/login`, `/register`, `/checkout`, and in the vendor app; `App.jsx:138-151`).
  - `FloatingCartBar` (storefront only).
- `ScrollToTop` on pathname change, `behavior: "instant"` (`App.jsx:128-136`).
- **Android hardware back** (`App.jsx:35-68`):
  1. The vendor dashboard's handler goes first: close sheet, then the previous tab.
  2. On `/`, `/login`, `/vendor/login`, `/vendor/dashboard` the app exits.
  3. Otherwise `navigate(-1)`.

  Preserve this in the rebuild with a client `useBackButton` hook.

### 3.2 Customer storefront shell

**Mobile (< lg)**

- **Top header: two variants, chosen per page.**
  1. **Home brand header** (`Home.jsx:378-442`). `sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs`.
     - Row 1: Logo `sm` without subtitle, a 1px divider, then a region picker ("📍 Varanasi ▾", `text-[11px] font-bold`, `max-w-[70px]` truncate).
     - Right side: a "🔑 Login" navy pill (logged-out only) and the bell.
     - Row 2: search input, `h-10 bg-slate-100/90 rounded-xl`, placeholder "Search cement, steel, paints, pipes…".
  2. **Back header** (Categories, Cart, Orders, Profile). `bg-white border-b sticky top-0 z-30 shadow-xs`.
     - Contents: back chevron (`p-1.5 -ml-1.5 rounded-xl`) to `/`, title `text-base font-extrabold`, then bell + cart icon with count.
     - Categories adds a search row.
  3. **Other pages** (ProductDetail, SearchResults, CategoryListing, Checkout, OrderDetail, Addresses) render the desktop `Navbar` at every width. On mobile that means logo + search + bell + cart, with no back button.
- **Bottom tab bar** (`src/components/BottomNav.jsx`).
  - Container: `fixed bottom-0 inset-x-0 z-50 h-14 bg-white/80 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:hidden`, centred `max-w-lg`.
  - 5 tabs: Home, Categories, Cart (badge), Orders, Profile. Icons 20px, stroke 2.
  - Active tab: icon chip `bg-brand-500/10 text-brand-600 scale-105`, label `text-[10px] font-black text-brand-600`.
  - Inactive tab: `text-slate-400`, label `font-semibold text-slate-500`.
  - Press feedback: `active:scale-90`.
  - Badge: `bg-brand-600 text-[9px] h-4 min-w-[16px] ring-2 ring-white animate-pulse`.
- **Floating CTAs on Home** (`Home.jsx:814-838`). A WhatsApp (#25D366) and a Call (#0284C7) FAB, `w-10.5 h-10.5 rounded-full ring-2 ring-white/90 shadow-lg`, `fixed bottom-32 right-3.5 z-40`.
- **FloatingCartBar** (`src/components/FloatingCartBar.jsx`).
  - Appears for **7 seconds** after an add/increment, above the bottom nav (`bottom-16`, `sm:bottom-6`).
  - Style: navy→orange gradient pill `rounded-2xl`.
  - Content: a 🛒 tile with count badge, "N Items in Cart" with ₹ total in `text-brand-300`, and a "View Cart →" ghost button.
- **Footer** is hidden in the native app (`Home.jsx:811`) and only rendered on Home.

**Desktop (≥ lg)**

- **Navbar** (`src/components/Navbar.jsx`).
  - Container: sticky `z-30`, `max-w-6xl`. Scroll-aware: at `scrollY > 20` it becomes `bg-white/80 backdrop-blur-xl` + soft shadow (`Navbar.jsx:25-51`).
  - Contents: Logo `sm`; links Home, Categories, Orders, Profile (active `text-brand-600 font-black`); region pill (`bg-slate-100/70 rounded-xl text-xs font-bold`); search (`focus-within:ring-4 ring-brand-500/10 border-brand-500`); bell; cart with count; then either the user avatar initial (`bg-brand-100 text-brand-700`) + red "Logout" chip, or "🔑 Login / Register" (brand) + "Partner Login" (slate; web only).
- **Footer** (`src/components/Footer.jsx`).
  - Background `bg-[#07132B]`, `max-w-7xl`.
  - Trust strip: 4 tinted emoji tiles ("100% Genuine", "District Delivery", "Cash on Delivery", "Live Site Tracking").
  - 12-column grid: brand blurb + "B2B & B2C" / "Uttar Pradesh Hub" chips; Policies & Legal (+ sky "Partner / Vendor Login →"); Materials; Grievance & Contact card.
  - Copyright strip at the bottom.
  - `pb-20 sm:pb-6` to clear the bottom nav.

**Page skeleton (customer)**

```
<div min-h-screen bg-[#F8FAFC]|bg-slate-50 pb-20..pb-40 overflow-x-clip>
  <div hidden lg:block><Navbar/></div>
  <div lg:hidden sticky header …/>
  <main max-w-{2xl..6xl} mx-auto px-4 pt-3.5 sm:pt-6 space-y-…>sections</main>
  [mobile sticky action bar]   (Cart)
  [modals]
</div>
```

Section header pattern (repeats on Home and Categories):

```jsx
<div className="flex items-center justify-between">
  <h3 className="text-base sm:text-lg font-black text-navy-950 tracking-tight">Title</h3>
  <Link className="text-xs font-bold text-[#c2410c] hover:underline">See all</Link>
</div>
```

### 3.3 Auth shell (`src/layouts/AuthLayout.jsx`)

- **lg and up:** split screen.
  - Left 44%: `bg-navy-900` with two blurred orange glows (`bg-brand-500/20 blur-3xl`, `bg-brand-400/10`), Logo `lg` light, headline "Build Better, With Build City" (`text-4xl font-extrabold`), a 2×2 feature list with orange dots, and copyright.
  - Right: the form, centred, `max-w-[420px]`.
- **Mobile:** centred Logo `md` at the top, form in the middle, `footerRight` slot at the bottom.

### 3.4 Vendor / Partner shell (`src/pages/vendor/VendorShell.jsx`)

- Root `data-vendor-app` (scopes the focus ring and reduced motion): `min-h-dvh bg-slate-50 text-slate-900`.
- **md and up: fixed sidebar** `w-64 bg-white border-r`. Top to bottom:
  - Brand hairline.
  - Logo `sm` + "Partner" chip.
  - Navy **shop card**: `.vd-hero` + blueprint, shop name, map-pin + district.
  - Nav: 4 items `h-11 rounded-xl`. A **sliding active pill** `bg-brand-50 ring-brand-600/10` sits behind them. Icons 20px, stroke 2 active / 1.75 idle. The Orders item carries an active-count badge.
  - Primary gradient "＋ Add product" button. The plus rotates 90° on hover.
- **Phone:**
  - Sticky top bar `h-14 bg-white/95 backdrop-blur` + hairline: icon-only logo, shop name `text-[15px] font-semibold`, district in `text-xs`, and a 40px avatar button that opens Account.
  - Bottom tabs: `h-16`, 4 columns, labels `text-[11px] font-medium`, icons 24px. A **sliding 2px orange indicator** sits on top. The active icon lifts `-translate-y-0.5`. `pb-[env(safe-area-inset-bottom)]`.
- **Main:** `md:pl-64`, inner `max-w-5xl px-4 pb-28 pt-5`, re-keyed per tab for the `.vd-page` entrance.
- **Overlays slot:** NewOrderToast, CatalogSheet, EditListingSheet.

### 3.5 Admin & DR shells

- **Admin** (`src/pages/admin/AdminDashboard.jsx` from line 832).
  - Sticky white header: Logo + a "🟢 Super Admin Control Center" brand pill; user name/role on the right; red Logout.
  - Under it, a **horizontally scrolling tab strip** (`custom-scrollbar`) with ‹ › scroll buttons on `sm` and up. 13 emoji-labelled tabs (`AdminDashboard.jsx:20-34`); active `bg-navy-900 text-white`; count pills.
  - Content `max-w-7xl`: KPI cards with gradient top edges, data tables (`text-xs`, header `bg-slate-50 text-[11px] font-black uppercase`), and modals.
  - Desktop-oriented. Mobile works but is cramped.
- **DR** (`src/pages/dr/DrDashboard.jsx`).
  - Same header (adds "DR Portal" chip and a "📍 District: X" amber chip).
  - Navy gradient banner with CTAs ("➕ Add New Vendor" white, "📦 Add New Product" brand) and 4 glass metric tiles (`bg-white/10 backdrop-blur-xs border-white/10`).
  - Then a segmented tab bar (`bg-white p-1.5 rounded-xl`, active `bg-brand-600 text-white`).

### 3.6 Safe area, mobile-first and Capacitor handling

- `env(safe-area-inset-bottom)` is used on the customer BottomNav, the vendor bottom tabs, the vendor Sheet footer, the CatalogSheet list, and the Cart sticky bar (`bottom-[calc(3.5rem+max(0.25rem,env(safe-area-inset-bottom)))]`).
- **No `viewport-fit=cover`** in `index.html` (only in `public/offline.html`), so the safe-area insets resolve to 0 on iOS web. Android uses `overlaysWebView: false`, so the status bar never overlaps. **No `safe-area-inset-top` handling anywhere.**
- Native-only behaviour:
  - Splash overlay.
  - Footer hidden.
  - Home `pb-20` vs `pb-4`.
  - "Partner Login" hidden.
  - Back button.
  - Vendor OTA updates (`main.jsx:9-11`).
- App-like CSS (`index.css`):
  - `-webkit-tap-highlight-color: transparent`, `-webkit-touch-callout: none`.
  - **Global `user-select: none`**, re-enabled for inputs, `.selectable-text`, `article`, `.prose` (`index.css:66-75`).
  - `overflow-x: clip` on html/body.
  - `scrollbar-gutter: stable`.
  - `.no-scrollbar` for horizontal rails.
  - `touch-manipulation` on tabs, `touch-pan-y` on the carousel.
- `min-h-dvh` (vendor) vs `min-h-screen` (everywhere else).
- Offline page for the Partner WebView (`public/offline.html`):
  - Coral wifi-off icon tile (`#fff4f1` / `#d23a1b`), "You're offline" copy, navy `#0f172a` 44px "Try again" button.
  - Auto-reloads on the `online` event.

---

## 4. Component inventory

Legend: **[S]** shared `src/components`, **[V]** vendor primitive, **[I]** inline / page-local (re-implemented in several places).

### 4.1 Buttons

| Component | Spec | Variants / behaviour |
|---|---|---|
| **Button [S]** `src/components/Button.jsx` | `w-full rounded-xl py-3 text-sm font-semibold gap-2 transition-colors disabled:opacity-60` | `primary` `bg-brand-500 hover:bg-brand-600 text-white`; `outline` `border-slate-200 bg-white hover:bg-slate-50`. Used only by Login. |
| **Button [V]** `primitives.jsx:48-76` | `inline-flex rounded-xl font-semibold active:scale-[0.98] disabled:opacity-50`; sizes `sm h-9 px-3 text-sm`, `md h-11 px-4 text-sm` | Variants `primary` (gradient + inset highlight), `dark` (`bg-navy-950 hover:bg-[#0d224d]`), `success` (emerald tint ring), `secondary` (white + `ring-slate-200`), `ghost`, `danger` (white + rose ring). Polymorphic `as="a"`. Defaults `type="button"`. **Base for the rebuild.** |
| Inline CTAs [I] | Hundreds of one-offs: `text-xs font-black px-4 py-2.5 rounded-xl shadow-xs active:scale-[0.98]` | Full-width `py-3.5` checkout CTAs; navy "Track Order →"; pill "Explore →"; text-link buttons `text-[11px] font-bold text-brand-600 hover:underline` |
| Icon button [I] | `p-1.5 rounded-xl hover:bg-slate-100` (back, bell, cart); vendor close `h-10 w-10 rounded-full hover:rotate-90` | Often missing `aria-label` (it uses `title`) |
| FABs [I] | WhatsApp / Call circles, `w-10.5 h-10.5` | Home only |
| Load more [S] `LoadMoreButton.jsx` | White `rounded-xl border px-4 py-2.5 text-xs font-bold` + "Showing N of M" `text-[11px] text-slate-400 tabular-nums` | `loading` → "Loading…"; no-more → "Showing all N" |
| Toggle switch [I] | `h-6 w-11 rounded-full`, on `bg-brand-500` / off `bg-slate-300`, knob `h-5 w-5 translate-x-5`, `role="switch" aria-checked` | Bulk rates toggle (CatalogSheet, EditListingSheet); duplicated twice |

### 4.2 Inputs & forms

| Component | Spec | Notes |
|---|---|---|
| **FormInput [S]** `FormInput.jsx` | Label `text-sm font-medium text-navy-900 mb-1.5`; field wrapper `rounded-xl border bg-white px-3.5 py-2.5 focus-within:border-brand-500`; error `border-red-400` + `text-xs text-red-500` | Optional leading icon, password eye toggle (`tabIndex=-1`). **Label not associated with the input** (no `htmlFor`/`id`). Barely used. |
| **Field [V]** `primitives.jsx:214-233` | `useId` label; `h-11 rounded-xl border-slate-200 focus-within:border-brand-400 focus-within:ring-4 ring-brand-500/10`; `prefix`/`suffix` (₹, %); `hint` | **Base for the rebuild.** |
| **SearchField [V]** `primitives.jsx:110-134` | `type="search" h-11 pl-10 pr-10`, leading icon, 36px clear button with `aria-label` | |
| Storefront search [I] | Navbar: `px-3.5 py-2 bg-slate-50/80 focus-within:ring-4`; Home mobile: `h-10 bg-slate-100/90`; Categories and SearchResults have their own | Submits to `/search?q=`; ✕ clear |
| Phone input [I] | `+91` prefix with a separator (`|` or a 1px span), `inputMode="numeric" maxLength=10`, digits only | Login (customer & partner), Register (`rounded-l-xl` prefix block) |
| **OTP input [I]** | Single input, `maxLength=6`, `text-center tracking-[0.5em] text-lg font-bold rounded-xl py-3` (`Login.jsx:353-363`; Register `tracking-[0.3em] font-black bg-slate-50`) | No segmented boxes; no `autocomplete="one-time-code"`. Resend pill with countdown `mm:ss` (`font-mono text-brand-600`) + `animate-ping` dot; "← Change Number". |
| Coupon input [I] | Uppercase, `font-mono`/`font-bold`, `bg-slate-50 focus:ring-2 ring-brand-500/20` + navy "Apply" | Cart, Checkout |
| Address form [I] | Labels `text-[11px] font-black uppercase tracking-wider text-slate-500` (Addresses) vs `text-xs font-bold text-navy-900` (Checkout); inputs `rounded-xl px-3.5 py-2.5 text-sm/xs`; locked city field `bg-slate-50 cursor-not-allowed` + "(Selected Region)" tag | Type chips Home / Work / Other (active `bg-navy-900 text-white`); default checkbox `accent-brand-600` |
| Checkbox / radio [I] | Native with `accent-[#1E5FD9]` or `accent-brand-600` | FilterSidebar, Checkout |
| Native `<select>` [I] | Sort dropdown `rounded-lg border px-3 py-2`; vendor **StatusControl** select is styled `h-11 appearance-none rounded-xl pl-[5rem]`, tinted by status, with an inset "● Status" label and chevron | |
| Star rating input [I] | 5 `★` buttons `text-2xl`, emerald when filled (`ProductDetail.jsx` ~1080) | No radio semantics |

### 4.3 Cards & tiles

| Component | Spec |
|---|---|
| **ProductCard [S]** `ProductCard.jsx` | **Shell:** `bg-white rounded-2xl border-slate-200/80 hover:border-brand-400 shadow-[0_2px_8px_-2px_…] hover:shadow-[0_8px_24px_-4px_rgba(234,88,12,0.12)] active:scale-[0.98]`.<br>**Image:** square edge-to-edge `bg-slate-100/80`, hover zoom. Top-left pill: "18% OFF" `bg-brand-600 text-white text-[9px] font-black rounded-full`, or "Unavailable" rose.<br>**Body:** brand eyebrow `text-[9px] uppercase text-slate-400`; name `text-xs sm:text-[13px] font-black line-clamp-2 min-h-[2rem]`. Below a `border-slate-100` divider: price `text-sm sm:text-base font-black tabular-nums` + struck MRP `text-[10px]` + "(18% off)" emerald; unit chip `bg-slate-100 text-[9px]` + "Save ₹X" emerald chip.<br>**CTA (h-8):** white "+ ADD" bordered button, or a **qty stepper** (`bg-slate-100/70 p-0.5 rounded-xl`, 28px white −/+ buttons, count `w-8 text-xs font-black`), or a disabled "Unavailable". Tapping the card goes to the PDP; buttons `stopPropagation`.<br>**Grid:** `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3`. Rail item: `w-[160px] sm:w-[195px] snap-start`. |
| Category tile (Home) [I] | `w-[92px] sm:w-28 rounded-2xl p-2.5` with pastel bg, white disc `w-14 h-14` image, name `text-xs font-black`, tag `text-[9px] text-slate-500`; horizontal rail on mobile, `lg:grid-cols-7` |
| Category card (Categories) [I] | `grid-cols-4 sm:grid-cols-5`; `rounded-xl p-2`; disc `w-12 h-12`; selected `bg-blue-50/90 border-2 border-[#0284C7] ring-2 ring-blue-200`; "Coming soon" state greys (`grayscale-[40%]`); count label `text-[8.5px]`. "All" card uses a grid icon. |
| Brand disc [I] | `w-16 h-16 lg:w-20 rounded-full border shadow`, name below `text-[11px] font-black` |
| Banner carousel [I] | `rounded-2xl sm:rounded-3xl bg-slate-900 ring-1 ring-black/5 aspect-[5/2]`; dots in a glass pill top-right (`bg-black/35 backdrop-blur-md`; active dot `w-5`, others `w-1.5`); arrows `w-9 h-9 bg-white/90` shown on hover at `sm` and up; optional bottom gradient caption with a brand tag + "Explore" white pill |
| Service card [I] | Tinted card + small icon square + title / subtitle + round arrow button + gradient emoji badge on the right |
| Promo banner [I] | Navy gradient `rounded-2xl p-4` + white pill CTA + "UP TO 20% OFF" orange stamp circle `w-12 h-12` |
| Review card [I] | `w-[280px] sm:w-[320px] rounded-2xl p-4`; initials avatar `from-navy-900 to-slate-800`; 5 amber stars; material chip; italic quote; amber "⚡ Delivered in …" pill |
| Customer order tile [I] (`Orders.jsx:218-310`) | Status-tinted gradient card + `w-1.5` left accent. Contents: 📦 box, status pill with pulsing dot, IST date, first item name, `#ORD-*XXXX` mono, chips (+N more / Delivery ₹ / Coupon purple / Wallet amber), "Total Amount" eyebrow + ₹ `text-lg font-black`, navy "Track Order →" (hover brand) |
| **OrderCard [V]** `sections/OrderCard.jsx` | `article rounded-2xl` + status tile wash + 4px left accent + resting tile shadow.<br>**Header:** customer name `text-base font-semibold` + "New" chip on the left; ₹ total `text-lg font-bold` on the right.<br>**Meta:** time short (tooltip: full IST) · "(waiting 2h)" coral if pending ≥ 60 min · "3rd order" amber.<br>**Body:** `OrderAddress` (2-line clamp + more/less + "Map ↗"); `OrderItems` (`qty ×` column `w-9`, tap a row for the unit rate, folds after 4 rows to 3 + "+N more", Delivery/Free, Coupon, "BuildCity Due", Total Collect/Collected).<br>**Footer:** `ProgressTrack` + `StatusControl` (44px call button + status select). During an update an amber "Updating to …" bar and indeterminate top hairline replace the control. A highlighted order gets `border-brand-500 ring-2 vd-locate`. |
| **Stat (KPI) [V]** `OverviewTab.jsx:17-43` | `rounded-2xl border bg-white p-4` + 2px top edge in tone; 28px tinted icon chip; label `text-xs`; value `CountUp text-xl md:text-2xl font-semibold`; note `text-xs`; clickable stats get a chevron + hover tint. Tones: emerald, amber, sky, indigo. |
| Admin KPI [I] | `rounded-2xl p-4.5` + 4px gradient top edge, `text-2xl font-black`, pill note |
| **Card [V]** | `rounded-2xl border border-slate-200 bg-white` (no shadow) |
| Profile stat trio [I] | Wallet / Coupons / Orders: `grid-cols-3 rounded-xl text-center`, tinted pill label, big value, "Passbook →" |
| List row (settings) [I] | `flex gap-3.5 px-4 py-3.5 hover:bg-slate-50/80`, emoji in `bg-slate-100 p-2 rounded-xl`, title + sub, chevron; destructive row in rose |
| DetailRow / ActionRow [V] | 32px tinted icon square, label `w-28 text-slate-500`, value right-aligned; action rows emerald hover + chevron |

### 4.4 Badges, pills, chips, tags

- **StatusBadge [V]** `rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset` + dot or icon.
- **ApprovalBadge [V]** see §2.4.
- **CountBadge [V]** `h-5 min-w-5 rounded-full bg-brand-600 text-[11px] font-semibold tabular-nums`, shows "99+".
- **Chip [V]** `h-9 rounded-full px-3.5 text-sm font-medium`.
  - Active: `bg-navy-950 text-white` + chip shadow.
  - Inactive: white + `ring-slate-200`.
  - Optional status `dot` and `count`; `aria-pressed`.
  - `ChipRow` is a horizontal scroll rail with negative margin bleed `-mx-4 px-4`.
- **Segmented [V]** `rounded-xl bg-slate-100 p-1` with a sliding white thumb; `role="tablist"`, `aria-selected`.
- **Storefront pills [I].** Endless `text-[9px]–text-[11px] font-black px-2 py-0.5 rounded-full border` in emerald / amber / rose / brand / purple, for example "N Live", "Daily Special", "UNLOCKED", "Current", "Bulk", "Verified Buyer".
- **Tab pills [I].**
  - Orders: `px-3.5 py-2 text-xs font-bold rounded-xl`; active `bg-navy-900 text-white`, inactive white bordered.
  - NotificationPanel: `text-[11px] rounded-lg`.
  - Admin: emoji labels.
  - DR: brand active.
  - Legal page: `rounded-xl` in a white segmented container.
- **Filter chips [I]** (CategoryListing) `bg-brand-50 text-brand-600 rounded-full px-3 py-1.5` + "×".

### 4.5 Overlays: modals, sheets, panels, toasts, alerts

| Component | Spec | Behaviour |
|---|---|---|
| **AlertProvider dialog [S]** `src/context/AlertContext.jsx` | Portal at `z-[99999]`; scrim `bg-slate-950/50 vendor-fade`; card `role="alertdialog" rounded-2xl p-5 sm:p-6 max-w-md shadow-xl vendor-rise`; 40px tinted icon circle (warning orange-50/700, success emerald, error rose, info slate); title `text-base sm:text-lg font-semibold`; message `text-sm text-slate-600 whitespace-pre-line`; 36px close | `showAlert({title,message,type,buttonText})` → one full-width `h-11 bg-slate-900` button. `showConfirm({…,confirmText,cancelText,onConfirm})` → two half buttons, **confirm is always `bg-rose-600`** (destructive styling even for benign confirms). No focus trap; no Escape; clicking the scrim closes. |
| **Sheet [V]** `primitives.jsx:237-289` | Phone: bottom sheet `rounded-t-2xl max-h-[92dvh]` (or `h-[100dvh]` with `fullHeightMobile`). `sm` and up: centred `rounded-2xl max-w-md` / `lg: max-w-2xl`, `max-h-[86vh]`. Scrim `bg-slate-950/45 backdrop-blur-[2px]`. Header: `leading` slot, title / subtitle, 40px close that rotates on hover; `hero` makes the header navy + blueprint. Sticky footer with a safe-area pad. | Escape closes; `aria-modal`, `aria-labelledby`. No focus trap. **Base for all modals in the rebuild.** |
| CatalogSheet [V] | Hero sheet "Add product · N verified products in catalogue"; sticky search + category chips; rows (thumb, name, brand in `text-brand-700`, MRP) with "Add"/"Close" or "✓ Added"; an inline expanding **OfferForm** (`bg-brand-50/50`) with MRP / Discount % / Selling price / Stock fields, a live "Customers see ₹X ~~₹Y~~ 10% off" preview, the bulk-packs toggle, "Submit for review", and the note "Goes live after your district team approves it." | Auto-scrolls the form into view |
| EditListingSheet [V] | Sheet with a thumb as `leading`; listing status badge; "Base Unit Pricing" fields; emerald "Customers see for 1 bag" preview; bulk packs editor (per pack: label, `(Nx base)`, % off, price/stock inputs, "Cut-off MRP", ₹/unit) | Footer Cancel + "Save changes" |
| FirstTimeLocationModal [S] | `z-[1000]`, scrim `bg-slate-950/75 backdrop-blur-sm`. Centred `rounded-3xl max-w-sm sm:max-w-md max-h-[85vh]`. Navy gradient header "Choose Delivery Location" with a glass search ("Search city, district, or pin…"). "Popular:" chips (navy when selected). Scrollable region rows: 36px 📍 tile, name + "Current" chip, "State • Delivery from ₹X / • Free Delivery", round radio. Selected row: `bg-blue-50/80 border-[#0284C7]`. Footer: navy "Confirm & Explore →". | Auto-opens on first visit and **cannot be dismissed** until a region is chosen. Tapping a row confirms immediately. Region change triggers an Alert about cart changes. |
| NotificationPanel [S] | Bell trigger with a red `animate-ping` dot. Portal `z-[999]`; scrim `bg-navy-950/40 backdrop-blur-xs`. Dropdown card `fixed top-14 right-3 left-3 sm:w-96 rounded-2xl bg-white/95` with an enter animation (translate-y −6 + scale .95 → 0, 200ms). Header: bell chip, title, unread count, "Mark all read", ✕. Tabs All / Orders / Offers + "Clear all". List `max-h-96`: emoji type tile (offer emerald, price amber, order blue, other purple), type pill, title, message, relative time ("Just now / 12m ago / Yesterday / 3d ago"), "View details →"; unread rows get an orange gradient + pulsing dot. Per-item dismiss ✕. | Empty state: 🔔 "No notifications here / You're all caught up with your site updates!" |
| In-app toast [S] `NotificationContext.jsx:437-485` | `fixed top-5 right-4 z-[9999] max-w-sm`; `bg-slate-900/95 border-brand-500/40 rounded-2xl backdrop-blur-xl`; animated gradient top bar; emoji tile; type pill; title `text-xs font-black`; message; "View" link `text-brand-400` | Customer only, shown once per notification, auto-hides after **6s** |
| **NewOrderToast [V]** | Top-centre on phones (`inset-x-3 top-3`), top-right `w-96` at `sm` and up. Navy hero + blueprint, amber 40px bell, "New order" `text-amber-200`, "Name · ₹X · N items", amber "View order" button, dismiss, 5s countdown hairline. `role="status" aria-live="polite"`. | Paired with an alert sound (`utils/orderAlertSound.js`) |
| Storefront modals [I] | Coupons (Cart): `rounded-2xl max-w-md p-6`. Address add/edit (Checkout, Addresses): `rounded-2xl max-w-md/lg`, header strip `bg-slate-50/80`. Coupons and Wallet passbook (Profile): `rounded-3xl max-w-sm sm:max-w-md`, `animate-modal-pop`. Scrims vary: `bg-slate-900/60`, `bg-navy-950/60`, `bg-black/40`, with `backdrop-blur-xs/sm/md`. | No Escape and no focus management; some use the undefined `animate-in` classes |
| Order success modal [I] `Checkout.jsx:1064-1180` | `bg-navy-950/80 backdrop-blur-md`; `rounded-3xl max-w-lg p-6 sm:p-8` with an emerald glow; 80px ring + 48px emerald check `animate-bounce`; "ORDER CONFIRMED & PLACED" pill; "Thank You For Your Order!" `text-2xl font-black`; details card (per-vendor package rows when split, Order ID mono brand chip, Total, Payment "Cash on Delivery", destination); buttons "🚚 Track Live Order Status" (brand) + "Continue Shopping" (slate) | Uses `replace` navigation |
| Mobile filter sheet [I] (CategoryListing) | `bg-black/40` scrim + `bg-surface rounded-t-2xl max-h-[80vh] p-4 pb-8` + "Show N results" | |
| ErrorBoundary [S] | Centred `rounded-2xl p-6 shadow-xl` card; ⚠️ amber circle; "Something went wrong"; raw error message in a rose mono box; navy "Reload Page" + slate "Home" | |
| SplashScreen [S] | Customer: navy gradient, glowing glass logo card (`rounded-3xl bg-white/5 border-white/10`, `animate-splash-logo`), "BuildCity" `text-3xl font-black`, tagline. Partner: flat `#0A192F`, 80px logo, "BuildCity" `font-semibold`, "PARTNER". 500ms opacity fade-out. | Native only; min 1200ms (800ms for route loaders) |

### 4.6 Navigation components

- **Navbar** §3.2; **BottomNav** §3.2; **VendorShell** nav §3.4; Admin and DR tab strips §3.5.
- **RegionPicker [S]** `RegionPicker.jsx` is a render-prop trigger (`role="button" tabIndex=0`, Enter/Space) that opens the location modal. Default name "Varanasi".
- **Breadcrumbs [I]** `text-xs text-slate-400`: "Home / Category / Product", `hover:text-brand-500` (PDP, Search, CategoryListing, Legal).
- **Pagination [I]** (CategoryListing) `h-9 w-9 rounded-lg`, active `bg-brand-500 text-white`, ‹ › arrows.
- **Back link [I]** "← Back to Orders" `text-sm text-brand-500 font-bold` (OrderDetail).

### 4.7 Data display

- **ProgressTrack [V]**: a 2px track with 4 nodes, the reached part in the status colour. The current node is 10px with a 4px halo, past nodes 6px, future nodes hollow with a slate ring. `role="img"` with an aria-label.
- **Customer stepper [I]** (`OrderDetail.jsx`): 32px numbered circles (✓ when passed), 3.5px connecting track filled in the status colour, labels `text-[11px]`; delivered turns all emerald + ring.
- **Free-delivery tracker [I]**: 🚚 + "Free Delivery on orders above ₹X", an 8px (`h-2`) `bg-sky-200/80` track with a `bg-brand-600` fill, "Add **₹X** more … to get **100% Free District Delivery**"; unlocked state is emerald with an "UNLOCKED" pill.
- **Price summary [I]**: rows `flex justify-between text-xs`. "Total MRP", "Discount on MRP" (emerald `- ₹`), "Coupon (CODE)" (brand), "District Delivery Fee" (struck ₹ + "FREE" chip, or ₹), divider, "Total Amount" `text-base font-black`, a savings banner in emerald.
- **Bill (OrderDetail) [I]**: dashed top border; coupon and wallet rows as tinted bars; "Cash On Delivery" emerald pill next to the total.
- **Specs table [I]** (PDP): `rounded-2xl border`, zebra `bg-slate-50/70`, label `w-1/3 text-slate-500`, value `font-bold`.
- **Pack-size selector [I]** (PDP): `grid-cols-2 sm:grid-cols-3 md:grid-cols-5` buttons `p-3 rounded-2xl`, selected `border-sky-600 bg-sky-50/80 ring-1 ring-sky-500`; "Bulk" emerald tag; label, ₹ price, struck MRP, "% OFF"; per-unit rate shown in the header.
- **Image slider [S]** `ProductImageSlider.jsx`: `aspect-4/3 sm:aspect-square rounded-2xl`; counter "1 / 3" glass pill; round ‹ › buttons; 56px thumbnails, selected `border-brand-500 ring-2`.
- **WeeklyActivity [V]**: a custom 7-bar chart `h-28`, sky bars with today as an orange→amber gradient, readout above ("N orders · Last 7 days · ₹X"), hover/tap focus. Each bar is a `button` with an aria-label.
- **Tables [I]** (admin): `text-xs`, header `bg-slate-50 text-[11px] font-black uppercase tracking-wider`, cells `p-3.5`, `divide-y divide-slate-100`, wrapped in `overflow-x-auto rounded-2xl`.
- **Vendor product list [V]**: on phones a grid row (thumb · name/meta/badge/stock · price); at `md` and up a pseudo-table with a header row `grid-cols-[3rem_minmax(0,1fr)_8rem_8rem_6rem_1.25rem]`.

### 4.8 Empty / loading / error states

| Kind | Storefront pattern | Vendor pattern |
|---|---|---|
| Empty | Big emoji (`text-3xl`–`text-5xl`: 🛒 📦 🔍 📍 ⏳ 🔔 🏷️ 💳) + bold title + slate copy + brand CTA, inside a `bg-white rounded-2xl border` (sometimes dashed) | **EmptyState [V]**: 48px tinted rounded-2xl icon tile + `text-sm font-semibold` title + `max-w-xs text-sm text-slate-500` description + action |
| Loading (list) | `animate-pulse` grey blocks (`bg-white rounded-2xl border h-44/h-48`; order rows with `bg-slate-200` bars) | `.vd-skeleton` shimmer rows (`ProductRowSkeleton`) |
| Loading (inline) | Border spinner `border-2 border-white border-t-transparent animate-spin` (3.5–4px), or an SVG spinner; label text "Sending OTP...", "Verifying...", "Saving...", "Loading Product..." | `Spinner [V]` (current-colour border spinner) + verb: "Signing in", "Submitting", "Saving" |
| Error (form) | `bg-rose-50 border-rose-200 text-rose-700 text-xs font-bold rounded-xl/2xl`; amber variant for "wrong portal" messages | `role="alert"` rose box `text-sm` (partner login) |
| Error (app) | ErrorBoundary card | Same |
| Offline | none (web) | `public/offline.html` |
| Not deliverable / unavailable | Amber "Not Deliverable to {region}" pill + disabled Add / Buy + brand "Browse Available X in {region} →"; rose "Unavailable" chips; cart item image greyscale + rose "UNAVAILABLE" strip | Out of stock shown as `text-brand-700` |

### 4.9 Icons

- **Storefront:** inline SVGs re-declared per file, 16–22px, stroke 1.8–2.5. PinIcon, SearchIcon, CartIcon and ChevronIcon are redefined in about 6 files with **two different cart glyphs**. Emoji are used heavily (counting failed with a simple grep; they are in nearly every storefront file).
- **Vendor:** `src/pages/vendor/ui/icons.jsx`. One component, Lucide geometry, 24 grid, stroke 1.75 (2 for active), round caps, `aria-hidden`. 23 icons: Orders, Package, Overview, User, Plus, Search, Close, Phone, MapPin, Chat, ChevronRight/Down, Bell, LogOut, Check, BadgeCheck, Mail, Store, Inbox, Clock, Rupee, Truck, ArrowUpRight.
- **Rebuild:** use `lucide-react` for all of them (exact visual match) and drop emoji from system UI.

---

## 5. Screen-by-screen catalogue

### Public / storefront

| Route | File | Key UI | Interaction patterns |
|---|---|---|---|
| `/` | `pages/public/Home.jsx` | Mobile brand header with region + search (§3.2). Sections in order: (1) hero banner carousel 5:2; (2) **Top Brands** circular discs rail (`lg:grid-cols-7`); (3) **Shop by Category** pastel tile rail; (4) **Best Offers in {Region}** + "N Live" pill, 2/3/4-col ProductCard grid (12 max), pulse skeleton, empty card; (5) **Deal of the Week** "Daily Special" rail (5 products, daily seeded shuffle); (6) **Customers Reviews** ⭐ 4.7 pill + review rail; (7) **Popular Services** 2-col (Site Visit, Web Development); (8) **Exclusive Deals** navy promo; Footer (web); WhatsApp / Call FABs | Swipe / drag carousel, autoplay 5s; horizontal snap rails; "See all" → `/categories?cat=`; add-to-cart on cards opens FloatingCartBar |
| `/categories` | `pages/public/Categories.jsx` | Back header + search; **Shop by Category** grid 4/5 cols with counts / "Coming soon"; product section "Best Selling Products" or "{Cat} Products" + Live pill + "Clear Filter (View All)"; grid of ProductCards; "Coming Soon!" Hinglish empty state | Selecting a category smooth-scrolls to products (offset −70px); `?cat=` deep link auto-scrolls. (An unused `bannerSlides` and 4s timer remain.) |
| `/category/:slug` | `pages/public/CategoryListing.jsx` | Navbar; breadcrumb; H1 + "N products in {region}"; **FilterSidebar** (`w-60` sticky, Brand checkboxes, Price radios, "Clear all") on `sm` and up; mobile "Filters" button + bottom sheet; sort select; active filter chips; 2/3-col grid; numbered pagination (9 per page) | Legacy page; brand pool hard-coded; renders `BottomNav` import but it is not used |
| `/search?q=` | `pages/public/SearchResults.jsx` | Navbar (+ mobile search field); breadcrumb; "Results for "q"", "N products found in {region}"; 2/3/4-col grid; dashed 🔍 empty state | Form submit updates the query param |
| `/product/:id` | `pages/public/ProductDetail.jsx` | Navbar; breadcrumb; 2-col (`md`) layout: ImageSlider \| brand eyebrow (`text-brand-600 uppercase`), H1 `text-xl sm:text-2xl font-extrabold`, emerald rating badge "4.6 ★" + review count, price block (₹ `text-2xl font-black`, struck MRP, emerald "% OFF"), availability line (pulsing green "In Stock — Ready for site delivery in {region}" / amber not deliverable / rose unavailable; "Fulfilled by local certified vendor: X"), **Size** pack grid, **Quantity** stepper, **Add to Cart** (outline brand → "Added to Cart ✓" emerald for 1.5s) + **Buy Now** (solid brand), Description card, Specifications zebra table; **You May Also Like** card grid; **Reviews** section (summary chips, "Write a Review" brand button, inline form with stars / name / comment, success / error banners, review cards with "Verified Buyer · date") | Inline actions only; **no sticky mobile buy bar**; full-page spinner while loading |
| `/privacy`, `/terms`, `/refund`, `/shipping` (+ aliases), `/policy/:policy` | `pages/public/LegalPolicyPage.jsx` + `data/legalPolicies.js` | Navy sticky header `bg-[#07132B] h-16` with Logo light + "COMPLIANCE" label + brand button; breadcrumb; segmented policy tabs; `lg:grid-cols-12`, article `col-span-8 rounded-3xl p-6 sm:p-10` with sections (H2 + 6×18px brand bar, body `whitespace-pre-line border-l-2 pl-3.5`); side info; footer | Tab switch changes the policy; text selectable (`article`) |

### Auth

| Route | File | Key UI |
|---|---|---|
| `/login` | `pages/auth/Login.jsx` | AuthLayout. Customer: segmented "Customer Login \| Create Account" (`bg-slate-100/80 p-1 rounded-xl`, active white); H1 "Welcome back" `text-2xl font-black`; step 1 phone with +91 → "Continue with OTP"; step 2 OTP (letter-spaced) → "Verify & Login", "← Change Number", resend countdown pill; link to register; on web "Looking for Partner / Vendor Login? Click here →". Errors in rose (or amber if a wrong-role message). Hidden `#recaptcha-container`. |
| `/vendor/login` (and Partner app root) | `Login.jsx` with `mode="vendor"` | Quieter vendor styling: H1 "Partner sign in" `font-semibold text-slate-900`, "Use your registered mobile number and password.", `h-12` labelled inputs (`htmlFor`), focus `border-slate-400`, `h-12 bg-brand-600` "Sign in" with spinner "Signing in", `role="alert"` errors. |
| `/register` | `pages/auth/Register.jsx` | "Create Customer Account"; Full Name, Mobile (+91 block), Referral Code (Optional, mono uppercase, helper text); "Send Verification OTP →"; then a summary card "👤 name / 📱 +91 …" + "Change", OTP field, **emerald** "✓ Verify OTP & Create Account", resend timer; footer link to login. |

### Customer (login required)

| Route | File | Key UI | Interactions |
|---|---|---|---|
| `/cart` | `pages/customer/Cart.jsx` | Back header "My Cart (N)". Banners: free-delivery unlocked; **region mismatch** amber card with gradient "Update Prices" button + spinner. `md:grid-cols-3`: item list (white cards, 64–80px thumb, name, unit chip, rose "Unavailable in region" tag, qty stepper, ₹ line price, struck MRP, emerald save chip, remove 🗑 icon) \| sidebar: coupon box ("View all", suggested best coupon card, applied emerald state), free-delivery tracker, sticky **Price Details** card, CTA ("Proceed to Checkout →" / "Remove Unavailable Items…" disabled / sky "Update Prices to Checkout"). **Mobile sticky checkout bar** above BottomNav: "TOTAL (N ITEMS)" eyebrow, ₹ `text-xl font-black`, "Save ₹X" pill, gradient "Checkout →". Coupons modal. Empty: 🛒 "Your Cart is Empty" + "Start Shopping Building Materials". | Qty ±, remove, apply coupon, region sync |
| `/checkout` | `pages/customer/Checkout.jsx` | Navbar (no bottom nav). H1 "Checkout" `text-xl font-bold`. `md:grid-cols-3`: **Delivery Address** card (first-order inline form with brand notice "First Order: Please enter your Site Delivery Address below." / or radio list of addresses with "Deliverable" emerald / "Different district" amber chips; sky notice + "Add address in {region}"), **Payment Method** (single COD option, brand-tinted, 💵 "Cash on Delivery (Pay on Site Arrival)"), **Promo** card, **Order Items** list \| sticky summary: wallet redemption checkbox (amber gradient), free-delivery tracker, rows, total, "Place Order (Cash on Delivery)" brand-600 button with spinner + pulsing helper text. Add-address modal. **Order success modal.** | Place order → success modal → `/orders/:id` or `/orders` |
| `/orders` | `pages/customer/Orders.jsx` | Back header "My Orders" + bell + cart; H1; status tab pills (All, Pending, Processing, Out for Delivery, Delivered, Cancelled); order tiles (§4.3); skeletons; empty 📦 + "Browse Catalog & Order Now"; LoadMoreButton "Load older orders" | Tile → detail |
| `/orders/:id` | `pages/customer/OrderDetail.jsx` | Navbar; "← Back to Orders"; status header card (tinted, left accent, "Order #ORD-*XXXX", status pill, 🕒 IST timestamp, 📍 "Delivering To Site:"); **Live Order Tracking** stepper card; **Ordered Materials** list (56px thumbs, Qty × ₹, line totals) + bill; renders its own `<BottomNav/>` | Read-only |
| `/profile` | `pages/customer/Profile.jsx` | Back header "My Profile"; success toast bar; profile header (sky gradient, 56px initial avatar, name, phone, "Edit" button) → inline edit form; **stat trio** Wallet ₹ (opens Passbook modal) / Active Coupons (opens modal) / Orders; **Refer & Earn** card (mono referral code, Copy → "Copied!", WhatsApp share, 3-step "How it works"); **My Account** list (Orders, Addresses, …); **Support** list (24/7 District Support, About); rose **Logout** row. Coupons modal (copy-code chips); Wallet Passbook modal (balance, transaction rows with +/− tinted circles, skeletons) | Modals use `animate-modal-pop` |
| `/addresses` | `pages/customer/Addresses.jsx` | Navbar; success banner; "My Addresses" + "+ Add New Address" brand button; cards (type tag Home / Work / Other in brand, "Default" emerald, Edit brand / Delete rose text buttons, name, phone, 📍 street, city / state / pincode); "Set as default" link; add/edit modal; dashed empty state | Delete through confirm |

### Vendor / Partner (`/vendor/dashboard`, tabbed, single route)

| Tab | File | Key UI |
|---|---|---|
| Orders (default) | `sections/OrdersTab.jsx` | PageHeader "Orders"; **Segmented** Active / Completed with counts; **ChipRow** of status filters with colour dots + counts + amber "Repeat customers"; SearchField "Search customer, phone, area or material"; 1/2-col staggered **OrderCard** grid (`gap-5 lg:gap-x-6 lg:gap-y-7`); EmptyStates; LoadMore. Status change through the select, with a destructive Confirm for cancel ("Cancel this order?" / "It will move to Completed as cancelled." / "Cancel order"). |
| Products | `sections/ProductsTab.jsx` | PageHeader "Products · N listed" (+ mobile "Add"); search; category chips (only if > 1); Card list of product rows (thumb, name, brand-coloured meta, approval badge, stock text, price + % chip); desktop column header; skeletons; EmptyState "Pick products from the BuildCity catalogue and set your price." Row → EditListingSheet. |
| Overview | `sections/OverviewTab.jsx` | **Navy hero**: "Good morning, {firstName}" (amber), shop name H1, district · long date, pulsing amber "N orders are waiting for you" CTA, bottom hairline. **4 KPI Stats** (Delivered revenue (₹ / compact L/Cr), Active orders, Completed, Products). **Order activity** weekly bars. Two Cards: **Recent orders** (initial avatars with stable tones, time · items, ₹, StatusBadge) and **Your products** (thumb, stock, ₹). Emerald **Need help?** card with Call / WhatsApp. |
| Account | `sections/ProfileTab.jsx` | Navy hero identity (gradient initial tile, name, shop, "✓ Verified partner" emerald pill); "Business details" DetailRows (Shop, Owner, Mobile, Email, Region "X, UP"); "Support" ActionRows; outlined rose "Log out" `h-12 rounded-2xl`. |
| Overlays | `NewOrderToast`, `CatalogSheet`, `EditListingSheet` | §4.5 |

### Admin & DR

| Route | File | Notes |
|---|---|---|
| `/admin/dashboard` | `pages/admin/AdminDashboard.jsx` (3,773 lines) + `WalletSettingsTab.jsx` | 13 tabs: Overview (5 gradient-edge KPIs + navy shortcuts banner), Registered Customers (stat trio, search, table, "🟢 Live Supabase DB" pill), District Reps, Vendors, Products, Listings & Approvals (amber pending count), Orders, Categories, Regions, Coupons, Banners, Wallet & Rewards (navy header card with status pill), Send Notifications (type picker cards offer / price / info). Mostly tables + modal forms. Some flows still use native `alert()` (`AdminDashboard.jsx:178`, WalletSettingsTab ×4). |
| `/dr/dashboard` | `pages/dr/DrDashboard.jsx` (2,454 lines) | District header chips; navy banner + glass metrics; tabs District Products / Master Catalog / Vendors / Listings & Approvals / District Orders; vendor and product modals. |

---

## 6. UX principles observed (implicit rules)

1. **Region first.** Every storefront session starts by choosing a district (blocking modal), and the region is always visible: header pill, "Best Offers in Varanasi", "N products in {region}", "Ready for site delivery in {region}". Region change re-prices the cart with an explanatory alert.
2. **Show the saving.** Every price is shown as ₹selling + ~~MRP~~ + % off + "Save ₹X", in emerald. Coupons, wallet and free delivery all surface as explicit green deductions. Free-delivery progress nudges basket size.
3. **Trust signals everywhere.** "100% Genuine", "Certified", "Verified Buyer", "Verified partner", COD emphasis, grievance officer in the footer, Live counts with pulsing green dots.
4. **COD as reassurance.** The single payment method is presented as a feature ("Pay on Site Arrival", "inspect materials before paying").
5. **Thumb-reach commerce.** Bottom tabs, sticky checkout bar, floating cart bar, 2-column product grid, horizontal rails with snap, `active:scale` press feedback.
6. **Immediate feedback, no page reloads.** Add → stepper morph + floating cart bar (7s); "Added to Cart ✓" (1.5s); copy → "Copied!"; optimistic status change with an in-flight indicator (vendor).
7. **Status = colour.** One colour per order status across badge, dot, tile wash, left edge, progress fill and select. The vendor app documents this explicitly (`format.js:5-6`). Pending is the "needs you" colour (coral) and pulses.
8. **Vendor app: "each fact once".** No redundant labels, whitespace instead of dividers, tap to reveal secondary facts (unit rate, full address), progressive folding of long lists (`OrderCard.jsx:9-18`, `OrderItems.jsx`).
9. **Respect the operator's attention.** New orders get a toast + sound + ring pulse + "waiting 2h" ageing; the hero CTA only appears when something is pending.
10. **Confirm destructive actions** (cancel order, delete address, logout in places) through the shared Confirm dialog. The confirm button is always rose.
11. **Android-native feel.** Hardware back closes sheets before navigating, splash on boot, no text selection, no tap highlight, offline page.

### Microcopy style

- Storefront: Title Case CTAs ending in "→"; SHOUTY uppercase micro-labels ("TOTAL AMOUNT", "UNLOCKED", "DAILY SPECIAL"); emoji prefixes; exclamation in empty states; Hinglish in a few helper texts.
- Vendor: sentence case, short verbs ("Add", "Save changes", "Clear filters", "View order"), no emoji, present-tense status ("Updating to processing").
- **Rebuild rule:** sentence-case system UI (the vendor voice). Keep uppercase only for eyebrow labels via CSS `uppercase`. Keep "→" for forward navigation CTAs. Remove emoji from controls.

### Formatting

- **Currency:** `₹` prefix with no space, `Number(x).toLocaleString("en-IN")`, so ₹1,23,456. Helper `inr()` (`vendor/ui/format.js:3`). Compact form for KPIs: `inrCompact` gives "₹1.68 L", "₹2.5 Cr" (`format.js:76-81`). Prices are rounded to whole rupees (`Math.round`); paise never shown. Negative adjustments shown as "− ₹X" / "- ₹X" (both minus glyphs are in use).
- **Dates/times:** always IST.
  - `formatDateTimeIST` → "12 Sept 2026, 02:45 pm" (`utils/formatId.js:23-40`).
  - Vendor `formatOrderTime` → "Just now", "12m ago", "2:45 PM", "Yesterday", "12 Sep", "12 Sep 25", with the full timestamp as a tooltip (`vendor/ui/time.js`).
  - `formatAge` → "8m / 3h / 2d".
  - Notifications → "Just now / Xm ago / Xh ago / Yesterday / Xd ago".
  - Overview date → "Saturday, 10 October" (`en-IN`).
  - Review date uses an unlocalised `toLocaleDateString()` (inconsistent).
- **IDs:** `#ORD-*ZXFK` (last 4 characters, masked; `formatShortId`), shown in `font-mono`.
- **Phone:** `+91` prefix, 10 digits, display "+91 99568 86527".
- **Ordinals:** "2nd order" (`ordinal()`).
- **Counts:** pluralised manually ("1 item / 2 items", "order is / orders are").
- **Language / i18n:** `<html lang="en">`. English only, no i18n library. Hinglish strings are hard-coded. Indian locale (`en-IN`) used for numbers and dates. **Rebuild:** introduce `next-intl` with `en-IN` now and leave room for `hi-IN`. Keep the Hinglish strings as `hi`-flavoured copy only if intentional.

---

## 7. Inconsistencies & design debt

### 7.1 Tokens & colour

- `navy-*` tokens are just slate shifted by one step (`navy-950 = slate-900`). The **real brand navies** (`#07132B`, `#0A192F`, `#0A1A3A`, `#0D224D`) are hard-coded hex in about 20 places.
- Undefined shades used: `brand-800`, `brand-900`, `navy-400`. They render with no colour, including the vendor active nav label (`VendorShell.jsx:63`).
- `brand-600/700` duplicated as `text-[#c2410c] hover:text-[#9a3412]` ×6.
- Two "selection" systems: storefront selection is **sky `#0284C7`/blue** (regions, categories, pack sizes) while vendor selection is **navy chip / brand**. Checkbox accent `#1E5FD9` matches neither.
- Pending status is **amber** in customer Orders, admin and DR, but **coral** in OrderDetail and vendor. `CONFIRMED`/`SHIPPED` exist only in customer maps.
- Discount shown as both **orange pill** ("18% OFF" on image) and **emerald text** ("(18% off)") on the same card.
- Error red uses both `red-*` (36) and `rose-*` (203).
- `--color-success` and `--color-warning` declared but unused (1 and 0 uses).
- `theme-color` meta `#F97316` (orange) vs StatusBar `#0A192F` (navy) vs splash `#0A0F1A`-ish.
- Android `styles.xml` references `@color/colorAccent`, which `colors.xml` does not define (it defines `brand_accent`).
- Adaptive icon background `#FFFFFF`, with a leftover teal `#26A69A` vector. The splash PNG shows a **white square** around the logo on navy.

### 7.2 Typography

- `font-black` (900) used 242× but Inter is loaded only to 800, so 900 is faux-bolded or clamped.
- 17 arbitrary pixel font sizes, including 8–9px text (illegible on phones) and 4.5–7.5px in the fake brand logos.
- Weight soup: the same role (card title) appears as `font-black`, `font-extrabold` or `font-bold` depending on the file.

### 7.3 Duplication & structure

- Pages are monoliths: AdminDashboard 3,773 lines, DrDashboard 2,454, ProductDetail 1,228, Checkout 1,182.
- `Navbar`, mobile back header, search bar, cart icon with badge, PinIcon / SearchIcon / CartIcon are re-implemented in about 6 pages. There are two different cart glyphs.
- Order STATUS maps in 4 files.
- Two `Button` components (`components/Button.jsx` vs vendor `Button`), two input components (`FormInput` vs `Field`), and inline inputs everywhere. Labels are styled at least 4 different ways.
- Free-delivery tracker, price summary, qty stepper, address form, coupon box and bulk-pack editor are each copy-pasted 2–3×.
- Mobile header strategy differs by page: brand header, back header, or the full Navbar with no back button. `OrderDetail` mounts **a second BottomNav** on top of the global one (`OrderDetail.jsx:316`). `CategoryListing` imports BottomNav without using it.
- 12 files use inline `style={{}}`, mostly legitimate dynamic values (progress width, carousel transform, `--i` stagger, tile bg). These should become CSS vars or `data-*` attributes.
- Dead code: `bannerSlides` and a 4s slider timer in `Categories.jsx`; `ScanIcon`, `PinIcon`, `ChevronIcon` unused there; unused keyframes (`splash-beam`, `delivery-beam`); unused images.

### 7.4 Motion

- Undefined `tailwindcss-animate` classes (`animate-in`, `fade-in`, `zoom-in-95`, `slide-in-from-*`) and `animate-fade-in` / `animate-slide-up`, so several modals, toasts and the floating cart bar pop in with no animation.
- Overuse of `animate-pulse` / `animate-ping` on badges and dots (cart count badges pulse forever).
- No reduced-motion handling outside the vendor app.

### 7.5 Accessibility

- **Contrast** (WCAG 2.x):

  | Pairing | Ratio | Result |
  |---|---|---|
  | `text-slate-400` #94A3B8 on white (186 uses, often for meaningful info: brand eyebrow, struck MRP, timestamps, labels) | 2.56:1 | Fails |
  | white on `bg-brand-500` #EA580C (primary buttons, 74 uses) | 3.56:1 | Fails AA for `text-xs`/`text-sm` |
  | `text-brand-500` links | 3.56:1 | Fails |
  | `#25D366` WhatsApp FAB with white glyph | 1.98:1 | Fails |
  | `bg-emerald-600` rating badge with white `text-xs` | 3.77:1 | Fails |
  | `text-coral-500` | 3.18:1 | Fails |
  | `brand-600` on white | 5.18:1 | Passes |
  | `coral-700` | 4.81:1 | Passes |
  | `slate-500` | 4.76:1 | Passes |

- **Tap targets.**
  - ProductCard stepper buttons are 28×28px (`w-7 h-7`); the "+ ADD" button is 32px high.
  - Cart steppers are 24px (`w-6 h-6`).
  - Notification dismiss ✕, location modal ✕, slider dots (6px tall) and the mobile region picker (11px text) are all small.
  - The vendor app consistently uses 44px (`h-11`).
- **Labels and semantics.**
  - Many inputs have no programmatic label: placeholder-only search fields; `<label>` without `htmlFor` in Checkout, Addresses, Register and Profile.
  - Icon-only buttons rely on `title` rather than `aria-label` (bell, cart link, back links, ✕).
  - Clickable `div`s are used for region rows (`FirstTimeLocationModal.jsx:196`) and notification items.
  - The star rating has no radio semantics.
- **Focus.**
  - A visible focus ring exists only in `[data-vendor-app]` and `[role="dialog"]` (`index.css:189-193`).
  - The storefront strips outlines (`outline-none`) with no replacement on most inputs and buttons.
  - Modals have no focus trap or Escape handling (except the vendor Sheet, which handles Escape).
- **Global `user-select: none`** blocks copying order IDs, addresses and phone numbers outside inputs. Order ID chips and referral code partly compensate with `select-all`.
- `lang="en"` while Hinglish text is present. No `lang` on those strings.
- Emoji used as the only icon carry no `aria-hidden` or label.
- The splash overlay at `z-[99999]` blocks input for at least 1.2s on every native launch.
- No `viewport-fit=cover`, so the safe-area insets are inert on iOS web.

### 7.6 Content / brand integrity

- Imitation third-party brand logos drawn in CSS (`Home.jsx:61-175`). Trademark risk.
- Fabricated testimonials and a fixed "⭐ 4.7 / 5.0" (`SiteReviewsSection.jsx`, `Home.jsx:701`).
- Fallback ratings ("4.9", "42 reviews") are hard-coded in `CategoryListing`/`SearchResults` mapping.
- When MRP is missing, ProductCard invents MRP = price × 1.2 and forces a discount of at least 5% (`ProductCard.jsx:33-39`). Shown as a UI claim; flagged for `idea.md` / legal.
- "Web Development" service card on a construction marketplace home page (off-brand).
- Play Store screenshots do not reflect the real UI.

---

## 8. Recommendations for the rebuild (Next.js App Router + TS + Tailwind v4)

### 8.1 Proposed `@theme` (drop-in `app/globals.css`)

Keeps every existing class name working (`brand-*`, `navy-*`, `coral-*`, `surface`) so ported markup renders identically. It fixes the gaps and adds semantic aliases for new code.

```css
@import "tailwindcss";

/* Fonts are loaded with next/font (see layout.tsx) and exposed as --font-inter */
@theme {
  /* ---------- Typography ---------- */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace;

  /* Micro sizes formalised from the old arbitrary values */
  --text-3xs: 0.625rem;   /* 10px  (was text-[10px]) */
  --text-3xs--line-height: 0.875rem;
  --text-2xs: 0.6875rem;  /* 11px  (was text-[11px]) */
  --text-2xs--line-height: 1rem;
  /* 9px and below are retired: map text-[9px]/[8px] -> text-3xs */

  /* ---------- Brand orange (Tailwind orange, shifted names kept) ---------- */
  --color-brand-50:  #FFF7ED;
  --color-brand-100: #FFEDD5;
  --color-brand-200: #FED7AA;
  --color-brand-300: #FDBA74;
  --color-brand-400: #F97316;
  --color-brand-500: #EA580C; /* primary fill (large text / icons only on white) */
  --color-brand-600: #C2410C; /* primary text & small-text buttons (5.18:1) */
  --color-brand-700: #9A3412;
  --color-brand-800: #7C2D12; /* was referenced but undefined */
  --color-brand-900: #431407; /* was referenced but undefined */

  /* ---------- Navy ---------- */
  /* Legacy names (= slate shifted) kept so ported classes still match */
  --color-navy-950: #0F172A;
  --color-navy-900: #1E293B;
  --color-navy-800: #334155;
  --color-navy-700: #475569;
  --color-navy-400: #94A3B8; /* was referenced but undefined */

  /* Real brand navies, previously hard-coded hex */
  --color-ink-950: #07132B; /* hero/footer base */
  --color-ink-900: #0A192F; /* app navy, status bar, dark CTA */
  --color-ink-800: #0A1A3A; /* gradient mid */
  --color-ink-700: #0D224D; /* gradient end, dark-button hover */

  /* ---------- Amber (hairline end, alerts on dark) ---------- */
  --color-amber-brand: #FBBF24;

  /* ---------- Coral: "needs you" / pending ---------- */
  --color-coral-50:  #FFF4F1;
  --color-coral-100: #FFE4DD;
  --color-coral-200: #FFC9BC;
  --color-coral-300: #FF9C87;
  --color-coral-500: #FF5533;
  --color-coral-600: #E8461F;
  --color-coral-700: #D23A1B;

  /* ---------- Semantic aliases (use these in new components) ---------- */
  --color-surface:        #F8FAFC;           /* page */
  --color-surface-raised: #FFFFFF;           /* cards */
  --color-surface-sunken: #F1F5F9;           /* inset fields, steppers */
  --color-line:           #E2E8F0;           /* slate-200 hairline */
  --color-line-soft:      #F1F5F9;           /* dividers */
  --color-fg:             #0F172A;           /* headings, prices */
  --color-fg-muted:       #475569;           /* body */
  --color-fg-subtle:      #64748B;           /* meta, min 4.5:1; replaces slate-400 for text */
  --color-primary:        var(--color-brand-600);
  --color-primary-fill:   var(--color-brand-500);
  --color-on-primary:     #FFFFFF;
  --color-accent-select:  #0284C7;           /* storefront selection blue, now a token */
  --color-success:        #047857;           /* emerald-700 text (5.48:1) */
  --color-success-fill:   #059669;
  --color-success-soft:   #ECFDF5;
  --color-warning:        #B45309;           /* amber-700 text */
  --color-warning-soft:   #FFFBEB;
  --color-danger:         #BE123C;           /* rose-700 */
  --color-danger-soft:    #FFF1F2;
  --color-promo:          #7E22CE;           /* purple-700 coupon tag */

  /* Order status (single source; Pending = coral everywhere) */
  --color-status-pending:    var(--color-coral-500);
  --color-status-processing: #0EA5E9; /* sky-500 */
  --color-status-dispatched: #6366F1; /* indigo-500 */
  --color-status-delivered:  #10B981; /* emerald-500 */
  --color-status-cancelled:  #FB7185; /* rose-400 */

  /* ---------- Radii ---------- */
  --radius-control: 0.75rem; /* 12px  rounded-xl  buttons/inputs */
  --radius-card:    1rem;    /* 16px  rounded-2xl cards/tiles/sheets */
  --radius-modal:   1.5rem;  /* 24px  rounded-3xl modals/hero */

  /* ---------- Shadows ---------- */
  --shadow-card:        0 2px 8px -2px rgb(15 23 42 / 0.05);
  --shadow-card-hover:  0 8px 24px -4px rgb(234 88 12 / 0.12);
  --shadow-panel:       0 1px 3px rgb(15 23 42 / 0.04), 0 8px 20px -8px rgb(15 23 42 / 0.06);
  --shadow-tile:        0 1px 2px rgb(15 23 42 / 0.06), 0 10px 28px -14px rgb(15 23 42 / 0.24);
  --shadow-tile-hover:  0 2px 4px rgb(15 23 42 / 0.06), 0 18px 40px -16px rgb(15 23 42 / 0.30);
  --shadow-bar-top:     0 -8px 30px rgb(15 23 42 / 0.08);
  --shadow-header:      0 4px 20px -4px rgb(15 23 42 / 0.06);
  --shadow-sheet:       0 32px 64px -16px rgb(15 23 42 / 0.35);
  --shadow-toast:       0 24px 48px -16px rgb(7 19 43 / 0.55);
  --shadow-hero:        0 18px 40px -24px rgb(7 19 43 / 0.60);
  --shadow-chip-active: 0 4px 12px -4px rgb(7 19 43 / 0.45);
  --shadow-primary:     0 1px 2px rgb(154 52 18 / 0.25), inset 0 1px 0 rgb(255 255 255 / 0.14);
  --shadow-primary-lg:  0 6px 16px -6px rgb(194 65 12 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.14);

  /* ---------- Motion ---------- */
  --ease-brand: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-pop:   cubic-bezier(0.16, 1, 0.30, 1);
  --animate-rise:   rise 0.42s var(--ease-brand) both;
  --animate-pop:    pop 0.30s var(--ease-brand) both;
  --animate-sheet:  sheet-up 0.42s var(--ease-brand) both;
  --animate-scrim:  fade 0.25s ease-out both;
  --animate-toast:  toast-in 0.40s var(--ease-brand) both;
  --animate-shimmer: shimmer 1.6s linear infinite;
  --animate-ring:   ring-pulse 1.8s ease-out infinite;
  --animate-locate: locate 1.4s var(--ease-brand) 2;
  --animate-indeterminate: indeterminate 1.2s var(--ease-brand) infinite;
  --animate-countdown: countdown 5s linear both;
  --animate-splash: splash-pulse 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

  @keyframes rise      { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes pop       { from { opacity: 0; transform: translateY(12px) scale(0.985); } to { opacity: 1; transform: none; } }
  @keyframes sheet-up  { from { transform: translateY(100%); } to { transform: none; } }
  @keyframes fade      { from { opacity: 0; } to { opacity: 1; } }
  @keyframes toast-in  { from { opacity: 0; transform: translateY(-14px) scale(0.98); } to { opacity: 1; transform: none; } }
  @keyframes shimmer   { from { background-position: 150% 0; } to { background-position: -50% 0; } }
  @keyframes ring-pulse { 0% { box-shadow: 0 0 0 0 rgb(251 191 36 / 0.55); } 70%, 100% { box-shadow: 0 0 0 7px rgb(251 191 36 / 0); } }
  @keyframes locate    { 0% { box-shadow: 0 0 0 0 rgb(234 88 12 / 0.28); } 100% { box-shadow: 0 0 0 14px rgb(234 88 12 / 0); } }
  @keyframes indeterminate { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
  @keyframes countdown { from { transform: scaleX(1); } to { transform: scaleX(0); } }
  @keyframes splash-pulse {
    0%, 100% { transform: scale(1);    filter: drop-shadow(0 0 20px rgb(234 88 12 / 0.45)); }
    50%      { transform: scale(1.06); filter: drop-shadow(0 0 45px rgb(249 115 22 / 0.75)); }
  }
}

/* ---------- Brand surfaces (utilities) ---------- */
@utility bg-hero {
  background-color: var(--color-ink-950);
  background-image:
    radial-gradient(120% 140% at 100% 0%, rgb(234 88 12 / 0.24) 0%, rgb(234 88 12 / 0) 48%),
    linear-gradient(100deg, var(--color-ink-950) 0%, var(--color-ink-800) 55%, var(--color-ink-700) 100%);
}
@utility bg-blueprint {
  background-image:
    linear-gradient(rgb(255 255 255 / 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 0.05) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(115deg, transparent 30%, #000 100%);
  pointer-events: none;
}
@utility bg-hairline {
  background-image: linear-gradient(90deg, var(--color-brand-600) 0%, var(--color-brand-400) 55%, var(--color-amber-brand) 100%);
}
@utility skeleton {
  background: linear-gradient(90deg, #F1F5F9 0%, #F8FAFC 50%, #F1F5F9 100%);
  background-size: 200% 100%;
  animation: var(--animate-shimmer);
}
@utility stagger {
  & > * { animation: var(--animate-rise); animation-delay: calc(min(var(--i, 0), 12) * 35ms); }
}
@utility no-scrollbar {
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

/* ---------- Base ---------- */
@layer base {
  html { -webkit-text-size-adjust: 100%; scrollbar-gutter: stable; overflow-x: clip; }
  body {
    background: var(--color-surface);
    color: var(--color-fg);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-tap-highlight-color: transparent;
  }
  /* Native shell only (set data-native on <html> from a client effect): app-like selection */
  html[data-native] body { -webkit-touch-callout: none; user-select: none; }
  html[data-native] :is(input, textarea, [contenteditable], .selectable, article) { user-select: text; }

  /* Global, visible focus (replaces the vendor-only rule) */
  :focus-visible { outline: 2px solid var(--color-brand-600); outline-offset: 2px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Also:

- Add `tw-animate-css` (the Tailwind v4 successor of `tailwindcss-animate`) for shadcn's `data-[state=open]:animate-in` utilities.
- Load Inter with `next/font/google`: `Inter({ subsets: ["latin"], weight: ["400","500","600","700","800","900"], variable: "--font-inter", display: "swap" })`. Alternatively, cap the UI at 800 and map `font-black` to `font-extrabold` during porting.
- Set `<meta name="theme-color" content="#0A192F">` and `viewport: { viewportFit: "cover" }` in `app/layout.tsx` (`export const viewport`).

### 8.2 Component library approach

**shadcn/ui (Radix primitives) + `class-variance-authority` + `tailwind-merge` + `lucide-react`**, themed by the tokens above. Ship the old vendor primitives' look as the shadcn variants.

| Old component | New (shadcn / Radix) | Variant / notes |
|---|---|---|
| `components/Button`, vendor `Button`, inline CTAs | `ui/button.tsx` (cva) | `variant`: primary (gradient brand + `shadow-primary`), dark (`bg-ink-900`), secondary, ghost, success, danger, link; `size`: sm h-9, md h-11, lg h-12, icon h-11 w-11. `asChild` replaces `as="a"`. Text on brand fills uses `brand-600` or ≥ 14px bold for contrast. |
| `FormInput`, vendor `Field`, inline inputs | `ui/input.tsx` + `ui/label.tsx` + `ui/form.tsx` (react-hook-form + zod, mirrors Server Action validation) | `InputGroup` with prefix (₹, +91) and suffix (%); `text-base sm:text-sm`; `h-11` |
| `SearchField`, navbar/home search | `components/search-box.tsx` (client) over `Input` | Submits to `/search?q=` with `<form action>`; `type="search"`, `aria-label` |
| OTP input | `input-otp` (shadcn `InputOTP`) | 6 slots, `autoComplete="one-time-code"`, `inputMode="numeric"`; keeps the letter-spaced look via slot styling |
| Phone input | `components/phone-input.tsx` | `+91` prefix, digits only |
| Checkbox / radio / native accent | `ui/checkbox.tsx`, `ui/radio-group.tsx` | Brand-600 checked state; region and address lists become `RadioGroup` (fixes clickable divs) |
| Toggle (bulk rates) | `ui/switch.tsx` | brand-500 on / slate-300 off, h-6 w-11 |
| Sort `<select>`, vendor `StatusControl` | `ui/select.tsx` | StatusControl keeps the tinted trigger with "● Status" inset label |
| `Card`, KPI `Stat`, admin KPI | `ui/card.tsx` + `components/stat-card.tsx` | Tone prop (emerald / amber / sky / indigo) with top edge |
| `StatusBadge`, `ApprovalBadge`, pills | `ui/badge.tsx` (cva) | `tone`: neutral, brand, success, warning, danger, info, promo, plus `status=` from one `ORDER_STATUS` map in `lib/order-status.ts` |
| `CountBadge` | `Badge size="count"` | 99+ |
| `Chip`, `ChipRow` | `ui/toggle-group.tsx` (type="single") + a scroll container | `aria-pressed` handled by Radix |
| `Segmented` | `ui/tabs.tsx` (TabsList with sliding indicator) | |
| Orders / admin / DR / legal tab bars | `ui/tabs.tsx` or **route segments** (`/admin/[section]`) | Prefer URLs over local state so back and deep links work |
| `Sheet` (vendor), mobile filter sheet, address modals | `ui/sheet.tsx` (Radix Dialog) side="bottom" on mobile, plus **`ui/drawer.tsx` (vaul)** for swipe-to-dismiss on phones; `ui/dialog.tsx` from `sm` up (responsive `ResponsiveDialog` wrapper) | Focus trap and Escape come built in; keep `hero` header variant (`bg-hero bg-blueprint`) |
| `AlertContext` showAlert / showConfirm | `ui/alert-dialog.tsx` + `useConfirm()` promise hook | Confirm button variant per intent (danger only for destructive) |
| FirstTimeLocationModal | `Dialog` (non-dismissible until chosen) + `Command` (cmdk) list for search | Region rows are `RadioGroup` items |
| NotificationPanel | `ui/popover.tsx` (desktop) / `Sheet` (mobile) + `Tabs` | List items are `<button>`/`<Link>` |
| In-app toast, NewOrderToast | `sonner` (`ui/sonner.tsx`) with a custom "hero" toast | Keep 5–6s duration, countdown hairline, `aria-live` |
| FloatingCartBar | `components/cart/floating-cart-bar.tsx` (client) | Same gradient pill; respect reduced motion |
| ProductImageSlider, Home carousel | `ui/carousel.tsx` (Embla) | Autoplay plugin 5s, dots, arrows; `aspect-[5/2]` |
| Horizontal rails | `ui/scroll-area.tsx` or plain `overflow-x-auto snap-x no-scrollbar` | |
| Skeletons (`animate-pulse`, `.vd-skeleton`) | `ui/skeleton.tsx` using the `skeleton` utility (shimmer) | |
| `Spinner` | `ui/spinner.tsx` | |
| `EmptyState` (vendor) + storefront emoji empties | `components/empty-state.tsx` | Lucide icon in a tinted tile (vendor look) |
| Tables (admin) | `ui/table.tsx` + `@tanstack/react-table` (`data-table.tsx`) | Sticky header, pagination |
| Pagination | `ui/pagination.tsx` | |
| Breadcrumbs | `ui/breadcrumb.tsx` | |
| ProgressTrack / customer stepper | `components/orders/order-progress.tsx` | One component, two sizes (compact / detailed) |
| Free-delivery tracker | `components/cart/free-delivery-meter.tsx` using `ui/progress.tsx` | |
| Price summary / bill | `components/cart/price-summary.tsx` | Shared by Cart, Checkout, OrderDetail |
| Qty stepper | `components/cart/quantity-stepper.tsx` | Min 40px targets (44px preferred) |
| ProductCard | `components/catalog/product-card.tsx` (Server) + `add-to-cart-button.tsx` (Client island) | |
| Logo | `components/brand/logo.tsx` + `logo-mark.svg` (from `buildcity-purana-logo.svg`) | `variant`, `size`, `iconOnly`, `hideSubtitle` |
| Icons | `lucide-react` | stroke 1.75 / 2 active |
| Charts (WeeklyActivity) | Keep custom (tiny), or `ui/chart.tsx` (Recharts) | |
| ErrorBoundary | `app/**/error.tsx` + `global-error.tsx`; `not-found.tsx`; `loading.tsx` | |
| SplashScreen | Native splash via `@capacitor/splash-screen` (no React overlay) | Navy `#0A192F` + transparent mark (fix the white box) |

### 8.3 Folder structure (UI)

```
app/
  layout.tsx                      # <html lang="en-IN">, Inter, theme-color, viewport-fit=cover, <Toaster/>
  globals.css                     # §8.1
  (storefront)/
    layout.tsx                    # StorefrontShell: <SiteHeader/>, <BottomNav/>, <FloatingCartBar/>, <LocationGate/>
    page.tsx                      # Home
    categories/page.tsx
    category/[slug]/page.tsx
    product/[id]/page.tsx
    search/page.tsx
    cart/page.tsx
    (legal)/[policy]/page.tsx     # privacy | terms | refund | shipping (+ redirects for aliases in next.config)
  (account)/                      # customer, auth-guarded in layout.tsx (server redirect)
    layout.tsx
    checkout/page.tsx             # hides BottomNav via layout prop/segment
    orders/page.tsx
    orders/[id]/page.tsx
    profile/page.tsx
    addresses/page.tsx
  (auth)/
    layout.tsx                    # AuthShell (split panel)
    login/page.tsx
    register/page.tsx
  partner/                        # vendor app (was /vendor/*); keep /vendor/* redirects
    login/page.tsx
    (app)/layout.tsx              # PartnerShell: sidebar md+, top bar + bottom tabs
    (app)/orders/page.tsx
    (app)/products/page.tsx
    (app)/overview/page.tsx
    (app)/account/page.tsx
    (app)/@modal/(.)catalog/page.tsx   # intercepting route for the catalogue sheet (optional)
  admin/
    layout.tsx                    # AdminShell (sidebar or top tabs as route links)
    [section]/page.tsx            # overview | customers | drs | vendors | products | listings | orders | categories | regions | coupons | banners | wallet | notifications
  dr/
    layout.tsx
    [section]/page.tsx
components/
  ui/                             # shadcn primitives (button, input, dialog, sheet, drawer, tabs, badge, ...)
  brand/                          # logo, logo-mark, hero-surface, hairline
  layout/                         # site-header, mobile-header (brand | back variants), bottom-nav, footer, partner-shell, admin-shell
  catalog/                        # product-card, product-grid, product-rail, category-tile, brand-chip, pack-selector, image-gallery, filter-panel
  cart/                           # quantity-stepper, add-to-cart-button, floating-cart-bar, free-delivery-meter, price-summary, coupon-box
  orders/                         # order-tile, order-card (partner), status-badge, order-progress, order-items, order-address, status-control
  region/                         # region-picker, location-dialog
  notifications/                  # notification-bell, notification-panel, toasts
  account/                        # address-form, address-card, wallet-passbook, referral-card
  feedback/                       # empty-state, error-state, skeletons, spinner, confirm-dialog (useConfirm)
lib/
  format.ts                       # inr, inrCompact, formatDateTimeIST, formatOrderTime, formatAge, formatShortId, ordinal
  order-status.ts                 # single ORDER_STATUS map (labels + classes)
  cn.ts                           # clsx + tailwind-merge
  native.ts                       # isNative(), isPartnerApp(), back-button + status-bar helpers (client only)
hooks/                            # use-back-button.ts, use-count-up.ts, use-now.ts, use-media-query.ts
```

### 8.4 Server vs Client components

| Server (RSC, default) | Client (`"use client"`) |
|---|---|
| All `page.tsx`, shells' static frames, Footer, Logo, breadcrumbs, legal pages | `BottomNav` and `SiteHeader` active state (`usePathname`); split them so only the nav link list is client |
| ProductCard shell, product grids and rails, category tiles, brand chips, PDP info / specs / description, reviews list | `AddToCartButton` / `QuantityStepper`, `FloatingCartBar`, cart badge count |
| Orders list and tiles, OrderDetail, status badges, progress (pure render), price summary (when given data) | Home carousel, image gallery (Embla), rails needing drag |
| Partner Products / Overview data fetch; KPI values (CountUp island wraps only the number) | `RegionPicker` + `LocationDialog`, `NotificationBell` / `Panel`, toasts |
| Admin tables' initial data | Search box (debounce, router push), filter panel, sort select |
| Empty states, skeletons in `loading.tsx` | Forms using Server Actions with `useActionState`/`useFormStatus` (login OTP, register, address, coupon, checkout, partner listing edit, status change) |
| | Partner OrderCard interactive parts (StatusControl, address "more", items fold), Partner shell nav indicator, NewOrderToast + sound (realtime via SSE / Web Push) |
| | `useBackButton` (Capacitor App plugin), StatusBar setup, `html[data-native]` setter, `useConfirm` |

**Server Actions:** add-to-cart (if the cart is server-side), apply/remove coupon, place order, update order status, create/update listing, address CRUD, profile edit, OTP send/verify.

- Pair them with optimistic UI (`useOptimistic`) to keep today's instant feedback: stepper morph, "Updating to …" bar.

### 8.5 Mobile / Capacitor considerations

- **Hosting model.** The Partner app currently loads `https://www.buildcity.in/vendor/login` remotely (see `offline.html` and the `server.errorPath` comment).
  - With Next.js on Coolify, keep the **remote-URL WebView** model: `server.url` per flavor. Static export is incompatible with Server Actions.
  - Ship `offline.html` as the `errorPath`.
  - Mark native sessions with the existing UA marker (`BuildCityPartner`) and a customer marker, then read it server-side (`headers()`) to pick the shell. Do not use client-only checks; they flash the wrong UI.
- **Safe areas.** Set `viewportFit: "cover"`. Apply `pt-[env(safe-area-inset-top)]` to sticky headers when `overlaysWebView` is true; today it is false, but plan for edge-to-edge on Android 15+. Keep the `pb-[max(0.25rem,env(safe-area-inset-bottom))]` on bottom bars.
- **Status bar.** `#0A192F`, light icons. Set it via `@capacitor/status-bar` at runtime, and on Android 15 edge-to-edge paint a navy strip behind the header.
- **Splash.** Use `@capacitor/splash-screen` with `backgroundColor: "#0A192F"` and a transparent roof mark, fixing the white square. Remove the React splash overlay (it blocks input for at least 1.2s).
- **Hardware back.** A `useBackButton` hook with a stack: close Drawer / Dialog → step back in tabs (now routes) → exit on root routes (`/`, `/login`, `/partner/login`, `/partner/orders`).
- **Tap targets and keyboard.**
  - Minimum 44×44px for all controls. Steppers: 40px buttons in a 44px row.
  - Inputs `text-base` on mobile to prevent iOS zoom.
  - `inputMode` and `autoComplete` set on phone, OTP, pincode and price fields.
- **Text selection.** Restrict `user-select: none` to native builds (`html[data-native]`), and keep IDs, addresses and phones selectable (`.selectable`).
- **Push and notifications.** Keep the order alert sound and NewOrderToast; route taps to `/partner/orders?highlight=<id>` so `vd-locate` can run from the URL.
- **Performance on low-end Android.**
  - `next/image` for all product and category images (AVIF/WebP, sizes for 2-col grids).
  - Lazy-load rails.
  - Avoid `backdrop-blur-xl` stacks on the bottom nav plus floating bar plus header together. Fall back to `bg-white/95` when `prefers-reduced-transparency` is set or on native.

### 8.6 Accessibility baseline (definition of done)

1. **Contrast AA.** Text uses `fg`, `fg-muted` and `fg-subtle` (≥ 4.5:1). Retire `text-slate-400` for meaningful text (OK for disabled and decorative). Primary buttons with `text-sm` use `bg-brand-600` (or keep `brand-500` fills only with ≥ 18px bold or 14px bold + large-text sizing). Links use `brand-600`. WhatsApp FAB: white glyph on `#128C7E` (passes) instead of `#25D366`.
2. **Minimum font size 11px** (`text-2xs`). Nothing below 10px.
3. **Targets ≥ 44px** (WCAG 2.5.8 needs at least 24px; aim for 44px as the vendor app does).
4. **Every input has a `<Label htmlFor>`**. Search fields have `aria-label`. Errors are linked by `aria-describedby` and announced (`role="alert"`).
5. **Icon-only controls have `aria-label`.** Emoji used decoratively get `aria-hidden`. Prefer Lucide icons in controls.
6. **Dialogs, sheets and popovers** via Radix: focus trap, Escape, focus return, `aria-labelledby`. The location gate may block Escape but must still trap focus and label itself.
7. **Visible focus ring everywhere** (`:focus-visible` 2px `brand-600`, offset 2px). Never `outline-none` without a replacement.
8. **Semantics.** Lists as `ul/li`; clickable rows as `button`/`Link`; region/address pickers as `RadioGroup`; tabs as `Tabs`; star rating as `RadioGroup`; order progress with a text equivalent ("Step 2 of 4: Processing").
9. **Live regions** for cart count changes, toasts, "Updating to …" and resend countdowns (polite).
10. **Motion.** Honour `prefers-reduced-motion` globally (§8.1). No infinite pulses on persistent badges; limit `animate-ping` to transient states.
11. **Language.** `<html lang="en-IN">`; wrap Hindi or Hinglish strings in `lang="hi-Latn"` if kept.
12. **Status is never colour-only.** Badges keep a text label plus an icon (dot / ✓ / ×), as the vendor badges already do.
13. Run automated checks (`@axe-core/playwright`) on Home, PDP, Cart, Checkout, Orders, Partner Orders, and the Admin listings in CI.

### 8.7 Porting checklist (look and feel parity)

- [ ] Tokens from §8.1; remove every `[#hex]` in favour of `ink-*`, `brand-*`, `accent-select`.
- [ ] One `ORDER_STATUS` map with Pending = coral; customer, partner and admin share `StatusBadge`.
- [ ] Storefront mobile header variants (brand / back) as one `MobileHeader` component with a `variant` prop, used on **every** storefront page. The desktop `SiteHeader` only at `lg` and up.
- [ ] BottomNav (5 tabs) and Partner bottom tabs (4) with the same safe-area handling; remove the duplicate BottomNav in OrderDetail.
- [ ] ProductCard pixel parity: square image, 2-line title, price row, unit / save chips, h-8→h-10 CTA morphing to a stepper.
- [ ] Navy hero + blueprint + hairline as brand utilities; reuse them on Partner Overview / Account, the location dialog header, promo banners and the auth side panel.
- [ ] Motion set (§2.14) mapped to tokens; fix the broken `animate-in` usages via `tw-animate-css`.
- [ ] Replace fake brand logos and demo testimonials before launch (§7.6).
- [ ] Regenerate the Play Store screenshots and feature graphic from the rebuilt UI.
