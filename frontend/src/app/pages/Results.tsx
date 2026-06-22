import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Activity,
  AlertCircle,
  Box,
  CheckCircle2,
  Clipboard,
  Download,
  Loader2,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { DashboardHeader } from "../components/DashboardHeader";
import { CANDIDATES, type CandidateMetadata } from "../lib/candidates";
import {
  buildResultsAuditSnapshot,
  readOnChainElectionResults,
  validateResultsAuditSnapshot,
  type ElectionResultsSnapshot,
} from "../lib/electionResults";
import {
  connectLocalElection,
  formatAccount,
  getConnectedLocalElection,
  getMetadataElectionLifecycle,
  localElection,
  type ElectionLifecycle,
} from "../lib/localElection";
import { buildRegistrationEvidence, VOTER_REGISTRATIONS_CHANGED_EVENT } from "../lib/localVoterRegistration";
import { copyTextToClipboard, downloadJson } from "../lib/registryPreview";

type ResultStatus = "idle" | "loading" | "success" | "error";

type DisplayCandidate = CandidateMetadata & {
  votes: number | null;
  chartVotes: number;
};

type TooltipPayload = {
  payload: DisplayCandidate;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
};

function readLocalApprovedVoters() {
  try {
    return buildRegistrationEvidence(localElection.electionId).approvedCount;
  } catch {
    return null;
  }
}

