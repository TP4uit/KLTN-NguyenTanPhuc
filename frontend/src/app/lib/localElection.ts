import { BrowserProvider, Contract, type Eip1193Provider } from "ethers";
import electionMetadata from "../../contracts/election.local.json";
import voteCalldata from "../../contracts/vote.calldata.local.json";

type EthereumProvider = Eip1193Provider & {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
};

type ElectionMetadata = {
  network: string;
  chainId: string;
  election: {
    address: string;
  };
  abi: unknown[];
};

export type VoteCalldata = {
  a: string[];
  b: string[][];
  c: string[];
  input: string[];
  candidateId: string;
  nullifierHash: string;
  electionId: string;
  merkleRoot: string;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export const localElection = electionMetadata as ElectionMetadata;
export const localVoteCalldata = voteCalldata as VoteCalldata;

export function getFixtureCandidateId() {
  return Number(BigInt(localVoteCalldata.candidateId));
}

export function formatAccount(account: string) {
  return `${account.slice(0, 6)}...${account.slice(-4)}`;
}

function getRequiredEthereum() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not available. Install MetaMask and connect it to localhost:31337.");
  }

  return window.ethereum;
}

function expectedChainIdHex() {
  return `0x${BigInt(localElection.chainId).toString(16)}`;
}

export async function ensureLocalChain(ethereum = getRequiredEthereum()) {
  const expected = expectedChainIdHex();
  const current = await ethereum.request({ method: "eth_chainId" });

  if (typeof current === "string" && current.toLowerCase() === expected.toLowerCase()) {
    return;
  }

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: expected }],
    });
  } catch (error) {
    const code = (error as { code?: number }).code;

    if (code !== 4902) {
      throw error;
    }

    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: expected,
          chainName: "Hardhat Localhost",
          nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: ["http://127.0.0.1:8545"],
        },
      ],
    });
  }
}

export async function connectLocalElection() {
  const ethereum = getRequiredEthereum();
  await ensureLocalChain(ethereum);
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });

  if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
    throw new Error("No MetaMask account was selected.");
  }

  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  const contract = new Contract(localElection.election.address, localElection.abi, signer);

  return {
    account: accounts[0],
    contract,
    provider,
    signer,
  };
}

export async function getConnectedLocalElection() {
  const ethereum = getRequiredEthereum();
  const accounts = await ethereum.request({ method: "eth_accounts" });

  if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
    return null;
  }

  await ensureLocalChain(ethereum);
  const provider = new BrowserProvider(ethereum);
  const contract = new Contract(localElection.election.address, localElection.abi, provider);

  return {
    account: accounts[0],
    contract,
    provider,
  };
}
