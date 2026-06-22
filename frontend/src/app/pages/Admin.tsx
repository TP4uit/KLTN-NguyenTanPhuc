import { AlertCircle, AlertTriangle, CheckCircle2, KeyRound, Loader2, Lock, RefreshCw, Shield, Wallet, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminDynamicProofInputPreview } from "../components/AdminDynamicProofInputPreview";
import { AdminMerkleRootAlignment } from "../components/AdminMerkleRootAlignment";
import { AdminRegistryPreview } from "../components/AdminRegistryPreview";
import { AdminVoterRegistrationManager } from "../components/AdminVoterRegistrationManager";
import { DashboardHeader } from "../components/DashboardHeader";
import {
  buildMerkleRootAlignment,
  classifyOpenElectionReadiness,
  classifyMerkleRootInput,
  type MerkleRootAlignment,
} from "../lib/merkleRootAlignment";
import { VOTER_REGISTRATIONS_CHANGED_EVENT } from "../lib/localVoterRegistration";
import {
  connectLocalElection,
  formatAccount,
  formatLongValue,
  getConnectedLocalElection,
  getMetadataElectionLifecycle,
  localElection,
  readElectionAdminState,
  type ElectionAdminState,
} from "../lib/localElection";

type AdminStatus = "idle" | "loading" | "pending" | "success" | "error";

const POSEIDON_RUNTIME_ERROR = "Poseidon registry preview failed to load in browser runtime.";

