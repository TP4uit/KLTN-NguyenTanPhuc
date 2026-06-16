import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useAuth } from "../lib/authContext";
import type { UserRole } from "../lib/authModel";

type RequireAuthProps = {
  children: ReactNode;
  message?: string;
};

type RequireRoleProps = RequireAuthProps & {
  role: UserRole;
};

function AuthGuardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 font-sans text-slate-700">
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
        Restoring demo session...
      </div>
    </div>
  );
}

function AccessDenied({ requiredRole }: { requiredRole: UserRole }) {
  const { role, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 font-sans text-slate-900 sm:px-6 lg:px-8">
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center justify-center">
        <section className="w-full rounded-lg border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-700">Access denied</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Admin access is required.</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            {user?.fullName ?? "This demo account"} is signed in with the {role ?? "UNKNOWN"} role. This page requires
            the {requiredRole} role.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Go to dashboard
            </Link>
            <Link
              to="/login"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Sign in as admin
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export function RequireAuth({ children, message = "Please sign in to continue." }: RequireAuthProps) {
  const { isAuthenticated, isInitialized } = useAuth();
  const location = useLocation();

  if (!isInitialized) {
    return <AuthGuardLoading />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
          message,
        }}
      />
    );
  }

  return <>{children}</>;
}

export function RequireRole({ children, role, message = "Please sign in to continue." }: RequireRoleProps) {
  const { isAuthenticated, isInitialized, role: currentRole } = useAuth();
  const location = useLocation();

  if (!isInitialized) {
    return <AuthGuardLoading />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
          message,
        }}
      />
    );
  }

  if (currentRole !== role) {
    return <AccessDenied requiredRole={role} />;
  }

  return <>{children}</>;
}
