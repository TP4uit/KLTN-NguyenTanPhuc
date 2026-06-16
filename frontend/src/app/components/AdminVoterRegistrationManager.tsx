import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Clock3,
  Download,
  FileJson,
  RefreshCw,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../lib/authContext";
import { listUsers } from "../lib/localAuth";
import {
  approveRegistration,
  buildRegistrationEvidence,
  currentElectionId,
  listRegistrations,
  rejectRegistration,
} from "../lib/localVoterRegistration";
import type { DemoUser } from "../lib/authModel";
import type { VoterRegistration, VoterRegistrationStatus } from "../lib/voterRegistrationModel";

type ReviewStatus = "idle" | "success" | "error";
type EvidenceActionStatus = "idle" | "success" | "error";

function formatDate(value?: string) {
  if (!value) {
    return "Not reviewed";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLongValue(value: string) {
  if (value.length <= 28) {
    return value;
  }

  return `${value.slice(0, 14)}...${value.slice(-10)}`;
}

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

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallbackMessage;
}

function getSummary(registrations: VoterRegistration[]) {
  return registrations.reduce(
    (summary, registration) => ({
      total: summary.total + 1,
      pending: summary.pending + (registration.status === "PENDING" ? 1 : 0),
      approved: summary.approved + (registration.status === "APPROVED" ? 1 : 0),
      rejected: summary.rejected + (registration.status === "REJECTED" ? 1 : 0),
    }),
    {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    },
  );
}

function buildEvidenceFilename(electionId: string) {
  return `registration-evidence-election-${electionId}.json`;
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

function downloadEvidenceJson(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AdminVoterRegistrationManager() {
  const { role, user } = useAuth();
  const [registrations, setRegistrations] = useState<VoterRegistration[]>(() => listRegistrations(currentElectionId));
  const [users, setUsers] = useState<DemoUser[]>(() => listUsers());
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("idle");
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [evidenceStatus, setEvidenceStatus] = useState<EvidenceActionStatus>("idle");
  const [evidenceMessage, setEvidenceMessage] = useState<string | null>(null);
  const isAdmin = role === "ADMIN" && Boolean(user);
  const summary = useMemo(() => getSummary(registrations), [registrations]);
  const evidence = useMemo(() => buildRegistrationEvidence(currentElectionId), [registrations]);
  const evidenceJson = useMemo(() => JSON.stringify(evidence, null, 2), [evidence]);
  const usersById = useMemo(
    () => new Map(users.map((candidate) => [candidate.id, candidate])),
    [users],
  );

  const refresh = () => {
    setRegistrations(listRegistrations(currentElectionId));
    setUsers(listUsers());
  };

  const handleApprove = (registrationId: string) => {
    if (!user || role !== "ADMIN") {
      setReviewStatus("error");
      setReviewMessage("Only ADMIN users can review voter registrations.");
      return;
    }

    try {
      approveRegistration(registrationId, user.id);
      refresh();
      setReviewStatus("success");
      setReviewMessage("Registration approved.");
    } catch (error) {
      setReviewStatus("error");
      setReviewMessage(getErrorMessage(error, "Unable to approve registration."));
    }
  };

  const handleReject = (registrationId: string) => {
    if (!user || role !== "ADMIN") {
      setReviewStatus("error");
      setReviewMessage("Only ADMIN users can review voter registrations.");
      return;
    }

    const rejectionReason = rejectionReasons[registrationId]?.trim();

    if (!rejectionReason) {
      setReviewStatus("error");
      setReviewMessage("Rejection reason is required.");
      return;
    }

    try {
      rejectRegistration(registrationId, user.id, rejectionReason);
      refresh();
      setRejectionReasons((current) => ({ ...current, [registrationId]: "" }));
      setReviewStatus("success");
      setReviewMessage("Registration rejected.");
    } catch (error) {
      setReviewStatus("error");
      setReviewMessage(getErrorMessage(error, "Unable to reject registration."));
    }
  };

  const handleCopyEvidence = async () => {
    try {
      await copyTextToClipboard(evidenceJson);
      setEvidenceStatus("success");
      setEvidenceMessage("Evidence JSON copied.");
    } catch (error) {
      setEvidenceStatus("error");
      setEvidenceMessage(getErrorMessage(error, "Unable to copy evidence JSON."));
    }
  };

  const handleDownloadEvidence = () => {
    try {
      downloadEvidenceJson(buildEvidenceFilename(evidence.electionId), evidenceJson);
      setEvidenceStatus("success");
      setEvidenceMessage("Evidence JSON download prepared.");
    } catch (error) {
      setEvidenceStatus("error");
      setEvidenceMessage(getErrorMessage(error, "Unable to download evidence JSON."));
    }
  };

  return (
    <>
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Voter Registration Review</h2>
          </div>
          <p className="text-sm text-slate-600">
            Election ID: <span className="font-mono font-semibold text-slate-800">{currentElectionId}</span>
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Admins can review account registration and identity commitments only. Secret keys, vote choices,
            candidate choices, proofs, nullifiers, and transaction hashes are not shown or stored here.
          </p>
        </div>

        <button
          onClick={refresh}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh registrations
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Total registrations</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-700">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">{summary.pending}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-700">Approved</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{summary.approved}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">Rejected</p>
          <p className="mt-1 text-2xl font-bold text-red-900">{summary.rejected}</p>
        </div>
      </div>

      {reviewMessage && (
        <div
          className={`mb-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
            reviewStatus === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {reviewStatus === "error" ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{reviewMessage}</span>
        </div>
      )}

      {registrations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          No voter registration requests for this election yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Voter</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Identity commitment</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Review</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {registrations.map((registration) => {
                const voter = usersById.get(registration.userId);
                const isPending = registration.status === "PENDING";
                const rejectionReason = rejectionReasons[registration.id] ?? "";

                return (
                  <tr key={registration.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{voter?.fullName ?? "Unknown voter"}</div>
                      <div className="mt-1 text-slate-500">{voter?.email ?? "No email found"}</div>
                      <div className="mt-1 font-mono text-xs text-slate-500">userId: {registration.userId}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(registration.status)}`}>
                        {registration.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs text-slate-900" title={registration.identityCommitment}>
                        {formatLongValue(registration.identityCommitment)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div>{formatDate(registration.createdAt)}</div>
                      <div className="mt-1 font-mono text-xs text-slate-500">id: {registration.id}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        {registration.reviewedAt ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Clock3 className="h-4 w-4 text-slate-400" />
                        )}
                        <span>{formatDate(registration.reviewedAt)}</span>
                      </div>
                      {registration.reviewedBy && (
                        <div className="mt-1 font-mono text-xs text-slate-500">reviewedBy: {registration.reviewedBy}</div>
                      )}
                      {registration.rejectionReason && (
                        <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-2 py-1 text-xs text-red-700">
                          {registration.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {isPending ? (
                        <div className="min-w-60 space-y-3">
                          <button
                            onClick={() => handleApprove(registration.id)}
                            disabled={!isAdmin}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <textarea
                            value={rejectionReason}
                            onChange={(event) =>
                              setRejectionReasons((current) => ({
                                ...current,
                                [registration.id]: event.target.value,
                              }))
                            }
                            disabled={!isAdmin}
                            placeholder="Required rejection reason"
                            className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                          />
                          <button
                            onClick={() => handleReject(registration.id)}
                            disabled={!isAdmin || !rejectionReason.trim()}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">Reviewed</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>

    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <FileJson className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Registration Evidence</h2>
          </div>
          <p className="text-sm text-slate-600">
            Election ID: <span className="font-mono font-semibold text-slate-800">{evidence.electionId}</span>
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            This evidence proves eligibility registry state only. It does not reveal vote choices.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleCopyEvidence}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Clipboard className="h-4 w-4" />
            Copy evidence JSON
          </button>
          <button
            onClick={handleDownloadEvidence}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Download evidence JSON
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Total registrations</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{evidence.totalRegistrations}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-700">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">{evidence.pendingCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-700">Approved</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{evidence.approvedCount}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">Rejected</p>
          <p className="mt-1 text-2xl font-bold text-red-900">{evidence.rejectedCount}</p>
        </div>
      </div>

      {evidenceMessage && (
        <div
          className={`mb-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
            evidenceStatus === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {evidenceStatus === "error" ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{evidenceMessage}</span>
        </div>
      )}

      {evidence.approvedCommitments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          No approved commitments exist for this election yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Registration</th>
                <th className="px-4 py-3">Approved identity commitment</th>
                <th className="px-4 py-3">Reviewed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {evidence.approvedCommitments.map((commitment) => (
                <tr key={commitment.registrationId}>
                  <td className="px-4 py-4 font-mono text-xs text-slate-600">
                    {commitment.registrationId}
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-mono text-xs text-slate-900" title={commitment.identityCommitment}>
                      {formatLongValue(commitment.identityCommitment)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{formatDate(commitment.reviewedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
    </>
  );
}
