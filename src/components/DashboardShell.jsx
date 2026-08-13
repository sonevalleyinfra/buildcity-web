import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

export default function DashboardShell({ badge, badgeColor = "#1E5FD9", title, subtitle, children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-navy-900 pb-12 font-sans">
      {/* Sticky Header hai  */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Logo size="sm" />
            <span
              className="text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border whitespace-nowrap"
              style={{
                backgroundColor: badgeColor + "15",
                color: badgeColor,
                borderColor: badgeColor + "30",
              }}
            >
              {badge}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-navy-900">{user?.name || "Dashboard User"}</p>
              <p className="text-[11px] text-slate-500">📱 {user?.phone || user?.email || "Connected"}</p>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center border border-brand-200 shrink-0">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="text-[11px] sm:text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Container  hai ye */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 mt-4 sm:mt-6">
        {title && (
          <div className="mb-4 sm:mb-6">
            <h1 className="text-lg sm:text-2xl font-black text-navy-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}