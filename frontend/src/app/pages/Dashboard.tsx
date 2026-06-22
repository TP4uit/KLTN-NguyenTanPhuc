import { AlertCircle, CheckCircle2, FlaskConical, Loader2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ZKPModal } from "../components/ZKPModal";
import { AnimatePresence } from "motion/react";
import { DashboardHeader } from "../components/DashboardHeader";
import { VoterRegistrationPanel } from "../components/VoterRegistrationPanel";
import {
  connectLocalElection,
  getMetadataElectionLifecycle,
  formatAccount,
  getConnectedLocalElection,
  getFixtureCandidateId,
  localElection,
  localVoteCalldata,
  readLiveElectionReadState,
  type ElectionLifecycle,
} from "../lib/localElection";
import { buildLocalDemoProofInput, generateVoteProof } from "../lib/browserProof";
import { CANDIDATES } from "../lib/candidates";
import {
  getDynamicVoteReadiness,
  type DynamicVoteReadiness,
} from "../lib/dynamicVoteReadiness";
import { getRegistrationCommitmentScheme } from "../lib/localVoterRegistration";
import { getRegistrationProofCompatibility } from "../lib/registrationProofCompatibility";
import { useVoterRegistration } from "../lib/useVoterRegistration";

type VoteStatus = "disconnected" | "connected" | "generating" | "submitting" | "success" | "error";
type BrowserProofStatus = "idle" | "generating" | "success" | "error";

