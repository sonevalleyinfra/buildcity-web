import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

export default function DashboardShell({
  badge,
  badgeColor = "#1E5FD9",
  hideLogout = false,
  rightContent,
  title,
  subtitle,
  onProfileClick,
  isProfileActive = false,
  children,
}) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-navy-900 pb-12 font-sans">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            {/* On mobile show only Logo icon; on desktop show full Logo with text */}
            <div className="sm:hidden">
              <Logo size="sm" iconOnly={true} />
            </div>
            <div className="hidden sm:block">
              <Logo size="sm" />
            </div>

            {badge && (
              typeof badge === "string" ? (
                <span
                  className="text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border whitespace-nowrap truncate max-w-[160px] sm:max-w-none"
                  style={{
                    backgroundColor: badgeColor + "15",
                    color: badgeColor,
                    borderColor: badgeColor + "30",
                  }}
                >
                  {badge}
                </span>
              ) : (
                badge
              )
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {rightContent}
            {onProfileClick ? (
              <button
                type="button"
                onClick={onProfileClick}
                className={`flex items-center gap-1.5 sm:gap-2.5 p-1 rounded-xl transition-all cursor-pointer group active:scale-95 ${
                  isProfileActive
                    ? "bg-brand-50 border border-brand-300 ring-2 ring-brand-500/20 shadow-2xs"
                    : "hover:bg-slate-100"
                }`}
                title="View Partner Profile"
              >
                <div className="text-right hidden sm:block">
                  <p className={`text-xs font-bold transition-colors ${
                    isProfileActive ? "text-brand-700" : "text-navy-900 group-hover:text-brand-600"
                  }`}>
                    {user?.name || "Dashboard User"}
                  </p>
                  <p className="text-[11px] text-slate-500">📱 {user?.phone || user?.email || "Connected"}</p>
                </div>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full font-black text-[11px] sm:text-xs flex items-center justify-center border transition-all shrink-0 shadow-2xs ${
                  isProfileActive
                    ? "bg-brand-500 text-white border-brand-600 ring-2 ring-brand-300"
                    : "bg-brand-100 text-brand-700 border-brand-200 group-hover:scale-105 group-hover:bg-brand-200"
                }`}>
                  {(user?.name || "U").charAt(0).toUpperCase()}
                </div>
              </button>
            ) : (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-navy-900">{user?.name || "Dashboard User"}</p>
                  <p className="text-[11px] text-slate-500">📱 {user?.phone || user?.email || "Connected"}</p>
                </div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-[10px] sm:text-xs flex items-center justify-center border border-brand-200 shrink-0">
                  {(user?.name || "U").charAt(0).toUpperCase()}
                </div>
              </>
            )}
            {!hideLogout && (
              <button
                onClick={logout}
                className="text-[10px] sm:text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-0.8 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl transition-colors cursor-pointer shrink-0"
              >
                Logout
              </button>
            )}
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