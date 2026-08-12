import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

export default function DashboardShell({ badge, badgeColor, title, children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex items-center gap-4">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: badgeColor + "1A", color: badgeColor }}
          >
            {badge}
          </span>
          <span className="text-sm text-slate-600 hidden sm:inline">
            {user?.name}
          </span>
          <button
            onClick={logout}
            className="text-sm font-medium text-red-500 hover:underline"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-navy-900 mb-2">{title}</h1>
        <p className="text-sm text-slate-500 mb-8">
          Logged in as <strong>{user?.email}</strong> — role:{" "}
          <strong>{user?.role}</strong>
        </p>
        {children}
      </main>
    </div>
  );
}