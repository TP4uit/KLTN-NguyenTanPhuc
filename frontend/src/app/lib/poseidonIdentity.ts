import type { Poseidon } from "circomlibjs";

const BN254_FIELD_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

let poseidonPromise: Promise<Poseidon> | null = null;

function getPoseidon() {
  poseidonPromise ??= import("circomlibjs-poseidon-wasm").then(({ buildPoseidon }) => buildPoseidon());
  return poseidonPromise;
}

function normalizeFieldInput(value: string | number | bigint) {
  if (typeof value === "bigint") {
    return (value % BN254_FIELD_MODULUS).toString();
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error("Poseidon input must be an integer field value.");
    }

    return (BigInt(value) % BN254_FIELD_MODULUS).toString();
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error("Poseidon input is required.");
  }

  if (/^0x[0-9a-fA-F]+$/.test(normalized)) {
    return (BigInt(normalized) % BN254_FIELD_MODULUS).toString();
  }

  if (/^\d+$/.test(normalized)) {
    return (BigInt(normalized) % BN254_FIELD_MODULUS).toString();
  }

  if (/^[0-9a-fA-F]+$/.test(normalized)) {
    return (BigInt(`0x${normalized}`) % BN254_FIELD_MODULUS).toString();
  }

  throw new Error("Poseidon input must be a decimal or hexadecimal field value.");
}

async function poseidonHash(inputs: Array<string | number | bigint>) {
  const poseidon = await getPoseidon();
  const normalizedInputs = inputs.map(normalizeFieldInput);

  return poseidon.F.toString(poseidon(normalizedInputs));
}

// Demo/local ZK identity derivation only, not production key management.
export async function derivePoseidonIdentityCommitment(secretKey: string) {
  return poseidonHash([secretKey]);
}

export async function derivePoseidonNullifierHash(secretKey: string, electionId: string) {
  return poseidonHash([secretKey, electionId]);
}

export async function poseidonHashPair(left: string, right: string) {
  return poseidonHash([left, right]);
}
