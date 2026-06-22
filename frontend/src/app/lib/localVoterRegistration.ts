import { localElection } from "./localElection";
import registryFixture from "../../contracts/registry.local.json";
import type {
  ApprovedCommitmentEvidence,
  CommitmentScheme,
  CreatePendingRegistrationInput,
  LocalIdentitySecret,
  RegistrationEvidence,
  VoterRegistration,
} from "./voterRegistrationModel";

const REGISTRATIONS_KEY = "zkvote.voterRegistrations";
const IDENTITY_SECRETS_KEY = "zkvote.localIdentitySecrets";

export const currentElectionId = localElection.electionId;
export const VOTER_REGISTRATIONS_CHANGED_EVENT = "zkvote:voterRegistrationsChanged";

type RegistryFixture = {
  selectedIdentityCommitment: string;
  selectedElectionId: string;
};

const localRegistryFixture = registryFixture as RegistryFixture;

function getStorage() {
  if (typeof window === "undefined") {
    throw new Error("Voter registration storage is only available in the browser.");
  }

  try {
    return window.localStorage;
  } catch {
    throw new Error("Browser storage is unavailable. Enable localStorage to use voter registration.");
  }
}

function readJson<T>(key: string, fallback: T): T {
  const rawValue = getStorage().getItem(key);

  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    getStorage().removeItem(key);
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  getStorage().setItem(key, JSON.stringify(value));
}

