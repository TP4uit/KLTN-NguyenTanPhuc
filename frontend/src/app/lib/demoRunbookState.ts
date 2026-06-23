import { VOTER_REGISTRATIONS_CHANGED_EVENT } from "./localVoterRegistration";

export type DemoRunbookResetKind =
  | "registrations"
  | "identitySecrets"
  | "session"
  | "votingState"
  | "all";

export type DemoRunbookState = {
  registrationsKey: string;
  identitySecretsKey: string;
  demoSessionKeys: string[];
  demoAuthUserKeys: string[];
  demoVotingStateKeys: string[];
  auditPreviewCacheKeys: string[];
  resetPlans: Record<DemoRunbookResetKind, string[]>;
  presentKeys: string[];
};

export const DEMO_REGISTRATIONS_KEY = "zkvote.voterRegistrations";
export const DEMO_IDENTITY_SECRETS_KEY = "zkvote.localIdentitySecrets";
export const DEMO_AUTH_USERS_KEY = "zkvote.demoAuth.users";
export const DEMO_AUTH_SESSION_KEY = "zkvote.demoAuth.session";

const DEMO_SESSION_KEYS = [DEMO_AUTH_SESSION_KEY];
const DEMO_AUTH_USER_KEYS = [DEMO_AUTH_USERS_KEY];
const DEMO_VOTING_STATE_KEYS: string[] = [];
const AUDIT_PREVIEW_CACHE_KEYS: string[] = [];

function getStorage() {
  if (typeof window === "undefined") {
    throw new Error("Demo runbook reset controls are only available in the browser.");
  }

  try {
    return window.localStorage;
  } catch {
    throw new Error("Browser storage is unavailable. Enable localStorage to reset local demo state.");
  }
}

function uniqueKeys(keys: string[]) {
  return Array.from(new Set(keys));
}

function dispatchDemoStateEvents(keys: string[]) {
  if (keys.includes(DEMO_REGISTRATIONS_KEY)) {
    window.dispatchEvent(new Event(VOTER_REGISTRATIONS_CHANGED_EVENT));
  }

  if (typeof CustomEvent !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("zkvote:demoRunbookStateReset", {
        detail: { clearedKeys: keys },
      }),
    );
  } else {
    window.dispatchEvent(new Event("zkvote:demoRunbookStateReset"));
  }
}

function removeKeys(keys: string[]) {
  const storage = getStorage();
  const clearedKeys = uniqueKeys(keys);

  clearedKeys.forEach((key) => storage.removeItem(key));
  dispatchDemoStateEvents(clearedKeys);

  return clearedKeys;
}

function buildResetPlans() {
  return {
    registrations: [DEMO_REGISTRATIONS_KEY],
    identitySecrets: [DEMO_IDENTITY_SECRETS_KEY],
    session: DEMO_SESSION_KEYS,
    votingState: DEMO_VOTING_STATE_KEYS,
    all: uniqueKeys([
      DEMO_REGISTRATIONS_KEY,
      DEMO_IDENTITY_SECRETS_KEY,
      ...DEMO_SESSION_KEYS,
      ...DEMO_AUTH_USER_KEYS,
      ...DEMO_VOTING_STATE_KEYS,
      ...AUDIT_PREVIEW_CACHE_KEYS,
    ]),
  };
}

export function getDemoRunbookState(): DemoRunbookState {
  const storage = getStorage();
  const resetPlans = buildResetPlans();
  const knownKeys = uniqueKeys(Object.values(resetPlans).flat());

  return {
    registrationsKey: DEMO_REGISTRATIONS_KEY,
    identitySecretsKey: DEMO_IDENTITY_SECRETS_KEY,
    demoSessionKeys: DEMO_SESSION_KEYS,
    demoAuthUserKeys: DEMO_AUTH_USER_KEYS,
    demoVotingStateKeys: DEMO_VOTING_STATE_KEYS,
    auditPreviewCacheKeys: AUDIT_PREVIEW_CACHE_KEYS,
    resetPlans,
    presentKeys: knownKeys.filter((key) => storage.getItem(key) !== null),
  };
}

export function resetLocalDemoRegistrations() {
  return removeKeys(buildResetPlans().registrations);
}

export function resetLocalIdentitySecrets() {
  return removeKeys(buildResetPlans().identitySecrets);
}

export function resetLocalDemoSession() {
  return removeKeys(buildResetPlans().session);
}

export function resetLocalDemoVotingState() {
  return removeKeys(buildResetPlans().votingState);
}

export function resetAllLocalDemoState() {
  return removeKeys(buildResetPlans().all);
}
