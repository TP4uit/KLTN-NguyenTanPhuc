import { AlertCircle, CheckCircle2, LinkIcon, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { useState } from "react";
import { DashboardHeader } from "../components/DashboardHeader";
import { useAuth } from "../lib/authContext";
import { localElection } from "../lib/localElection";
import { getRegistrationCommitmentScheme } from "../lib/localVoterRegistration";
import { getRegistrationProofCompatibility } from "../lib/registrationProofCompatibility";
import { useVoterRegistration } from "../lib/useVoterRegistration";
import type { CommitmentScheme } from "../lib/voterRegistrationModel";

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
};

type WalletLinkStatus = "idle" | "linking" | "success" | "error";

const PRIVACY_NOTE =
  "Account identity is for app access. Vote proof, nullifier, secret key, and candidate choice must remain separate.";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAddress(address: string) {
  if (address.length <= 14) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getFriendlyError(error: unknown, fallbackMessage: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallbackMessage;
}

function formatCommitmentScheme(scheme: CommitmentScheme) {
  if (scheme === "FIXTURE_POSEIDON") {
    return "Fixture Poseidon";
  }

  if (scheme === "POSEIDON") {
    return "Poseidon";
  }

  return "SHA-256 demo";
}

async function readSelectedWalletAccount() {
  const browserWindow = window as Window & { ethereum?: EthereumProvider };

  if (!browserWindow.ethereum) {
    throw new Error("MetaMask is not available in this browser.");
  }

  const existingAccounts = await browserWindow.ethereum.request({ method: "eth_accounts" });

  if (Array.isArray(existingAccounts) && typeof existingAccounts[0] === "string") {
    return existingAccounts[0];
  }

  const requestedAccounts = await browserWindow.ethereum.request({ method: "eth_requestAccounts" });

  if (Array.isArray(requestedAccounts) && typeof requestedAccounts[0] === "string") {
    return requestedAccounts[0];
  }

  throw new Error("No MetaMask account was selected.");
}

export function Account() {
  const { linkWallet, user } = useAuth();
  const voterRegistration = useVoterRegistration(localElection.electionId);
  const proofCompatibility = getRegistrationProofCompatibility(voterRegistration.registration);
  const [status, setStatus] = useState<WalletLinkStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  const handleLinkWallet = async () => {
    setStatus("linking");
    setStatusMessage(null);

    try {
      const walletAddress = await readSelectedWalletAccount();
      const updatedUser = linkWallet(walletAddress);
      setStatus("success");
      setStatusMessage(`Linked ${formatAddress(updatedUser.walletAddress ?? walletAddress)} to this demo account.`);
    } catch (error) {
      setStatus("error");
      setStatusMessage(getFriendlyError(error, "Unable to link the current MetaMask wallet."));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <DashboardHeader />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Account</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{PRIVACY_NOTE}</p>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-5 text-lg font-bold text-slate-950">Demo profile</h2>
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-slate-500">Full name</dt>
                <dd className="mt-1 text-base font-semibold text-slate-950">{user.fullName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Email</dt>
                <dd className="mt-1 break-all text-base font-semibold text-slate-950">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Role</dt>
                <dd className="mt-1 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700">
                  {user.role}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Created</dt>
                <dd className="mt-1 text-base font-semibold text-slate-950">{formatDate(user.createdAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Linked wallet</h2>
                <p className="mt-1 text-sm text-slate-600">Stored only on this demo account.</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-500">Wallet address</p>
              <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-950">
                {user.walletAddress ?? "No wallet linked yet"}
              </p>
            </div>

            {statusMessage && (
              <div
                className={`mb-5 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                  status === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {status === "error" ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{statusMessage}</span>
              </div>
            )}

            <button
              onClick={handleLinkWallet}
              disabled={status === "linking"}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "linking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
              Link current MetaMask wallet
            </button>
          </div>
        </section>

        {voterRegistration.status === "APPROVED" && voterRegistration.registration && (
          <section className="mt-6 rounded-lg border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Approved registration evidence</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Read-only local eligibility evidence for this demo account. The raw identity secret is not shown.
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-slate-500">Election ID</dt>
                <dd className="mt-1 font-mono text-base font-semibold text-slate-950">
                  {voterRegistration.registration.electionId}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Reviewed</dt>
                <dd className="mt-1 text-base font-semibold text-slate-950">
                  {voterRegistration.registration.reviewedAt
                    ? formatDate(voterRegistration.registration.reviewedAt)
                    : "Approved"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-slate-500">Proof fixture compatibility</dt>
                <dd
                  className={`mt-1 text-base font-semibold ${
                    proofCompatibility.isCompatible ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {proofCompatibility.isCompatible
                    ? "Proof fixture compatible"
                    : "Onboarding only, not in current proof fixture"}
                </dd>
                {!proofCompatibility.isCompatible && (
                  <p className="mt-1 text-sm text-amber-700">
                    Approved locally, but this identity is not in the current static ZK registry fixture yet.
                  </p>
                )}
                <p className="mt-2 text-sm text-slate-600">
                  New demo registrations use Poseidon commitments for guarded Dynamic submit when the admin runs
                  Dynamic Poseidon Mode. Static fixture voting remains tied to the seeded fixture voter.
                </p>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-slate-500">Commitment scheme</dt>
                <dd className="mt-1 text-base font-semibold text-slate-950">
                  {formatCommitmentScheme(getRegistrationCommitmentScheme(voterRegistration.registration))}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-slate-500">Identity commitment</dt>
                <dd className="mt-1 break-all font-mono text-sm font-semibold text-slate-950">
                  {voterRegistration.registration.identityCommitment}
                </dd>
              </div>
            </dl>
          </section>
        )}
      </main>
    </div>
  );
}