export function Results() {
  const [snapshot, setSnapshot] = useState<ElectionResultsSnapshot | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<ResultStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("Connect MetaMask to load on-chain localhost tallies.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [auditMessage, setAuditMessage] = useState<string | null>(null);
  const [electionLifecycle, setElectionLifecycle] = useState<ElectionLifecycle>(getMetadataElectionLifecycle());
  const [localApprovedVoters, setLocalApprovedVoters] = useState<number | null>(() => readLocalApprovedVoters());
  const isOnChain = snapshot?.source === "on-chain";
  const totalVotes = snapshot?.totalVotes ?? null;
  const latestBlock = snapshot?.latestBlock ?? null;
  const isRefreshing = status === "loading";
  const auditSnapshot = useMemo(
    () => (snapshot ? buildResultsAuditSnapshot(snapshot, localApprovedVoters) : null),
    [localApprovedVoters, snapshot],
  );
  const auditValidation = useMemo(
    () => (auditSnapshot ? validateResultsAuditSnapshot(auditSnapshot) : null),
    [auditSnapshot],
  );
  const auditJson = useMemo(() => (auditSnapshot ? JSON.stringify(auditSnapshot, null, 2) : ""), [auditSnapshot]);
  const canExportAudit = Boolean(auditSnapshot && auditValidation?.isValid);

  const displayResults = useMemo<DisplayCandidate[]>(() => {
    const byCandidateId = new Map(snapshot?.results.map((candidate) => [candidate.candidateId, candidate.votes]) ?? []);
    const candidates = CANDIDATES.map((candidate) => {
      const votes = byCandidateId.get(candidate.candidateId) ?? null;

      return {
        ...candidate,
        votes,
        chartVotes: votes ?? 0,
      };
    });

    if (!isOnChain) {
      return candidates;
    }

    return [...candidates].sort((left, right) => (right.votes ?? 0) - (left.votes ?? 0));
  }, [isOnChain, snapshot]);

  const turnout = useMemo(() => {
    if (!isOnChain || totalVotes === null || !localApprovedVoters || localApprovedVoters <= 0) {
      return null;
    }

    return Math.min((totalVotes / localApprovedVoters) * 100, 100);
  }, [isOnChain, localApprovedVoters, totalVotes]);

  const loadResults = async (requestAccount: boolean) => {
    setStatus("loading");
    setErrorMessage(null);
    setAuditMessage(null);

    try {
      const connection = requestAccount ? await connectLocalElection() : await getConnectedLocalElection();

      if (!connection) {
        setStatus("idle");
        setStatusMessage("Connect MetaMask to load on-chain localhost tallies.");
        return;
      }

      const nextSnapshot = await readOnChainElectionResults(connection.contract, connection.provider);

      setAccount(connection.account);
      setSnapshot(nextSnapshot);
      setElectionLifecycle(nextSnapshot.lifecycle);
      setStatus("success");
      setStatusMessage(`Loaded on-chain localhost tallies from ${localElection.network}.`);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to load on-chain localhost tallies.");
      setStatusMessage("Could not load on-chain localhost tallies.");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) {
      return;
    }

    void loadResults(false);
  }, []);

  useEffect(() => {
    const refreshApprovedCount = () => {
      setLocalApprovedVoters(readLocalApprovedVoters());
    };

    window.addEventListener(VOTER_REGISTRATIONS_CHANGED_EVENT, refreshApprovedCount);

    return () => {
      window.removeEventListener(VOTER_REGISTRATIONS_CHANGED_EVENT, refreshApprovedCount);
    };
  }, []);

  const percentageFor = (votes: number | null) => {
    if (!isOnChain || totalVotes === null || totalVotes === 0 || votes === null) {
      return "0.0";
    }

    return ((votes / totalVotes) * 100).toFixed(1);
  };

  const formatVotes = (votes: number | null) => (isOnChain && votes !== null ? votes.toLocaleString() : "Not loaded");

  const handleCopyAuditJson = async () => {
    if (!auditJson || !canExportAudit) {
      setAuditMessage("Load on-chain tallies before exporting audit JSON.");
      return;
    }

    try {
      await copyTextToClipboard(auditJson);
      setAuditMessage("Audit JSON copied.");
    } catch (error) {
      setAuditMessage(error instanceof Error ? error.message : "Unable to copy audit JSON.");
    }
  };

  const handleDownloadAuditJson = () => {
    if (!auditJson || !canExportAudit) {
      setAuditMessage("Load on-chain tallies before exporting audit JSON.");
      return;
    }

    downloadJson(`zkvote-results-audit-${localElection.electionId}.json`, auditJson);
    setAuditMessage("Audit JSON download started.");
  };

  const CustomTooltip = ({ active, payload }: ChartTooltipProps) => {
    if (!active || !payload?.length) {
      return null;
    }

    const data = payload[0].payload;
    const percentage = percentageFor(data.votes);

    return (
      <div className="min-w-[200px] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
        <p className="mb-1 text-lg font-semibold text-slate-900">{data.name}</p>
        <div className="flex flex-col gap-1 text-sm">
          <span className="flex justify-between text-slate-500">
            Votes: <strong className="text-slate-900">{formatVotes(data.votes)}</strong>
          </span>
          <span className="flex justify-between text-slate-500">
            Share: <strong className="text-slate-900">{isOnChain ? `${percentage}%` : "Not loaded"}</strong>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
      <DashboardHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">Election Analytics</h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${
                  isOnChain ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isOnChain ? "bg-emerald-600" : "bg-slate-400"}`} />
                {isOnChain ? "On-chain" : "Metadata"}
              </span>
            </div>
            <p className="max-w-2xl text-lg text-slate-600">
              Candidate metadata is shown by default. Vote counts load only from the local election contract.
            </p>
            <div
              className={`mt-3 flex max-w-3xl items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
                status === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : status === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {status === "loading" ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
              ) : status === "error" ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : status === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{status === "error" ? errorMessage : statusMessage}</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Election state: <span className="font-semibold text-slate-700">{electionLifecycle.electionStateName}</span>
              {isOnChain ? " (live contract data)" : " (metadata)"}
            </p>
          </div>
          <button
            onClick={() => loadResults(true)}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : account ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {account ? `Refresh ${formatAccount(account)}` : "Connect MetaMask"}
          </button>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-500">Total Votes Cast</p>
              <p className="text-3xl font-bold text-slate-900">
                {totalVotes === null ? "Not loaded" : totalVotes.toLocaleString()}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {isOnChain ? "Loaded from contract getVotes(candidateId)." : "Connect to load on-chain totals."}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-500">Local Approved Voters</p>
              <p className="text-3xl font-bold text-slate-900">
                {localApprovedVoters === null ? "Unavailable" : localApprovedVoters.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {turnout === null ? "Local demo turnout not available." : `${turnout.toFixed(1)}% local demo turnout.`}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <Box className="h-6 w-6" />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-500">Latest Block</p>
              <p className="text-3xl font-bold text-slate-900">
                {latestBlock === null ? "Not connected" : latestBlock.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {isOnChain ? "Latest localhost block from provider." : "Connect MetaMask to load block height."}
              </p>
            </div>
          </motion.div>
        </div>

        {isOnChain && totalVotes === 0 && (
          <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800">
            <div className="font-semibold">No on-chain votes recorded yet.</div>
            <p className="mt-1">The candidates are loaded, but every contract tally is currently zero.</p>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-slate-900">Vote Distribution</h2>
            <span className="text-sm text-slate-500">{isOnChain ? "Live contract data" : "Vote counts not loaded"}</span>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayResults} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, "dataMax"]} hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#475569", fontSize: 14, fontWeight: 500 }}
                  width={140}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="chartVotes" radius={[0, 6, 6, 0]} barSize={40} animationDuration={1500} minPointSize={2}>
                  {displayResults.map((entry) => (
                    <Cell key={`cell-${entry.id}`} fill={isOnChain ? entry.color : "#cbd5e1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900">Candidate Tallies</h2>
            <span className="text-sm font-medium text-slate-500">
              {isOnChain ? `Loaded at ${new Date(snapshot.loadedAt).toLocaleTimeString()}` : "Not connected"}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {displayResults.map((candidate, index) => {
              const percentage = percentageFor(candidate.votes);

              return (
                <div
                  key={candidate.id}
                  className="flex flex-col gap-4 p-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:p-6"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        isOnChain
                          ? index === 0
                            ? "bg-amber-100 text-amber-700"
                            : index === 1
                              ? "bg-slate-200 text-slate-700"
                              : index === 2
                                ? "bg-orange-100 text-orange-800"
                                : "bg-slate-100 text-slate-500"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isOnChain ? `#${index + 1}` : "-"}
                    </div>

                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-slate-100 bg-slate-100 shadow-sm">
                      <ImageWithFallback src={candidate.image} alt={candidate.name} className="h-full w-full object-cover" />
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900">{candidate.name}</h3>
                      <p className="text-sm text-slate-500">{candidate.title}</p>
                    </div>
                  </div>

                  <div className="ml-0 mt-2 flex w-full max-w-md flex-col gap-2 sm:ml-auto sm:mt-0 sm:w-1/2 sm:items-end">
                    <div className="flex w-full justify-between text-sm">
                      <span className="font-bold text-slate-900">
                        {formatVotes(candidate.votes)} <span className="font-normal text-slate-500">votes</span>
                      </span>
                      <span className="font-bold" style={{ color: isOnChain ? candidate.color : "#64748b" }}>
                        {isOnChain ? `${percentage}%` : "Not loaded"}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: isOnChain ? `${percentage}%` : "0%" }}
                        transition={{ duration: 1.5, delay: 0.5 + index * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: isOnChain ? candidate.color : "#cbd5e1" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Audit Export</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                This export contains public tally data and local demo registration counts only. It does not contain voter
                identities, secrets, proofs, nullifiers, or private wallet data.
              </p>
              {!canExportAudit && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Load on-chain tallies before exporting audit JSON.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleCopyAuditJson}
                disabled={!canExportAudit}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Clipboard className="h-4 w-4" />
                Copy audit JSON
              </button>
              <button
                onClick={handleDownloadAuditJson}
                disabled={!canExportAudit}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                Download audit JSON
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Source</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{auditSnapshot?.source ?? "Not loaded"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Latest block</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {auditSnapshot ? auditSnapshot.latestBlock.toLocaleString() : "Not loaded"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total votes</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {auditSnapshot ? auditSnapshot.totalVotes.toLocaleString() : "Not loaded"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Candidate sum check</p>
              <p
                className={`mt-1 text-lg font-bold ${
                  auditSnapshot?.checks.totalMatchesCandidateSum ? "text-emerald-700" : "text-slate-900"
                }`}
              >
                {auditSnapshot ? (auditSnapshot.checks.totalMatchesCandidateSum ? "Passed" : "Failed") : "Not loaded"}
              </p>
            </div>
          </div>

          {auditSnapshot && (
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                <div className="font-semibold text-slate-900">Checks</div>
                <dl className="mt-3 space-y-2">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">totalMatchesCandidateSum</dt>
                    <dd className={auditSnapshot.checks.totalMatchesCandidateSum ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                      {String(auditSnapshot.checks.totalMatchesCandidateSum)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">hasOnChainSource</dt>
                    <dd className={auditSnapshot.checks.hasOnChainSource ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                      {String(auditSnapshot.checks.hasOnChainSource)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">hasLiveLifecycle</dt>
                    <dd className={auditSnapshot.checks.hasLiveLifecycle ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                      {String(auditSnapshot.checks.hasLiveLifecycle)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                <div className="font-semibold text-slate-900">Warnings</div>
                <ul className="mt-3 space-y-2 text-slate-600">
                  {auditSnapshot.warnings.map((warning) => (
                    <li key={warning} className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {auditValidation && auditValidation.errors.length > 0 && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div className="font-semibold">Audit snapshot is not valid.</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {auditValidation.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {auditMessage && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {auditMessage}
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
}