export function Dashboard() {
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<VoteStatus>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [browserProofStatus, setBrowserProofStatus] = useState<BrowserProofStatus>("idle");
  const [browserProofError, setBrowserProofError] = useState<string | null>(null);
  const [browserProofSummary, setBrowserProofSummary] = useState<{
    candidateId: string;
    electionId: string;
    merkleRoot: string;
    publicSignals: string[];
    timingMs: number;
  } | null>(null);
  const [lastProofMs, setLastProofMs] = useState<number | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [electionLifecycle, setElectionLifecycle] = useState<ElectionLifecycle>(
    getMetadataElectionLifecycle(),
  );
  const [contractRoot, setContractRoot] = useState<string | null>(null);
  const [isLiveLifecycle, setIsLiveLifecycle] = useState(false);
  const [dynamicReadiness, setDynamicReadiness] = useState<DynamicVoteReadiness | null>(null);
  const [dynamicReadinessLoading, setDynamicReadinessLoading] = useState(false);
  const [dynamicReadinessError, setDynamicReadinessError] = useState<string | null>(null);
  const fixtureCandidateId = getFixtureCandidateId();
  const isWorking = status === "generating" || status === "submitting";
  const isProofGenerating = browserProofStatus === "generating";
  const voterRegistration = useVoterRegistration(localElection.electionId);
  const registrationStatus = voterRegistration.status;
  const isRegistrationApproved = registrationStatus === "APPROVED";
  const proofCompatibility = getRegistrationProofCompatibility(voterRegistration.registration);
  const isProofFixtureCompatible = proofCompatibility.isCompatible;
  const isElectionOpen = electionLifecycle.electionState === 1;
  const isElectionClosed = electionLifecycle.electionState === 2;
  const hasVotedAny = votedFor !== null;
  const canSubmitVote =
    isRegistrationApproved && isProofFixtureCompatible && isElectionOpen && !isWorking && !hasVotedAny;
  const incompatibleApprovedMessage =
    "This account is approved locally, but its identity is not in the current static ZK registry fixture yet.";

  const registrationGateMessage = (() => {
    if (registrationStatus === "PENDING") {
      return "Your voter registration is waiting for admin approval.";
    }

    if (registrationStatus === "APPROVED") {
      return "Your voter registration is approved. You can vote while the election is Open.";
    }

    if (registrationStatus === "REJECTED") {
      return `Your voter registration was rejected.${
        voterRegistration.registration?.rejectionReason
          ? ` Reason: ${voterRegistration.registration.rejectionReason}`
          : ""
      }`;
    }

    return "Register as a voter before casting a ballot.";
  })();

  const lifecycleGateMessage = (() => {
    if (isElectionClosed) {
      return "Election is closed. Voting is no longer available.";
    }

    if (!isElectionOpen) {
      return "Election is not open yet.";
    }

    return null;
  })();

  useEffect(() => {
    getConnectedLocalElection()
      .then(async (connection) => {
        if (!connection) {
          return;
        }

        setAccount(connection.account);
        const readState = await readLiveElectionReadState(connection.contract);
        setElectionLifecycle({
          electionState: readState.electionState,
          electionStateName: readState.electionStateName,
        });
        setContractRoot(readState.merkleRoot);
        setIsLiveLifecycle(true);
        setStatus("connected");
      })
      .catch(() => {
        setIsLiveLifecycle(false);
        setStatus("disconnected");
      });
  }, []);

  const refreshLifecycle = async (contract: Awaited<ReturnType<typeof connectLocalElection>>["contract"]) => {
    const readState = await readLiveElectionReadState(contract);
    const lifecycle = {
      electionState: readState.electionState,
      electionStateName: readState.electionStateName,
    };
    setElectionLifecycle(lifecycle);
    setContractRoot(readState.merkleRoot);
    setIsLiveLifecycle(true);
    return lifecycle;
  };

  useEffect(() => {
    let isMounted = true;

    setDynamicReadinessLoading(true);
    setDynamicReadinessError(null);

    getDynamicVoteReadiness(voterRegistration.registration, electionLifecycle, contractRoot, {
      hasVotedInSession: hasVotedAny,
    })
      .then((readiness) => {
        if (!isMounted) {
          return;
        }

        setDynamicReadiness(readiness);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setDynamicReadiness(null);
        setDynamicReadinessError(
          error instanceof Error ? error.message : "Unable to evaluate dynamic vote readiness.",
        );
      })
      .finally(() => {
        if (isMounted) {
          setDynamicReadinessLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [contractRoot, electionLifecycle, hasVotedAny, voterRegistration.registration]);

  const ensureElectionOpen = async (contract: Awaited<ReturnType<typeof connectLocalElection>>["contract"]) => {
    const lifecycle = await refreshLifecycle(contract);

    if (lifecycle.electionState !== 1) {
      throw new Error(
        `Election is ${lifecycle.electionStateName}. Voting is only available while the election is Open.`,
      );
    }
  };

  const handleConnect = async () => {
    setErrorMessage(null);

    try {
      const connection = await connectLocalElection();
      setAccount(connection.account);
      await refreshLifecycle(connection.contract);
      setStatus("connected");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to connect MetaMask.");
    }
  };

  const handleVote = async (id: string, candidateId: number) => {
    setErrorMessage(null);
    setLastProofMs(null);
    setLastTxHash(null);

    if (!isRegistrationApproved) {
      setStatus("error");
      setErrorMessage(registrationGateMessage);
      return;
    }

    if (!isProofFixtureCompatible) {
      setStatus("error");
      setErrorMessage(incompatibleApprovedMessage);
      return;
    }

    if (!isElectionOpen) {
      setStatus("error");
      setErrorMessage(lifecycleGateMessage ?? "Election is not open yet.");
      return;
    }

    try {
      setStatus("generating");
      const connection = await connectLocalElection();
      setAccount(connection.account);
      await ensureElectionOpen(connection.contract);
      const proofInput = buildLocalDemoProofInput(String(candidateId), localElection.electionId);
      const result = await generateVoteProof(proofInput);
      setLastProofMs(result.timingMs);

      setStatus("submitting");
      const tx = await connection.contract.castVote(
        result.calldata.a,
        result.calldata.b,
        result.calldata.c,
        result.calldata.input,
      );
      const receipt = await tx.wait();

      setVotedFor(id);
      setLastTxHash(receipt?.hash ?? tx.hash);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Proof generation or vote transaction failed.");
    }
  };

  const handleFixtureVote = async () => {
    const fixtureCandidate = CANDIDATES.find((candidate) => candidate.candidateId === fixtureCandidateId);

    if (!fixtureCandidate) {
      setStatus("error");
      setErrorMessage(`No UI candidate matches fixture candidate ${fixtureCandidateId}.`);
      return;
    }

    setErrorMessage(null);
    setLastProofMs(null);
    setLastTxHash(null);

    if (!isRegistrationApproved) {
      setStatus("error");
      setErrorMessage(registrationGateMessage);
      return;
    }

    if (!isProofFixtureCompatible) {
      setStatus("error");
      setErrorMessage(incompatibleApprovedMessage);
      return;
    }

    if (!isElectionOpen) {
      setStatus("error");
      setErrorMessage(lifecycleGateMessage ?? "Election is not open yet.");
      return;
    }

    try {
      setStatus("submitting");
      const connection = await connectLocalElection();
      setAccount(connection.account);
      await ensureElectionOpen(connection.contract);
      const tx = await connection.contract.castVote(
        localVoteCalldata.a,
        localVoteCalldata.b,
        localVoteCalldata.c,
        localVoteCalldata.input,
      );
      const receipt = await tx.wait();

      setVotedFor(fixtureCandidate.id);
      setLastTxHash(receipt?.hash ?? tx.hash);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Fixture vote transaction failed.");
    }
  };

  const handleGenerateBrowserProof = async () => {
    setBrowserProofStatus("generating");
    setBrowserProofError(null);
    setBrowserProofSummary(null);

    try {
      const proofInput = buildLocalDemoProofInput(String(fixtureCandidateId), localElection.electionId);
      const result = await generateVoteProof(proofInput);

      setBrowserProofSummary({
        candidateId: result.calldata.input[1],
        electionId: result.calldata.input[2],
        merkleRoot: result.calldata.input[3],
        publicSignals: result.publicSignals,
        timingMs: result.timingMs,
      });
      setBrowserProofStatus("success");
    } catch (error) {
      setBrowserProofStatus("error");
      setBrowserProofError(error instanceof Error ? error.message : "Browser proof generation failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <DashboardHeader />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Active Proposals</h1>
            <p className="text-lg text-slate-600 max-w-2xl">
              Select a candidate below to cast your anonymous, verifiable vote for the upcoming governance term.
            </p>
            <p className="text-sm text-slate-500 mt-3">
              Browser-generated proof voting uses the local demo voter on chain {localElection.chainId}.
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Election state: <span className="font-semibold text-slate-700">{electionLifecycle.electionStateName}</span>
              {isLiveLifecycle ? " (live)" : localElection.autoOpened ? " (metadata, auto-open deploy)" : " (metadata)"}
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-3">
            <button
              onClick={handleConnect}
              disabled={isWorking}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              {account ? formatAccount(account) : "Connect MetaMask"}
            </button>
            <div
              className={`inline-flex max-w-md items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
                status === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : status === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {status === "error" ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : status === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : isWorking ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>
                {status === "disconnected" && "Disconnected. Connect MetaMask to localhost:31337."}
                {status === "connected" && "Connected. Ready to generate a browser proof and submit your vote."}
                {status === "generating" && "Generating proof in the browser..."}
                {status === "submitting" && "Submitting castVote(a, b, c, input) in MetaMask."}
                {status === "success" && `Vote recorded${lastProofMs === null ? "" : ` after ${lastProofMs}ms proof generation`}${lastTxHash ? `: ${lastTxHash.slice(0, 10)}...${lastTxHash.slice(-8)}` : "."}`}
                {status === "error" && (errorMessage ?? "Something went wrong.")}
              </span>
            </div>
            <div className="inline-flex max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              <span className={`h-2 w-2 rounded-full ${
                electionLifecycle.electionState === 1
                  ? "bg-emerald-500"
                  : electionLifecycle.electionState === 2
                    ? "bg-slate-400"
                    : "bg-amber-500"
              }`} />
              <span>
                Lifecycle: <span className="font-semibold text-slate-800">{electionLifecycle.electionStateName}</span>
                {isLiveLifecycle ? " from contract" : " from metadata"}
              </span>
            </div>
          </div>
        </div>

        <VoterRegistrationPanel registrationState={voterRegistration} />

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Voting Eligibility</h2>
              <p
                className={`mt-2 text-sm ${
                  isRegistrationApproved ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {registrationGateMessage}
              </p>
              {lifecycleGateMessage && (
                <p className="mt-1 text-sm text-slate-600">{lifecycleGateMessage}</p>
              )}
              {isRegistrationApproved && !isProofFixtureCompatible && (
                <p className="mt-1 text-sm text-amber-700">{incompatibleApprovedMessage}</p>
              )}
              {isRegistrationApproved && isProofFixtureCompatible && (
                <p className="mt-1 text-sm text-emerald-700">Proof fixture compatible.</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Approval confirms voter eligibility only. It is not linked to the final candidate choice.
              </p>
            </div>
            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                canSubmitVote
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {canSubmitVote ? "Voting enabled" : "Voting disabled"}
            </span>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <h2 className="text-lg font-bold text-slate-900">Dynamic Vote Readiness</h2>
              <p className="mt-2 text-sm text-slate-600">
                This checks whether dynamic Poseidon vote submission would be safe to enable later. It does not change
                the current fixture-gated Dashboard submit path.
              </p>
            </div>
            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                dynamicReadiness?.severity === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : dynamicReadiness?.severity === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {dynamicReadinessLoading ? "Checking..." : dynamicReadiness?.label ?? "Dynamic readiness unavailable"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-500">Registration scheme</p>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                {voterRegistration.registration
                  ? getRegistrationCommitmentScheme(voterRegistration.registration)
                  : "No registration"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-500">Contract root source</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {contractRoot ? "Live contract read" : "Unavailable until wallet/contract connection"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-500">Dynamic preview root</p>
              <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-900">
                {dynamicReadiness?.dynamicPreviewRoot ?? "Loading..."}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-500">Contract root</p>
              <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-900">
                {dynamicReadiness?.contractRoot ?? "Not available"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-500">Contract root matches dynamic preview</p>
              <p className={`mt-1 text-sm font-semibold ${
                dynamicReadiness?.contractMatchesDynamicPreview ? "text-emerald-700" : "text-amber-700"
              }`}>
                {dynamicReadiness?.contractMatchesDynamicPreview ? "Yes" : "No"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-500">Static fixture root</p>
              <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-900">
                {dynamicReadiness?.staticFixtureRoot ?? "Loading..."}
              </p>
            </div>
          </div>

          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              dynamicReadiness?.severity === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : dynamicReadiness?.severity === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {dynamicReadinessLoading && "Checking dynamic vote readiness..."}
            {dynamicReadinessError && dynamicReadinessError}
            {!dynamicReadinessLoading && !dynamicReadinessError && dynamicReadiness && (
              <div className="space-y-2">
                <div className="font-semibold">{dynamicReadiness.label}</div>
                <ul className="space-y-1">
                  {dynamicReadiness.reasons.map((reason) => (
                    <li key={reason}>- {reason}</li>
                  ))}
                </ul>
                <p className="text-xs">{dynamicReadiness.recommendedAction}</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400"
            >
              Dynamic vote submit not enabled yet
            </button>
            {dynamicReadiness?.isReady && (
              <span className="text-sm font-medium text-emerald-700">
                Ready for a later guarded submit goal.
              </span>
            )}
          </div>
        </section>

        {/* Candidate Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {CANDIDATES.map((candidate) => {
            const isVoted = votedFor === candidate.id;
            
            return (
              <div 
                key={candidate.id}
                className={`flex flex-col bg-white rounded-2xl border ${isVoted ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'} p-6 shadow-sm hover:shadow-md transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2`}
              >
                <div className="flex flex-col items-center text-center flex-1">
                  {/* Avatar */}
                  <div className="relative mb-5">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-50 shadow-sm bg-slate-100">
                      <ImageWithFallback 
                        src={candidate.image} 
                        alt={`Portrait of ${candidate.name}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {isVoted && (
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                        <CheckCircle2 className="w-6 h-6 text-blue-500 fill-blue-50" />
                      </div>
                    )}
                  </div>
                  
                  {/* Candidate Info */}
                  <h2 className="text-xl font-semibold text-slate-900 mb-1">{candidate.name}</h2>
                  <h3 className="text-sm font-medium text-blue-600 mb-3">{candidate.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-1">
                    {candidate.description}
                  </p>
                </div>
                
                {/* Vote Action */}
                <button
                  onClick={() => handleVote(candidate.id, candidate.candidateId)}
                  disabled={!canSubmitVote}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isVoted 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 cursor-default' 
                      : !canSubmitVote
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-transparent'
                        : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-sm focus:ring-blue-500 active:bg-blue-800'
                  }`}
                  aria-pressed={isVoted}
                  aria-label={`Vote for ${candidate.name}`}
                >
                  {isVoted ? 'Vote Recorded' : 'Vote'}
                </button>
              </div>
            );
          })}
        </div>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">Browser Proof Dev Check</h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Generate a Groth16 proof with the local demo registry fixture. The main vote buttons now submit generated calldata; the fixture fallback remains available for candidate {fixtureCandidateId}.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleGenerateBrowserProof}
                disabled={isProofGenerating || isWorking}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProofGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                Generate proof dev check
              </button>
              <button
                onClick={handleFixtureVote}
                disabled={!canSubmitVote}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                Submit fixture fallback
              </button>
            </div>
          </div>

          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              browserProofStatus === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : browserProofStatus === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            {browserProofStatus === "idle" && "Idle. This dev action uses the local demo secret and Merkle path only."}
            {browserProofStatus === "generating" && "Generating proof with /zk/vote.wasm and /zk/vote_final.zkey..."}
            {browserProofStatus === "error" && (browserProofError ?? "Browser proof generation failed.")}
            {browserProofStatus === "success" && browserProofSummary && (
              <div className="space-y-2">
                <div className="font-semibold">Proof generated locally in {browserProofSummary.timingMs}ms.</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <span>candidateId: {BigInt(browserProofSummary.candidateId).toString()}</span>
                  <span>electionId: {BigInt(browserProofSummary.electionId).toString()}</span>
                  <span>merkleRoot: {`${browserProofSummary.merkleRoot.slice(0, 10)}...${browserProofSummary.merkleRoot.slice(-8)}`}</span>
                </div>
                <div className="text-xs text-emerald-700">
                  Public input order: nullifierHash, candidateId, electionId, merkleRoot
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Loading Modal Overlay */}
      <AnimatePresence>
        {isWorking && <ZKPModal />}
      </AnimatePresence>
    </div>
  );
}