function normalizeRequiredText(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function normalizeElectionId(electionId?: string) {
  return normalizeRequiredText(electionId ?? currentElectionId, "Election ID");
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeCommitmentScheme(registration: VoterRegistration): CommitmentScheme {
  if (registration.commitmentScheme) {
    return registration.commitmentScheme;
  }

  if (
    registration.identityCommitment === localRegistryFixture.selectedIdentityCommitment &&
    registration.electionId === localRegistryFixture.selectedElectionId
  ) {
    return "FIXTURE_POSEIDON";
  }

  return "SHA256_DEMO";
}

export function getRegistrationCommitmentScheme(registration: VoterRegistration): CommitmentScheme {
  return normalizeCommitmentScheme(registration);
}

function normalizeRegistration(registration: VoterRegistration): VoterRegistration {
  return {
    ...registration,
    commitmentScheme: normalizeCommitmentScheme(registration),
  };
}

function readRegistrations() {
  return readJson<VoterRegistration[]>(REGISTRATIONS_KEY, []).map(normalizeRegistration);
}

function writeRegistrations(registrations: VoterRegistration[]) {
  writeJson(REGISTRATIONS_KEY, registrations);
  window.dispatchEvent(new Event(VOTER_REGISTRATIONS_CHANGED_EVENT));
}

function readIdentitySecrets() {
  return readJson<LocalIdentitySecret[]>(IDENTITY_SECRETS_KEY, []);
}

function writeIdentitySecrets(secrets: LocalIdentitySecret[]) {
  writeJson(IDENTITY_SECRETS_KEY, secrets);
}

function findRegistrationIndex(registrations: VoterRegistration[], registrationId: string) {
  const normalizedRegistrationId = normalizeRequiredText(registrationId, "Registration ID");
  const index = registrations.findIndex((registration) => registration.id === normalizedRegistrationId);

  if (index < 0) {
    throw new Error("Voter registration was not found.");
  }

  return index;
}

function assertPendingRegistration(registration: VoterRegistration) {
  if (registration.status !== "PENDING") {
    throw new Error("Only pending voter registrations can be reviewed.");
  }
}

export function getRegistrationForCurrentUser(electionId: string, userId: string): VoterRegistration | null;
export function getRegistrationForCurrentUser(userId: string): VoterRegistration | null;
export function getRegistrationForCurrentUser(electionIdOrUserId: string, userId?: string) {
  const normalizedElectionId = userId ? normalizeElectionId(electionIdOrUserId) : currentElectionId;
  const normalizedUserId = normalizeRequiredText(userId ?? electionIdOrUserId, "User ID");

  return (
    readRegistrations().find(
      (registration) =>
        registration.electionId === normalizedElectionId && registration.userId === normalizedUserId,
    ) ?? null
  );
}

export function createPendingRegistration(input: CreatePendingRegistrationInput): VoterRegistration {
  const userId = normalizeRequiredText(input.userId, "User ID");
  const electionId = normalizeElectionId(input.electionId);
  const identityCommitment = normalizeRequiredText(input.identityCommitment, "Identity commitment");
  const commitmentScheme = input.commitmentScheme;
  const registrations = readRegistrations();

  if (
    registrations.some(
      (registration) => registration.userId === userId && registration.electionId === electionId,
    )
  ) {
    throw new Error("This user already has a registration for the current election.");
  }

  const registration: VoterRegistration = {
    id: createId("registration"),
    userId,
    electionId,
    status: "PENDING",
    identityCommitment,
    commitmentScheme,
    createdAt: new Date().toISOString(),
  };

  writeRegistrations([...registrations, registration]);
  return registration;
}

export function listRegistrations(electionId = currentElectionId): VoterRegistration[] {
  const normalizedElectionId = normalizeElectionId(electionId);

  return readRegistrations().filter((registration) => registration.electionId === normalizedElectionId);
}

export function getApprovedCommitments(electionId = currentElectionId): ApprovedCommitmentEvidence[] {
  return listRegistrations(electionId)
    .filter((registration) => registration.status === "APPROVED")
    .map((registration) => {
      const reviewedAt = registration.reviewedAt ?? registration.createdAt;

      return {
        registrationId: registration.id,
        identityCommitment: registration.identityCommitment,
        commitmentScheme: getRegistrationCommitmentScheme(registration),
        approvedAt: reviewedAt,
        reviewedAt,
      };
    });
}

export function buildRegistrationEvidence(electionId = currentElectionId): RegistrationEvidence {
  const registrations = listRegistrations(electionId);

  return {
    electionId: normalizeElectionId(electionId),
    generatedAt: new Date().toISOString(),
    totalRegistrations: registrations.length,
    pendingCount: registrations.filter((registration) => registration.status === "PENDING").length,
    approvedCount: registrations.filter((registration) => registration.status === "APPROVED").length,
    rejectedCount: registrations.filter((registration) => registration.status === "REJECTED").length,
    approvedCommitments: getApprovedCommitments(electionId),
  };
}

export function approveRegistration(registrationId: string, adminUserId: string): VoterRegistration {
  const registrations = readRegistrations();
  const registrationIndex = findRegistrationIndex(registrations, registrationId);
  assertPendingRegistration(registrations[registrationIndex]);
  const reviewedBy = normalizeRequiredText(adminUserId, "Admin user ID");
  const updatedRegistration: VoterRegistration = {
    ...registrations[registrationIndex],
    status: "APPROVED",
    reviewedAt: new Date().toISOString(),
    reviewedBy,
    rejectionReason: undefined,
  };
  const nextRegistrations = [...registrations];
  nextRegistrations[registrationIndex] = updatedRegistration;
  writeRegistrations(nextRegistrations);

  return updatedRegistration;
}

export function rejectRegistration(
  registrationId: string,
  adminUserId: string,
  rejectionReason: string,
): VoterRegistration {
  const registrations = readRegistrations();
  const registrationIndex = findRegistrationIndex(registrations, registrationId);
  assertPendingRegistration(registrations[registrationIndex]);
  const reviewedBy = normalizeRequiredText(adminUserId, "Admin user ID");
  const normalizedRejectionReason = normalizeRequiredText(rejectionReason, "Rejection reason");
  const updatedRegistration: VoterRegistration = {
    ...registrations[registrationIndex],
    status: "REJECTED",
    reviewedAt: new Date().toISOString(),
    reviewedBy,
    rejectionReason: normalizedRejectionReason,
  };
  const nextRegistrations = [...registrations];
  nextRegistrations[registrationIndex] = updatedRegistration;
  writeRegistrations(nextRegistrations);

  return updatedRegistration;
}

export function getIdentitySecret(userId: string, electionId = currentElectionId): LocalIdentitySecret | null {
  const normalizedUserId = normalizeRequiredText(userId, "User ID");
  const normalizedElectionId = normalizeElectionId(electionId);

  return (
    readIdentitySecrets().find(
      (secret) => secret.userId === normalizedUserId && secret.electionId === normalizedElectionId,
    ) ?? null
  );
}

export function saveIdentitySecret(userId: string, electionId: string, secret: string): LocalIdentitySecret;
export function saveIdentitySecret(userId: string, secret: string): LocalIdentitySecret;
export function saveIdentitySecret(userId: string, electionIdOrSecret: string, secret?: string): LocalIdentitySecret {
  const normalizedUserId = normalizeRequiredText(userId, "User ID");
  const normalizedElectionId = secret ? normalizeElectionId(electionIdOrSecret) : currentElectionId;
  const normalizedSecret = normalizeRequiredText(secret ?? electionIdOrSecret, "Identity secret");
  const secrets = readIdentitySecrets();
  const existingSecretIndex = secrets.findIndex(
    (candidate) => candidate.userId === normalizedUserId && candidate.electionId === normalizedElectionId,
  );
  const nextSecret: LocalIdentitySecret = {
    userId: normalizedUserId,
    electionId: normalizedElectionId,
    secret: normalizedSecret,
    createdAt: new Date().toISOString(),
  };

  if (existingSecretIndex < 0) {
    writeIdentitySecrets([...secrets, nextSecret]);
    return nextSecret;
  }

  const nextSecrets = [...secrets];
  nextSecrets[existingSecretIndex] = {
    ...nextSecret,
    createdAt: secrets[existingSecretIndex].createdAt,
  };
  writeIdentitySecrets(nextSecrets);

  return nextSecrets[existingSecretIndex];
}