export function Admin() {
  const [account, setAccount] = useState<string | null>(null);
  const [adminState, setAdminState] = useState<ElectionAdminState | null>(null);
  const [newRoot, setNewRoot] = useState("");
  const [alignment, setAlignment] = useState<MerkleRootAlignment | null>(null);
  const [alignmentError, setAlignmentError] = useState<string | null>(null);
  const [showRootConfirmation, setShowRootConfirmation] = useState(false);
  const [showOpenConfirmation, setShowOpenConfirmation] = useState(false);
  const [status, setStatus] = useState<AdminStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("Connect MetaMask to manage the local election lifecycle.");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const metadataLifecycle = getMetadataElectionLifecycle();
  const lifecycle = adminState ?? {
    ...metadataLifecycle,
    admin: "Not connected",
    electionId: localElection.electionId,
    merkleRoot: localElection.merkleRoot,
    isAdmin: false,
  };
  const isBusy = status === "loading" || status === "pending";
  const normalizedRoot = newRoot.trim();
  const rootIsNumeric = useMemo(() => /^\d+$/.test(normalizedRoot), [normalizedRoot]);
  const rootIsNonZero = useMemo(() => {
    if (!rootIsNumeric) {
      return false;
    }

    return BigInt(normalizedRoot) > 0n;
  }, [normalizedRoot, rootIsNumeric]);
  const canManage = adminState?.isAdmin === true;
  const canSetRoot = canManage && lifecycle.electionState === 0 && rootIsNonZero && !isBusy;
  const canOpen = canManage && lifecycle.electionState === 0 && !isBusy;
  const canClose = canManage && lifecycle.electionState === 1 && !isBusy;
  const rootClassification = useMemo(
    () => classifyMerkleRootInput(normalizedRoot, alignment),
    [alignment, normalizedRoot],
  );
  const openReadiness = useMemo(
    () => classifyOpenElectionReadiness(alignment, lifecycle.electionState),
    [alignment, lifecycle.electionState],
  );
  const canConfirmOpen = canOpen && openReadiness.severity !== "blocked";

  const updateNewRoot = (root: string) => {
    setNewRoot(root);
    setShowRootConfirmation(false);
  };

  const loadExistingConnection = async () => {
    try {
      const connection = await getConnectedLocalElection();

      if (!connection) {
        return;
      }

      const state = await readElectionAdminState(connection.contract, connection.account);
      setAccount(connection.account);
      setAdminState(state);
      setStatus("idle");
      setStatusMessage("Loaded current election lifecycle state.");
    } catch (error) {
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Unable to read election state.");
    }
  };

  useEffect(() => {
    void loadExistingConnection();
  }, []);

  const refreshAlignment = useCallback(async () => {
    try {
      const nextAlignment = await buildMerkleRootAlignment(lifecycle.merkleRoot);
      setAlignment(nextAlignment);
      setAlignmentError(null);
    } catch (error) {
      setAlignment(null);
      setAlignmentError(
        `${POSEIDON_RUNTIME_ERROR} ${error instanceof Error ? error.message : "Unable to load Merkle root alignment."}`,
      );
    }
  }, [lifecycle.merkleRoot]);

  useEffect(() => {
    let isMounted = true;

    buildMerkleRootAlignment(lifecycle.merkleRoot)
      .then((nextAlignment) => {
        if (!isMounted) {
          return;
        }

        setAlignment(nextAlignment);
        setAlignmentError(null);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setAlignment(null);
        setAlignmentError(
          `${POSEIDON_RUNTIME_ERROR} ${error instanceof Error ? error.message : "Unable to load Merkle root alignment."}`,
        );
      });

    return () => {
      isMounted = false;
    };
  }, [lifecycle.merkleRoot]);

  useEffect(() => {
    const handleRegistrationsChanged = () => {
      void refreshAlignment();
    };

    window.addEventListener(VOTER_REGISTRATIONS_CHANGED_EVENT, handleRegistrationsChanged);

    return () => {
      window.removeEventListener(VOTER_REGISTRATIONS_CHANGED_EVENT, handleRegistrationsChanged);
    };
  }, [refreshAlignment]);

  const connectAndRefresh = async () => {
    setStatus("loading");
    setLastTxHash(null);

    try {
      const connection = await connectLocalElection();
      const state = await readElectionAdminState(connection.contract, connection.account);
      setAccount(connection.account);
      setAdminState(state);
      setStatus("idle");
      setStatusMessage("Connected and refreshed election state.");
    } catch (error) {
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Unable to connect MetaMask.");
    }
  };

  const refreshState = async () => {
    setStatus("loading");
    setLastTxHash(null);

    try {
      const connection = await connectLocalElection();
      const state = await readElectionAdminState(connection.contract, connection.account);
      setAccount(connection.account);
      setAdminState(state);
      setStatus("idle");
      setStatusMessage("Election state refreshed.");
    } catch (error) {
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Unable to refresh election state.");
    }
  };

  const runAdminTransaction = async (
    label: string,
    action: (contract: Awaited<ReturnType<typeof connectLocalElection>>["contract"]) => Promise<{ hash: string; wait: () => Promise<{ hash?: string } | null> }>,
  ) => {
    setStatus("pending");
    setStatusMessage(`${label} transaction is pending in MetaMask.`);
    setLastTxHash(null);

    try {
      const connection = await connectLocalElection();
      const before = await readElectionAdminState(connection.contract, connection.account);

      if (!before.isAdmin) {
        throw new Error("Only admin can manage election lifecycle.");
      }

      const tx = await action(connection.contract);
      const receipt = await tx.wait();
      const state = await readElectionAdminState(connection.contract, connection.account);

      setAccount(connection.account);
      setAdminState(state);
      setLastTxHash(receipt?.hash ?? tx.hash);
      setStatus("success");
      setStatusMessage(`${label} confirmed.`);
      if (label === "setMerkleRoot") {
        setShowRootConfirmation(false);
      }
      if (label === "openElection") {
        setShowOpenConfirmation(false);
      }
    } catch (error) {
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : `${label} failed.`);
    }
  };

  const handleSetMerkleRoot = async () => {
    if (!rootIsNumeric) {
      setStatus("error");
      setStatusMessage("Merkle root must be a numeric value.");
      return;
    }

    if (!rootIsNonZero) {
      setStatus("error");
      setStatusMessage("Merkle root must be greater than zero.");
      return;
    }

    if (!canManage) {
      setStatus("error");
      setStatusMessage("Only admin can manage election lifecycle.");
      return;
    }

    if (lifecycle.electionState !== 0) {
      setStatus("error");
      setStatusMessage("setMerkleRoot is only available during Registration state.");
      return;
    }

    setShowRootConfirmation(true);
    setStatus("idle");
    setStatusMessage("Review and confirm the Merkle root before submitting setMerkleRoot.");
  };

  const handleConfirmSetMerkleRoot = async () => {
    if (!canSetRoot) {
      setStatus("error");
      setStatusMessage("setMerkleRoot is only available for the admin during Registration with a valid root.");
      return;
    }

    await runAdminTransaction("setMerkleRoot", (contract) => contract.setMerkleRoot(normalizedRoot));
  };

  const handleOpenElection = () => {
    if (!canManage) {
      setStatus("error");
      setStatusMessage("Only admin can manage election lifecycle.");
      return;
    }

    if (lifecycle.electionState !== 0) {
      setStatus("error");
      setStatusMessage("openElection is only available during Registration state.");
      return;
    }

    setShowOpenConfirmation(true);
    setStatus("idle");
    setStatusMessage("Review Open Election Readiness before submitting openElection.");
  };

  const handleConfirmOpenElection = async () => {
    if (openReadiness.severity === "blocked") {
      setStatus("error");
      setStatusMessage("openElection is blocked until readiness issues are resolved.");
      return;
    }

    if (!canOpen) {
      setStatus("error");
      setStatusMessage("openElection is only available for the admin during Registration.");
      return;
    }

    await runAdminTransaction("openElection", (contract) => contract.openElection());
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Shield className="h-5 w-5" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">Admin Election Control</h1>
            </div>
            <p className="text-lg text-slate-600 max-w-3xl">
              Manage the local election lifecycle and Merkle root for the demo contract.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={connectAndRefresh}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              {account ? formatAccount(account) : "Connect MetaMask"}
            </button>
            <button
              onClick={refreshState}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh state
            </button>
          </div>
        </div>

        <div
          className={`mb-8 rounded-2xl border px-4 py-3 text-sm ${
            status === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          <div className="flex items-start gap-2">
            {status === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : status === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : isBusy ? (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <div>{statusMessage}</div>
              {lastTxHash && (
                <div className="mt-1 font-mono text-xs">
                  tx: {lastTxHash.slice(0, 12)}...{lastTxHash.slice(-10)}
                </div>
              )}
            </div>
          </div>
        </div>

        {account && !canManage && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Only admin can manage election lifecycle.</span>
          </div>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-2">Election State</p>
            <div className="flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  lifecycle.electionState === 1
                    ? "bg-emerald-500"
                    : lifecycle.electionState === 2
                      ? "bg-slate-400"
                      : "bg-amber-500"
                }`}
              />
              <p className="text-2xl font-bold text-slate-900">{lifecycle.electionStateName}</p>
            </div>
            <p className="mt-2 text-xs text-slate-500">Numeric state: {lifecycle.electionState}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-2">Connected Wallet</p>
            <p className="text-lg font-semibold text-slate-900 font-mono break-all">
              {account ?? "Not connected"}
            </p>
            <p className="mt-2 text-xs text-slate-500">{canManage ? "Admin permissions active" : "Read-only access"}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-2">Contract</p>
            <p className="text-lg font-semibold text-slate-900 font-mono break-all">
              {localElection.election.address}
            </p>
            <p className="mt-2 text-xs text-slate-500">Chain ID {localElection.chainId}</p>
          </div>
        </section>

        <AdminVoterRegistrationManager />
        <AdminRegistryPreview />
        <AdminDynamicProofInputPreview />

        <AdminMerkleRootAlignment
          contractRoot={lifecycle.merkleRoot}
          onUseFixtureRoot={updateNewRoot}
        />

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-5">Contract State</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-slate-500 mb-1">Admin address</p>
                <p className="font-mono text-slate-900 break-all">{lifecycle.admin}</p>
              </div>
              <div>
                <p className="font-medium text-slate-500 mb-1">Connected wallet is admin</p>
                <p className={canManage ? "font-semibold text-emerald-700" : "font-semibold text-slate-700"}>
                  {canManage ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-500 mb-1">Election ID</p>
                <p className="font-mono text-slate-900">{lifecycle.electionId}</p>
              </div>
              <div>
                <p className="font-medium text-slate-500 mb-1">Merkle root</p>
                <p className="font-mono text-slate-900 break-all">{lifecycle.merkleRoot}</p>
                <p className="mt-1 text-xs text-slate-500">{formatLongValue(lifecycle.merkleRoot)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-5">Lifecycle Actions</h2>
            <div className="space-y-5">
              <div>
                <label htmlFor="merkle-root" className="block text-sm font-medium text-slate-700 mb-2">
                  New Merkle root
                </label>
                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    onClick={() => alignment && updateNewRoot(alignment.fixtureRoot)}
                    disabled={!alignment || isBusy}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Use static proof fixture root
                    <span className="mt-1 block text-xs font-normal text-emerald-700">
                      Recommended for current browser proof demo
                    </span>
                  </button>
                  <button
                    onClick={() => alignment && updateNewRoot(alignment.previewRoot)}
                    disabled={!alignment || isBusy}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Use Poseidon preview-only root
                    <span className="mt-1 block text-xs font-normal text-amber-700">
                      Preview-only, not proof-compatible yet
                    </span>
                  </button>
                  <button
                    onClick={() => updateNewRoot("")}
                    disabled={isBusy || !newRoot}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    id="merkle-root"
                    value={newRoot}
                    onChange={(event) => {
                      setNewRoot(event.target.value);
                      setShowRootConfirmation(false);
                    }}
                    inputMode="numeric"
                    placeholder="Enter non-zero numeric root"
                    disabled={isBusy || lifecycle.electionState !== 0 || !canManage}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-mono text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  />
                  <button
                    onClick={handleSetMerkleRoot}
                    disabled={!canSetRoot}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Set root
                  </button>
                </div>
                <div
                  className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
                    rootClassification.kind === "FIXTURE"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : rootClassification.kind === "EMPTY"
                        ? "border-slate-200 bg-slate-50 text-slate-600"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  <div className="font-semibold">{rootClassification.label}</div>
                  {rootClassification.warning && (
                    <div className="mt-1 flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{rootClassification.warning}</span>
                    </div>
                  )}
                  {alignmentError && <div className="mt-1 text-red-700">{alignmentError}</div>}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Available only during Registration and only for the admin wallet.
                </p>
                {showRootConfirmation && (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    <div className="mb-3 flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-semibold">Confirm setMerkleRoot</div>
                        <p className="mt-1">
                          setMerkleRoot only works during Registration state. Current election state:{" "}
                          <span className="font-semibold">{lifecycle.electionStateName}</span>.
                        </p>
                      </div>
                    </div>
                    <dl className="space-y-3">
                      <div>
                        <dt className="font-medium">Selected root</dt>
                        <dd className="mt-1 break-all font-mono text-xs text-slate-950">{normalizedRoot}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Root classification</dt>
                        <dd className="mt-1 font-semibold">{rootClassification.label}</dd>
                      </div>
                    </dl>
                    {rootClassification.warning && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                        {rootClassification.warning}
                      </div>
                    )}
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={handleConfirmSetMerkleRoot}
                        disabled={!canSetRoot}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Confirm and submit setMerkleRoot
                      </button>
                      <button
                        onClick={() => {
                          setShowRootConfirmation(false);
                          setStatus("idle");
                          setStatusMessage("setMerkleRoot cancelled before submission.");
                        }}
                        disabled={isBusy}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`rounded-xl border px-4 py-4 text-sm ${
                  openReadiness.severity === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : openReadiness.severity === "blocked"
                      ? "border-red-200 bg-red-50 text-red-900"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                <div className="mb-3 flex items-start gap-2">
                  {openReadiness.severity === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold">Open Election Readiness</div>
                    <p className="mt-1">
                      For the current browser proof demo, open election only after contract root matches the static proof
                      fixture root.
                    </p>
                  </div>
                </div>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="font-medium">Current election state</dt>
                    <dd className="mt-1 font-semibold">{lifecycle.electionStateName}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Contract root status</dt>
                    <dd className="mt-1 font-semibold">{openReadiness.label}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Browser proof demo should work</dt>
                    <dd className="mt-1 font-semibold">{openReadiness.canOpenSafely ? "Yes" : "No"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Contract root</dt>
                    <dd className="mt-1 break-all font-mono text-xs text-slate-950">{lifecycle.merkleRoot}</dd>
                  </div>
                </dl>
                {openReadiness.warnings.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {openReadiness.warnings.map((warning) => (
                      <li key={warning} className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {showOpenConfirmation && (
                <div
                  className={`rounded-xl border p-4 text-sm ${
                    openReadiness.severity === "blocked"
                      ? "border-red-200 bg-red-50 text-red-900"
                      : openReadiness.severity === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-emerald-200 bg-emerald-50 text-emerald-900"
                  }`}
                >
                  <div className="mb-3 flex items-start gap-2">
                    {openReadiness.severity === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold">Confirm openElection</div>
                      <p className="mt-1">
                        Review the current root before opening the election. Warnings are allowed, but blocked readiness
                        must be resolved first.
                      </p>
                    </div>
                  </div>
                  <dl className="space-y-3">
                    <div>
                      <dt className="font-medium">Current election state</dt>
                      <dd className="mt-1 font-semibold">{lifecycle.electionStateName}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Contract root</dt>
                      <dd className="mt-1 break-all font-mono text-xs text-slate-950">{lifecycle.merkleRoot}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Readiness</dt>
                      <dd className="mt-1 font-semibold">{openReadiness.label}</dd>
                    </div>
                  </dl>
                  {openReadiness.warnings.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {openReadiness.warnings.map((warning) => (
                        <li key={warning} className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => {
                        setShowOpenConfirmation(false);
                        setStatus("idle");
                        setStatusMessage("openElection cancelled before submission.");
                      }}
                      disabled={isBusy}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmOpenElection}
                      disabled={!canConfirmOpen}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Confirm openElection
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleOpenElection}
                  disabled={!canOpen}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Open election
                </button>
                <button
                  onClick={() => runAdminTransaction("closeElection", (contract) => contract.closeElection())}
                  disabled={!canClose}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Close election
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Buttons are disabled unless the connected wallet is the contract admin and the election is in the matching lifecycle state.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
