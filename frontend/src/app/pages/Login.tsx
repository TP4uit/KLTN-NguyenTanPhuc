import { AlertCircle, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../lib/authContext";
import { DEMO_ACCOUNT_CREDENTIALS } from "../lib/localAuth";

type LoginFieldErrors = {
  email?: string;
  password?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRIVACY_NOTE =
  "Demo accounts control app access only. They must not be linked to the final vote choice. ZK identity and vote proof flows remain separate.";

function friendlyError(error: unknown, fallbackMessage: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallbackMessage;
}

function getRedirectState(state: unknown) {
  if (!state || typeof state !== "object") {
    return {};
  }

  const candidate = state as { from?: unknown; message?: unknown };

  return {
    from: typeof candidate.from === "string" && candidate.from.startsWith("/") ? candidate.from : undefined,
    message: typeof candidate.message === "string" ? candidate.message : undefined,
  };
}

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const redirectState = useMemo(() => getRedirectState(location.state), [location.state]);

  const validate = () => {
    const nextErrors: LoginFieldErrors = {};

    if (!normalizedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);
      login(normalizedEmail, password);
      navigate(redirectState.from ?? "/dashboard", { replace: Boolean(redirectState.from) });
    } catch (error) {
      setFormError(friendlyError(error, "Unable to sign in. Check your email and password."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <section className="space-y-6">
            <Link to="/" className="inline-flex items-center gap-3 text-slate-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="text-2xl font-bold tracking-tight">
                Veri<span className="text-blue-600">Vote</span>
              </span>
            </Link>

            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-600">Demo access</p>
              <h1 className="max-w-xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Sign in to the local election demo.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">{PRIVACY_NOTE}</p>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <p className="font-semibold">Demo accounts</p>
              <div className="mt-2 grid gap-1 font-mono text-xs sm:text-sm">
                {DEMO_ACCOUNT_CREDENTIALS.map((account) => (
                  <span key={account.email}>
                    {account.email} / {account.password}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                <KeyRound className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold text-slate-950">Login</h2>
              <p className="mt-2 text-sm text-slate-600">Use one of the demo accounts or a voter account you registered.</p>
            </div>

            {formError && (
              <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {!formError && redirectState.message && (
              <div className="mb-5 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{redirectState.message}</span>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFieldErrors((current) => ({ ...current, email: undefined }));
                  }}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                  className="h-11 bg-white"
                />
                {fieldErrors.email && (
                  <p id="login-email-error" className="text-sm text-red-600">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors((current) => ({ ...current, password: undefined }));
                  }}
                  autoComplete="current-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                  className="h-11 bg-white"
                />
                {fieldErrors.password && (
                  <p id="login-password-error" className="text-sm text-red-600">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={isSubmitting} className="h-11 w-full bg-slate-900 text-white hover:bg-slate-800">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Sign in
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Need a voter account?{" "}
              <Link to="/register" className="font-semibold text-blue-700 hover:text-blue-800">
                Register
              </Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
