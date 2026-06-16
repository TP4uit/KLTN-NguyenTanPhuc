import { LogOut, Shield, UserCircle } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../lib/authContext";

function roleBadgeClass(role: string) {
  if (role === "ADMIN") {
    return "border-blue-400/40 bg-blue-500/15 text-blue-100";
  }

  if (role === "AUDITOR") {
    return "border-emerald-400/40 bg-emerald-500/15 text-emerald-100";
  }

  return "border-slate-400/40 bg-white/10 text-slate-100";
}

export function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, role, user } = useAuth();
  const displayName = user?.fullName || user?.email;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="w-full absolute top-0 left-0 right-0 z-20 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Veri<span className="text-blue-500">Vote</span>
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-300">
          <Link to="/results" className="hover:text-white transition-colors">Results</Link>
          <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          {isAuthenticated && role === "ADMIN" && (
            <Link to="/admin" className="hover:text-white transition-colors">Admin</Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated && user && role ? (
            <>
              <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white">
                <UserCircle className="h-4 w-4 text-blue-200" />
                <span className="max-w-44 truncate">{displayName}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${roleBadgeClass(role)}`}>
                  {role}
                </span>
              </div>
              <Link
                to="/account"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                Account
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
