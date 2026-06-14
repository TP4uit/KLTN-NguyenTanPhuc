import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

type VoteCalldata = {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
  // Public input order: nullifierHash, candidateId, electionId, merkleRoot.
  input: [string, string, string, string];
  publicSignals: [string, string, string, string];
  nullifierHash: string;
  candidateId: string;
  electionId: string;
  merkleRoot: string;
};

const testDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(testDir, "..");
const voteCalldata = JSON.parse(
  readFileSync(resolve(testDir, "fixtures", "vote", "calldata.json"), "utf8"),
) as VoteCalldata;
const registryFixture = JSON.parse(
  readFileSync(resolve(testDir, "fixtures", "registry", "registry.json"), "utf8"),
);

const nullifierHash = BigInt(voteCalldata.input[0]);
const candidateId = BigInt(voteCalldata.input[1]);
const electionId = BigInt(voteCalldata.input[2]);
const merkleRoot = BigInt(voteCalldata.input[3]);
const registryMerkleRoot = BigInt(registryFixture.merkleRoot);
const electionStates = {
  Registration: 0n,
  Open: 1n,
  Closed: 2n,
};

function toPublicSignal(value: bigint): string {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function withCandidateId(candidate: bigint): [string, string, string, string] {
  return [
    voteCalldata.input[0],
    toPublicSignal(candidate),
    voteCalldata.input[2],
    voteCalldata.input[3],
  ];
}

function withElectionId(nextElectionId: bigint): [string, string, string, string] {
  return [
    voteCalldata.input[0],
    voteCalldata.input[1],
    toPublicSignal(nextElectionId),
    voteCalldata.input[3],
  ];
}

function withMerkleRoot(nextMerkleRoot: bigint): [string, string, string, string] {
  return [
    voteCalldata.input[0],
    voteCalldata.input[1],
    voteCalldata.input[2],
    toPublicSignal(nextMerkleRoot),
  ];
}

function expectInvalidProofGeneration(
  env: NodeJS.ProcessEnv,
  mutateRegistry?: (registry: any) => void,
) {
  const tempFixtureDir = mkdtempSync(resolve(tmpdir(), "kltn-invalid-vote-"));
  const tempRegistryPath = resolve(tempFixtureDir, "registry.json");

  try {
    if (mutateRegistry !== undefined) {
      const registry = JSON.parse(
        readFileSync(resolve(testDir, "fixtures", "registry", "registry.json"), "utf8"),
      );
      mutateRegistry(registry);
      writeFileSync(tempRegistryPath, `${JSON.stringify(registry, null, 2)}\n`);
    }

    expect(() =>
      execFileSync(process.execPath, [resolve(rootDir, "scripts", "proof-generate.mjs")], {
        cwd: rootDir,
        env: {
          ...process.env,
          VOTE_FIXTURE_DIR: tempFixtureDir,
          ...(mutateRegistry === undefined ? {} : { REGISTRY_FIXTURE_PATH: tempRegistryPath }),
          ...env,
        },
        stdio: "pipe",
      }),
    ).to.throw();
  } finally {
    rmSync(tempFixtureDir, { force: true, recursive: true });
  }
}

function expectInvalidCandidateWitness(candidate: number) {
  expectInvalidProofGeneration({ VOTE_CANDIDATE_ID: String(candidate) });
}

describe("ZK voting election contract", function () {
  async function deployElectionFixture() {
    const [owner, voter1] = await ethers.getSigners();

    const verifier = await ethers.deployContract("Groth16Verifier");
    const election = await ethers.deployContract("Election", [
      await verifier.getAddress(),
      electionId,
      registryMerkleRoot,
    ]);

    return { election, owner, verifier, voter1 };
  }

  async function castFixtureVote(election: any) {
    return election.castVote(
      voteCalldata.a,
      voteCalldata.b,
      voteCalldata.c,
      voteCalldata.input,
    );
  }

  async function openElection(election: any) {
    await election.openElection();
  }

  it("deploys in registration and stores the election configuration", async function () {
    const { election, owner } = await networkHelpers.loadFixture(
      deployElectionFixture,
    );

    expect(await election.admin()).to.equal(owner.address);
    expect(await election.electionId()).to.equal(electionId);
    expect(await election.merkleRoot()).to.equal(registryMerkleRoot);
    expect(await election.electionState()).to.equal(electionStates.Registration);
    expect(await election.CANDIDATE_COUNT()).to.equal(4n);
    expect(await election.MIN_CANDIDATE_ID()).to.equal(1n);
    expect(await election.MAX_CANDIDATE_ID()).to.equal(4n);
  });

  it("allows the admin to update the Merkle root during registration", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);
    const newRoot = registryMerkleRoot + 123n;

    await expect(election.setMerkleRoot(newRoot))
      .to.emit(election, "MerkleRootUpdated")
      .withArgs(registryMerkleRoot, newRoot);

    expect(await election.merkleRoot()).to.equal(newRoot);
  });

  it("rejects Merkle root updates from non-admins", async function () {
    const { election, voter1 } = await networkHelpers.loadFixture(
      deployElectionFixture,
    );

    const voterElection = election.connect(voter1) as any;

    await expect(voterElection.setMerkleRoot(registryMerkleRoot + 1n)).to.be.revertedWith(
      "Only admin",
    );
  });

  it("rejects a zero Merkle root update", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await expect(election.setMerkleRoot(0n)).to.be.revertedWith(
      "Invalid Merkle root",
    );
  });

  it("does not allow Merkle root updates after the election opens", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await openElection(election);

    await expect(election.setMerkleRoot(registryMerkleRoot + 1n)).to.be.revertedWith(
      "Election not in registration",
    );
  });

  it("allows the admin to open the election", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await expect(election.openElection())
      .to.emit(election, "ElectionOpened")
      .withArgs(electionId, registryMerkleRoot);

    expect(await election.electionState()).to.equal(electionStates.Open);
  });

  it("does not allow non-admins to open or close the election", async function () {
    const { election, voter1 } = await networkHelpers.loadFixture(
      deployElectionFixture,
    );

    const voterElection = election.connect(voter1) as any;

    await expect(voterElection.openElection()).to.be.revertedWith("Only admin");

    await openElection(election);

    await expect(voterElection.closeElection()).to.be.revertedWith("Only admin");
  });

  it("does not allow opening the election twice", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await openElection(election);

    await expect(election.openElection()).to.be.revertedWith(
      "Election not in registration",
    );
  });

  it("rejects opening an election without a Merkle root", async function () {
    const verifier = await ethers.deployContract("Groth16Verifier");
    const election = await ethers.deployContract("Election", [
      await verifier.getAddress(),
      electionId,
      0n,
    ]);

    await expect(election.openElection()).to.be.revertedWith(
      "Invalid Merkle root",
    );
  });

  it("does not allow closing before the election is open", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await expect(election.closeElection()).to.be.revertedWith("Election not open");
  });

  it("allows the admin to close the election", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await openElection(election);

    await expect(election.closeElection())
      .to.emit(election, "ElectionClosed")
      .withArgs(electionId);

    expect(await election.electionState()).to.equal(electionStates.Closed);
  });

  it("does not allow closing the election twice", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await openElection(election);
    await election.closeElection();

    await expect(election.closeElection()).to.be.revertedWith("Election not open");
  });

  it("initializes candidate vote counts to zero", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    expect(await election.getVotes(1)).to.equal(0n);
  });

  it("rejects votes before the election opens", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await expect(castFixtureVote(election)).to.be.revertedWith("Election not open");
  });

  it("accepts a valid proof, emits VoteCast, and increments the candidate tally", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await openElection(election);

    await expect(castFixtureVote(election))
      .to.emit(election, "VoteCast")
      .withArgs(candidateId, nullifierHash);

    expect(await election.getVotes(candidateId)).to.equal(1n);
    expect(await election.usedNullifiers(nullifierHash)).to.equal(true);
  });

  it("rejects replaying the same nullifier", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await openElection(election);
    await castFixtureVote(election);

    await expect(castFixtureVote(election)).to.be.revertedWith(
      "Loi: Cu tri nay da bo phieu!",
    );
  });

  it("rejects votes after the election closes", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await openElection(election);
    await election.closeElection();

    await expect(castFixtureVote(election)).to.be.revertedWith("Election not open");
  });

  it("rejects a proof submitted for the wrong election", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await openElection(election);

    await expect(
      election.castVote(
        voteCalldata.a,
        voteCalldata.b,
        voteCalldata.c,
        withElectionId(electionId + 1n),
      ),
    ).to.be.revertedWith("Invalid election");
  });

  it("rejects a proof submitted with a tampered Merkle root before verifier execution", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await openElection(election);

    await expect(
      election.castVote(
        voteCalldata.a,
        voteCalldata.b,
        voteCalldata.c,
        withMerkleRoot(merkleRoot + 1n),
      ),
    ).to.be.revertedWith("Invalid Merkle root");
  });

  it("rejects candidate 0 and candidate 5 in Solidity", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await openElection(election);

    for (const invalidCandidateId of [0n, 5n]) {
      await expect(
        election.castVote(
          voteCalldata.a,
          voteCalldata.b,
          voteCalldata.c,
          withCandidateId(invalidCandidateId),
        ),
      ).to.be.revertedWith("Invalid candidate");
    }
  });

  it("rejects mismatched public inputs that pass Solidity bounds", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await openElection(election);

    await expect(
      election.castVote(
        voteCalldata.a,
        voteCalldata.b,
        voteCalldata.c,
        withCandidateId(2n),
      ),
    ).to.be.revertedWith("Loi: ZK Proof khong hop le");
  });

  it("does not generate valid proofs for candidate 0 or candidate 5", function () {
    this.timeout(30_000);

    expectInvalidCandidateWitness(0);
    expectInvalidCandidateWitness(5);
  });

  it("does not generate valid proofs with tampered Merkle paths", function () {
    this.timeout(30_000);

    expectInvalidProofGeneration({}, (registry) => {
      registry.pathElements[0] = registry.identityCommitments[3];
    });
    expectInvalidProofGeneration({}, (registry) => {
      registry.pathIndices[0] = 2;
    });
  });
});
