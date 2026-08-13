import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

export default function DashboardShell({ badge, badgeColor = "#1E5FD9", title, subtitle, children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-navy-900 pb-12">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full border"
              style={{
                backgroundColor: badgeColor + "15",
                color: badgeColor,
                borderColor: badgeColor + "30",
              }}
            >
              {badge}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-navy-900">{user?.name || "Dashboard User"}</p>
              <p className="text-[11px] text-slate-500">📱 {user?.phone || user?.email || "Connected"}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center border border-brand-200">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        {title && (
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-extrabold text-navy-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}