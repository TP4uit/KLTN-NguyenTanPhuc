import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../lib/authContext";

type RegisterFieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const PRIVACY_NOTE =
  "Demo accounts control app access only. They must not be linked to the final vote choice. ZK identity and vote proof flows remain separate.";

function friendlyError(error: unknown, fallbackMessage: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallbackMessage;
}

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const trimmedFullName = useMemo(() => fullName.trim(), [fullName]);

  const validate = () => {
    const nextErrors: RegisterFieldErrors = {};

    if (!trimmedFullName) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!normalizedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
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
      register({
        fullName: trimmedFullName,
        email: normalizedEmail,
        password,
      });
      navigate("/dashboard");
    } catch (error) {
      setFormError(friendlyError(error, "Unable to create your demo voter account."));
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
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-600">Voter account</p>
              <h1 className="max-w-xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Create a local demo voter account.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">{PRIVACY_NOTE}</p>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>New registrations are created with the VOTER role and signed in automatically.</span>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                <UserPlus className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold text-slate-950">Register</h2>
              <p className="mt-2 text-sm text-slate-600">Create a VOTER account for demo app access.</p>
            </div>

            {formError && (
              <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="register-full-name">Full name</Label>
                <Input
                  id="register-full-name"
                  type="text"
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    setFieldErrors((current) => ({ ...current, fullName: undefined }));
                  }}
                  autoComplete="name"
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  aria-describedby={fieldErrors.fullName ? "register-full-name-error" : undefined}
                  className="h-11 bg-white"
                />
                {fieldErrors.fullName && (
                  <p id="register-full-name-error" className="text-sm text-red-600">
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFieldErrors((current) => ({ ...current, email: undefined }));
                  }}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
                  className="h-11 bg-white"
                />
                {fieldErrors.email && (
                  <p id="register-email-error" className="text-sm text-red-600">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors((current) => ({ ...current, password: undefined }));
                  }}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "register-password-error" : undefined}
                  className="h-11 bg-white"
                />
                {fieldErrors.password && (
                  <p id="register-password-error" className="text-sm text-red-600">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={isSubmitting} className="h-11 w-full bg-slate-900 text-white hover:bg-slate-800">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Create voter account
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already registered?{" "}
              <Link to="/login" className="font-semibold text-blue-700 hover:text-blue-800">
                Sign in
              </Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
