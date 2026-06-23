import { AlertCircle, CheckCircle2, Clock3, Fingerprint, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { currentElectionId, getRegistrationCommitmentScheme } from "../lib/localVoterRegistration";
import { getRegistrationProofCompatibility } from "../lib/registrationProofCompatibility";
import { useVoterRegistration, type UseVoterRegistrationResult } from "../lib/useVoterRegistration";
import type { CommitmentScheme, VoterRegistrationStatus } from "../lib/voterRegistrationModel";

function statusBadgeClass(status: VoterRegistrationStatus) {
  if (status === "APPROVED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "REJECTED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function statusIcon(status: VoterRegistrationStatus) {
  if (status === "APPROVED") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  }

  if (status === "PENDING") {
    return <Clock3 className="h-5 w-5 text-amber-600" />;
  }

  if (status === "REJECTED") {
    return <ShieldAlert className="h-5 w-5 text-red-600" />;
  }

  return <Fingerprint className="h-5 w-5 text-blue-600" />;
}

function formatCommitment(value: string) {
  if (value.length <= 28) {
    return value;
  }

  return `${value.slice(0, 14)}...${value.slice(-10)}`;
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

type VoterRegistrationPanelProps = {
  registrationState?: UseVoterRegistrationResult;
};

export function VoterRegistrationPanel({ registrationState }: VoterRegistrationPanelProps) {
  const fallbackRegistrationState = useVoterRegistration(currentElectionId);
  const {
    registration,
    status,
    identitySecret,
    isLoading,
    error,
    refresh,
    createRegistration,
  } = registrationState ?? fallbackRegistrationState;

  const handleCreateRegistration = () => {
    void createRegistration();
  };
  const proofCompatibility = getRegistrationProofCompatibility(registration);

  return (
    <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 flex items-center gap-2">
            {statusIcon(status)}
            <h2 className="text-lg font-bold text-slate-900">Voter Registration</h2>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(status)}`}>
              {status}
            </span>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Election ID: <span className="font-mono font-semibold text-slate-800">{currentElectionId}</span>
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your demo identity secret stays in this browser. Losing it may prevent proof generation in later flows.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            New demo registrations use Poseidon commitments for guarded Dynamic submit when the admin runs Dynamic
            Poseidon Mode. Static fixture voting remains tied to the seeded fixture voter.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={refresh}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
          {status === "NOT_REGISTERED" && (
            <button
              onClick={handleCreateRegistration}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
              Register as voter
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {status === "NOT_REGISTERED" && (
          <p>Generate a local demo identity and submit a pending voter registration for this election.</p>
        )}

        {status === "PENDING" && registration && (
          <div className="space-y-2">
            <p className="font-semibold text-amber-800">Waiting for admin approval.</p>
            <p>
              commitmentScheme:{" "}
              <span className="font-semibold text-slate-900">
                {formatCommitmentScheme(getRegistrationCommitmentScheme(registration))}
              </span>
            </p>
            <p>
              identityCommitment:{" "}
              <span className="font-mono text-slate-900" title={registration.identityCommitment}>
                {formatCommitment(registration.identityCommitment)}
              </span>
            </p>
          </div>
        )}

        {status === "APPROVED" && registration && (
          <div className="space-y-2">
            <p className="font-semibold text-emerald-800">Approved voter.</p>
            <p
              className={`font-semibold ${
                proofCompatibility.isCompatible ? "text-emerald-800" : "text-amber-800"
              }`}
            >
              {proofCompatibility.isCompatible
                ? "Proof fixture compatible"
                : "Onboarding only, not in current proof fixture"}
            </p>
            {proofCompatibility.isCompatible ? (
              <p>
                fixture merkleRoot:{" "}
                <span className="font-mono text-slate-900" title={proofCompatibility.fixtureMerkleRoot}>
                  {formatCommitment(proofCompatibility.fixtureMerkleRoot)}
                </span>
              </p>
            ) : (
              <p className="text-amber-800">
                Approved locally, but this identity is not in the current static ZK registry fixture yet.
              </p>
            )}
            <p>
              commitmentScheme:{" "}
              <span className="font-semibold text-slate-900">
                {formatCommitmentScheme(getRegistrationCommitmentScheme(registration))}
              </span>
            </p>
            <p>
              identityCommitment:{" "}
              <span className="font-mono text-slate-900" title={registration.identityCommitment}>
                {formatCommitment(registration.identityCommitment)}
              </span>
            </p>
          </div>
        )}

        {status === "REJECTED" && registration && (
          <div className="space-y-2">
            <p className="font-semibold text-red-800">Registration rejected.</p>
            <p>
              commitmentScheme:{" "}
              <span className="font-semibold text-slate-900">
                {formatCommitmentScheme(getRegistrationCommitmentScheme(registration))}
              </span>
            </p>
            <p>{registration.rejectionReason ?? "No rejection reason was provided."}</p>
          </div>
        )}

        {identitySecret && (
          <p className="mt-3 text-xs text-slate-500">
            A local identity secret exists for this browser and election. The raw secret is hidden.
          </p>
        )}
      </div>
    </section>
  );
}
