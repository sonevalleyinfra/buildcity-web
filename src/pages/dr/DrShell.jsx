import Logo from "../../components/Logo";
import {
  OrdersIcon,
  PackageIcon,
  BadgeCheckIcon,
  StoreIcon,
  PlusIcon,
  MapPinIcon,
  RupeeIcon,
  ChevronRightIcon,
  BellIcon,
  UserIcon,
} from "../vendor/ui/icons";
import { CountUp } from "../vendor/ui/primitives";
import { cx, inr, inrCompact } from "../vendor/ui/format";
import "../vendor/vendor.css";

const initialOf = (name) => (name || "D").trim().charAt(0).toUpperCase();

export const RotateCcwIcon = ({ className = "w-5 h-5", strokeWidth = 1.75 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

export const EditIcon = ({ className = "w-4 h-4", strokeWidth = 1.75 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const TrashIcon = ({ className = "w-4 h-4", strokeWidth = 1.75 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const DR_TABS = [
  { key: "orders", label: "Orders", icon: OrdersIcon },
  { key: "listings", label: "Approvals", icon: BadgeCheckIcon },
  { key: "vendors", label: "Vendors", icon: StoreIcon },
  { key: "products", label: "Catalog", icon: PackageIcon },
  { key: "returns", label: "Returns", icon: RotateCcwIcon },
];

const SIDEBAR_TABS = [
  ...DR_TABS,
  { key: "profile", label: "Account", icon: UserIcon },
];

const STAT_TONES = {
  emerald: { chip: "bg-emerald-50 text-emerald-600 ring-emerald-600/15", edge: "bg-emerald-500", hover: "hover:border-emerald-200" },
  amber: { chip: "bg-amber-50 text-amber-600 ring-amber-600/15", edge: "bg-amber-400", hover: "hover:border-amber-200" },
  sky: { chip: "bg-sky-50 text-sky-600 ring-sky-600/15", edge: "bg-sky-500", hover: "hover:border-sky-200" },
  indigo: { chip: "bg-indigo-50 text-indigo-600 ring-indigo-600/15", edge: "bg-indigo-500", hover: "hover:border-indigo-200" },
};

function CountBadge({ count, tone = "bg-brand-600 text-white", className = "" }) {
  if (!count) return null;
  return (
    <span className={cx("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums", tone, className)}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function StatCard({ icon: IconCmp, label, value, format, note, noteClass = "text-slate-500", onClick, index, tone = "sky" }) {
  const Tag = onClick ? "button" : "div";
  const t = STAT_TONES[tone];
  return (
    <Tag
      {...(onClick ? { type: "button", onClick } : {})}
      style={{ "--i": index }}
      className={cx(
        "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 text-left",
        onClick && `transition-[border-color,box-shadow,transform] duration-200 ${t.hover} hover:shadow-[0_12px_28px_-18px_rgba(15,23,42,0.25)] active:scale-[0.98] cursor-pointer`
      )}
    >
      <span className={cx("absolute inset-x-0 top-0 h-0.5", t.edge)} aria-hidden="true" />
      <div className="flex items-center gap-2 text-slate-500">
        <span className={cx("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", t.chip)}>
          <IconCmp className="h-4 w-4" />
        </span>
        <span className="flex-1 truncate text-xs font-medium">{label}</span>
        {onClick && <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-slate-500" />}
      </div>
      <p className="mt-2 truncate text-lg sm:text-xl font-semibold tabular-nums tracking-tight text-slate-900 md:text-2xl">
        <CountUp value={value} format={format} />
      </p>
      {note && <p className={cx("mt-1 truncate text-[11px] sm:text-xs", noteClass)}>{note}</p>}
    </Tag>
  );
}

export default function DrShell({
  drName,
  drPhone,
  districtName,
  activeTab,
  onTabChange,
  stats,
  onAddVendor,
  onAddProduct,
  onOpenPendingApprovals,
  modals,
  children,
}) {
  const normalizedTab = activeTab === "masterCatalog" ? "products" : activeTab;
  const activeIndex = Math.max(0, DR_TABS.findIndex((t) => t.key === normalizedTab));
  const sidebarActiveIndex = Math.max(0, SIDEBAR_TABS.findIndex((t) => t.key === normalizedTab));

  const {
    districtRevenue = 0,
    totalOrdersCount = 0,
    activeOrdersCount = 0,
    totalVendorsCount = 0,
    approvedVendorsCount = 0,
    totalProductsCount = 0,
    pendingApprovalsCount = 0,
    returnsCount = 0,
  } = stats || {};

  return (
    <div data-vendor-app className="min-h-dvh bg-slate-50 text-slate-900">
      {/* Desktop Left Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <span className="vd-hairline h-0.5 shrink-0" aria-hidden="true" />
        <div className="flex h-16 items-center gap-2 px-5">
          <Logo size="sm" hideSubtitle />
          <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 ring-1 ring-inset ring-brand-600/15">
            DR Partner
          </span>
        </div>

        <button
          type="button"
          onClick={() => onTabChange("profile")}
          className="vd-hero relative mx-3 mb-4 overflow-hidden rounded-xl px-3.5 py-3 text-left text-white transition-transform active:scale-[0.99] cursor-pointer"
        >
          <span className="vd-blueprint absolute inset-0" aria-hidden="true" />
          <p className="relative truncate text-sm font-semibold" title={drName}>
            {drName}
          </p>
          <p className="relative mt-0.5 flex items-center gap-1 truncate text-xs text-slate-300">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-brand-400" />
            {districtName} District
          </p>
          {drPhone && (
            <p className="relative mt-0.5 truncate text-[11px] text-slate-400 tabular-nums">
              {drPhone}
            </p>
          )}
        </button>

        <nav aria-label="Main" className="relative flex-1 space-y-0.5 px-3">
          <span
            aria-hidden="true"
            className="absolute left-3 right-3 top-0 h-11 rounded-xl bg-brand-50 ring-1 ring-inset ring-brand-600/10 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateY(calc(${sidebarActiveIndex} * (2.75rem + 0.125rem)))` }}
          />
          {SIDEBAR_TABS.map(({ key, label, icon: TabIcon }) => {
            const active = normalizedTab === key;
            const badgeCount =
              key === "orders"
                ? activeOrdersCount
                : key === "listings"
                ? pendingApprovalsCount
                : 0;
            const badgeTone =
              key === "listings"
                ? "bg-amber-500 text-white"
                : "bg-brand-600 text-white";

            return (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative z-10 flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-200 cursor-pointer",
                  active ? "text-brand-800" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <TabIcon
                  className={cx("h-5 w-5 transition-colors duration-200", active ? "text-brand-600" : "text-slate-400")}
                  strokeWidth={active ? 2 : 1.75}
                />
                <span className="flex-1 text-left">{label}</span>
                <CountBadge count={badgeCount} tone={badgeTone} />
              </button>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={onAddVendor}
            className="group flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 text-xs font-semibold text-white shadow-[0_6px_16px_-6px_rgba(194,65,12,0.55),inset_0_1px_0_rgba(255,255,255,0.14)] transition-[filter,transform] hover:brightness-105 active:scale-[0.98] cursor-pointer"
          >
            <PlusIcon className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" strokeWidth={2.25} />
            Add Vendor
          </button>
          <button
            type="button"
            onClick={onAddProduct}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-200/80 transition-colors hover:bg-slate-200/80 active:scale-[0.98] cursor-pointer"
          >
            <PlusIcon className="h-4 w-4 text-slate-600" strokeWidth={2} />
            Add Listing
          </button>
        </div>
      </aside>

      {/* Mobile Sticky Top Header — Clean Vendor-style with Profile Avatar button on right */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <span className="vd-hairline block h-0.5" aria-hidden="true" />
        <div className="flex h-14 items-center gap-2.5 px-4">
          <Logo size="sm" iconOnly />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[15px] font-semibold text-slate-900">{drName}</p>
            <p className="flex items-center gap-1 truncate text-xs text-slate-500">
              <MapPinIcon className="h-3 w-3 shrink-0 text-brand-500" />
              {districtName} District
            </p>
          </div>
          <button
            type="button"
            onClick={() => onTabChange("profile")}
            aria-label="DR Account"
            title="DR Account & Logout"
            className={cx(
              "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors cursor-pointer",
              normalizedTab === "profile"
                ? "bg-gradient-to-br from-brand-500 to-amber-500 text-white ring-2 ring-brand-200"
                : "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-100"
            )}
          >
            {initialOf(drName)}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-6xl px-3.5 pb-28 pt-4 sm:px-6 md:pb-12 md:pt-7 lg:px-8 space-y-4 md:space-y-5">
          {/* Show KPI Stat Cards, Pending Approval Alert & Quick Actions ONLY on the Orders tab */}
          {normalizedTab === "orders" && (
            <>
              {pendingApprovalsCount > 0 && (
                <button
                  type="button"
                  onClick={onOpenPendingApprovals}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-amber-300/60 bg-amber-50/90 px-4 py-3 text-left transition-all duration-200 hover:bg-amber-100/80 active:scale-[0.99] cursor-pointer"
                >
                  <span className="vd-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-navy-950">
                    <BellIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs sm:text-sm font-semibold text-amber-950">
                      {pendingApprovalsCount} vendor {pendingApprovalsCount === 1 ? "listing is" : "listings are"} waiting for approval
                    </span>
                    <span className="block text-[11px] text-amber-800/80">
                      Tap to review and approve products for {districtName} storefront
                    </span>
                  </span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-amber-700 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              )}

              <div className="vd-stagger grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                <StatCard
                  index={0}
                  tone="emerald"
                  icon={RupeeIcon}
                  label="District revenue"
                  value={districtRevenue}
                  format={(n) => (n >= 1000000 ? inrCompact(n) : inr(n))}
                  note="Delivered & completed"
                  noteClass="text-emerald-600"
                />
                <StatCard
                  index={1}
                  tone="amber"
                  icon={OrdersIcon}
                  label="District orders"
                  value={totalOrdersCount}
                  note={activeOrdersCount > 0 ? `${activeOrdersCount} active in progress` : "All orders settled"}
                  noteClass={activeOrdersCount > 0 ? "font-medium text-brand-700" : "text-slate-500"}
                />
                <StatCard
                  index={2}
                  tone="sky"
                  icon={StoreIcon}
                  label="District vendors"
                  value={totalVendorsCount}
                  note={`${approvedVendorsCount} approved partners`}
                  noteClass="text-sky-700"
                  onClick={() => onTabChange("vendors")}
                />
                <StatCard
                  index={3}
                  tone="indigo"
                  icon={BadgeCheckIcon}
                  label="Product listings"
                  value={totalProductsCount}
                  note={pendingApprovalsCount > 0 ? `${pendingApprovalsCount} pending review` : "All listings reviewed"}
                  noteClass={pendingApprovalsCount > 0 ? "font-medium text-amber-700" : "text-emerald-600"}
                  onClick={onOpenPendingApprovals}
                />
              </div>

              {/* Mobile Quick Actions Row on Orders tab (moved out of header) */}
              <div className="grid grid-cols-2 gap-2.5 md:hidden">
                <button
                  type="button"
                  onClick={onAddVendor}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-3 text-xs font-semibold text-white shadow-[0_6px_16px_-6px_rgba(194,65,12,0.5),inset_0_1px_0_rgba(255,255,255,0.14)] active:scale-[0.98] cursor-pointer"
                >
                  <PlusIcon className="h-4 w-4" strokeWidth={2.25} />
                  Add Vendor
                </button>
                <button
                  type="button"
                  onClick={onAddProduct}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 active:scale-[0.98] cursor-pointer"
                >
                  <PlusIcon className="h-4 w-4 text-slate-600" strokeWidth={2.25} />
                  Add Listing
                </button>
              </div>
            </>
          )}

          {/* Active Tab View */}
          <div key={activeTab} className="vd-page">
            {children}
          </div>
        </div>
      </main>

      {modals}

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="relative mx-auto grid max-w-lg grid-cols-5">
          <span
            aria-hidden="true"
            className="absolute top-0 left-0 flex h-0.5 w-1/5 justify-center transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          >
            <span className="h-full w-8 rounded-full bg-brand-600" />
          </span>
          {DR_TABS.map(({ key, label, icon: TabIcon }) => {
            const active = normalizedTab === key;
            const badgeCount =
              key === "orders"
                ? activeOrdersCount
                : key === "listings"
                ? pendingApprovalsCount
                : 0;
            const badgeTone =
              key === "listings"
                ? "bg-amber-500 text-white"
                : "bg-brand-600 text-white";

            return (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors cursor-pointer",
                  active ? "text-brand-700" : "text-slate-400 active:text-slate-600"
                )}
              >
                <span className={cx("relative transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]", active && "-translate-y-0.5")}>
                  <TabIcon className={cx("h-5 w-5 transition-colors duration-200", active && "text-brand-600")} strokeWidth={active ? 2 : 1.75} />
                  {badgeCount > 0 && (
                    <CountBadge count={badgeCount} tone={badgeTone} className="absolute -right-3 -top-1.5 ring-2 ring-white" />
                  )}
                </span>
                <span className="truncate max-w-full px-1">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
