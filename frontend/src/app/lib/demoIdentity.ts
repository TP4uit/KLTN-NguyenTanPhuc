const DEMO_FIELD_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getRequiredCrypto() {
  if (!globalThis.crypto || !globalThis.crypto.getRandomValues || !globalThis.crypto.subtle) {
    throw new Error("Browser crypto APIs are required for demo identity onboarding.");
  }

  return globalThis.crypto;
}

export function generateDemoIdentitySecret() {
  const randomBytes = new Uint8Array(32);
  getRequiredCrypto().getRandomValues(randomBytes);

  return bytesToHex(randomBytes);
}

export async function deriveDemoIdentityCommitment(secret: string, electionId: string, userId: string) {
  const normalizedSecret = secret.trim();
  const normalizedElectionId = electionId.trim();
  const normalizedUserId = userId.trim();

  if (!normalizedSecret || !normalizedElectionId || !normalizedUserId) {
    throw new Error("Secret, election ID, and user ID are required to derive a demo identity commitment.");
  }

  // Demo onboarding state only. This deterministic browser hash is not yet replacing
  // the existing circuit/registry fixture or production identity commitment flow.
  const encodedInput = new TextEncoder().encode(`${normalizedSecret}:${normalizedElectionId}:${normalizedUserId}`);
  const digest = await getRequiredCrypto().subtle.digest("SHA-256", encodedInput);
  const commitment = BigInt(`0x${bytesToHex(new Uint8Array(digest))}`) % DEMO_FIELD_MODULUS;

  return commitment.toString();
}
