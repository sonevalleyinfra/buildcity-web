import { useEffect, useState } from "react";
import Logo from "../../components/Logo";
import {
  BadgeCheckIcon,
  CloseIcon,
  GridIcon,
  ImageIcon,
  LayersIcon,
  LogOutIcon,
  MapIcon,
  MegaphoneIcon,
  MenuIcon,
  PackageIcon,
  PinIcon,
  ReceiptIcon,
  StoreIcon,
  TagIcon,
  UsersIcon,
  WalletIcon,
} from "../../components/ui/Icons";

// Ids are the same strings AdminDashboard uses for its `tab` state.
const ADMIN_NAV = [
  { group: null, items: [{ id: "Overview", label: "Overview", icon: GridIcon }] },
  {
    group: "Operations",
    items: [
      { id: "Orders", label: "Orders", icon: ReceiptIcon },
      { id: "Listings", label: "Listings & approvals", icon: BadgeCheckIcon },
    ],
  },
  {
    group: "People",
    items: [
      { id: "Users", label: "Customers", icon: UsersIcon },
      { id: "District Reps (DR)", label: "District reps", icon: PinIcon },
      { id: "Vendors", label: "Vendors", icon: StoreIcon },
    ],
  },
  {
    group: "Catalog",
    items: [
      { id: "Products", label: "Master products", icon: PackageIcon },
      { id: "Categories", label: "Categories", icon: LayersIcon },
      { id: "Regions", label: "Regions", icon: MapIcon },
    ],
  },
  {
    group: "Growth",
    items: [
      { id: "Coupons", label: "Coupons", icon: TagIcon },
      { id: "Banners", label: "Banners", icon: ImageIcon },
      { id: "Wallet & Rewards", label: "Wallet & rewards", icon: WalletIcon },
      { id: "Notifications", label: "Send notifications", icon: MegaphoneIcon },
    ],
  },
];

const ALL_ITEMS = ADMIN_NAV.flatMap((g) => g.items);

function Badge({ count, tone }) {
  if (!count) return null;
  return (
    <span
      className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
        tone === "amber" ? "bg-amber-100 text-amber-800" : tone === "brand" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
      }`}
    >
      {count > 999 ? "999+" : count}
    </span>
  );
}

function NavList({ tab, onSelect, badges }) {
  return (
    <nav aria-label="Admin sections" className="space-y-5">
      {ADMIN_NAV.map((g) => (
        <div key={g.group || "top"}>
          {g.group && <p className="mb-1.5 px-3 text-xs font-medium text-slate-400">{g.group}</p>}
          <ul className="space-y-0.5">
            {g.items.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              const b = badges?.[id];
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onSelect(id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors cursor-pointer ${
                      active ? "bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-600/10" : "text-slate-600 hover:bg-slate-100 hover:text-navy-950"
                    }`}
                  >
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-brand-600" : "text-slate-400"}`} strokeWidth={active ? 2 : 1.8} />
                    <span className="truncate">{label}</span>
                    {b && <Badge count={b.count} tone={b.tone} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserFooter({ user, onLogout }) {
  const name = user?.name || "Admin";
  return (
    <div className="flex items-center gap-3 border-t border-slate-100 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-950 text-sm font-semibold text-white">
        {name.trim()[0]?.toUpperCase() || "A"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-navy-950">{name}</p>
        <p className="text-xs text-slate-500">Super admin</p>
      </div>
      <button
        type="button"
        onClick={onLogout}
        aria-label="Logout"
        title="Log out"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
      >
        <LogOutIcon className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}

// Super admin layout: left sidebar on desktop, a top bar + slide-in menu on phones/tablets.
export default function AdminShell({ tab, onTabChange, user, onLogout, badges, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const current = ALL_ITEMS.find((i) => i.id === tab) || ALL_ITEMS[0];

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const select = (id) => {
    onTabChange(id);
    setMenuOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" });
  };

  const attention = (badges?.Listings?.count || 0) + (badges?.Orders?.count || 0);

  return (
    <div data-storefront className="min-h-dvh bg-slate-50 text-navy-950 font-sans">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-2 px-5">
          <Logo size="sm" hideSubtitle />
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">Admin</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4 pt-1">
          <NavList tab={tab} onSelect={select} badges={badges} />
        </div>
        <UserFooter user={user} onLogout={onLogout} />
      </aside>

      {/* Phone / tablet top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md lg:hidden">
        <div className="flex h-14 items-center gap-2 px-2 sm:px-4">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-navy-950 hover:bg-slate-100 cursor-pointer"
          >
            <MenuIcon className="h-5 w-5" />
            {attention > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" aria-hidden="true" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight">{current.label}</p>
            <p className="text-xs leading-tight text-slate-500">Super admin</p>
          </div>
          <Logo size="sm" iconOnly />
        </div>
      </header>

      {/* Slide-in menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="bc-fade-in absolute inset-0 bg-slate-950/50" onClick={() => setMenuOpen(false)} />
          <div className="bc-drawer-in absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col bg-white shadow-2xl">
            <div className="flex h-14 shrink-0 items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <Logo size="sm" hideSubtitle />
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">Admin</span>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4 pt-2">
              <NavList tab={tab} onSelect={select} badges={badges} />
            </div>
            <div className="pb-[env(safe-area-inset-bottom)]">
              <UserFooter user={user} onLogout={onLogout} />
            </div>
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div key={tab} className="bc-fade-in mx-auto w-full max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

