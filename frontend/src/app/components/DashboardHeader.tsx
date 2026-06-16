import { LogOut, Shield, UserCircle } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router";
import { useAuth } from "../lib/authContext";

function navLinkClass(pathname: string, currentPathname: string) {
  return `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    currentPathname === pathname ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
  }`;
}

function roleBadgeClass(role: string) {
  if (role === "ADMIN") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (role === "AUDITOR") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function DashboardHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, role, user } = useAuth();
  const displayName = user?.fullName || user?.email;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Veri<span className="text-blue-600">Vote</span>
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/dashboard" className={navLinkClass("/dashboard", location.pathname)}>
              Proposals
            </Link>
            <Link to="/results" className={navLinkClass("/results", location.pathname)}>
              Live Results
            </Link>
            <Link to="/admin" className={navLinkClass("/admin", location.pathname)}>
              Admin
            </Link>
            {isAuthenticated && (
              <Link to="/account" className={navLinkClass("/account", location.pathname)}>
                Account
              </Link>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {isAuthenticated && user && role ? (
            <>
              <div className="hidden sm:flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                <UserCircle className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="max-w-40 truncate text-sm font-medium text-slate-700">
                  {displayName}
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${roleBadgeClass(role)}`}>
                  {role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
