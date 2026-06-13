import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
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
  input: [string, string, string];
  publicSignals: [string, string, string];
  nullifierHash: string;
  candidateId: string;
  electionId: string;
};

const testDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(testDir, "..");
const voteCalldata = JSON.parse(
  readFileSync(resolve(testDir, "fixtures", "vote", "calldata.json"), "utf8"),
) as VoteCalldata;

const nullifierHash = BigInt(voteCalldata.input[0]);
const candidateId = BigInt(voteCalldata.input[1]);
const electionId = BigInt(voteCalldata.input[2]);

function withCandidateId(candidate: bigint): [string, string, string] {
  return [
    voteCalldata.input[0],
    `0x${candidate.toString(16).padStart(64, "0")}`,
    voteCalldata.input[2],
  ];
}

function withElectionId(nextElectionId: bigint): [string, string, string] {
  return [
    voteCalldata.input[0],
    voteCalldata.input[1],
    `0x${nextElectionId.toString(16).padStart(64, "0")}`,
  ];
}

function expectInvalidCandidateWitness(candidate: number) {
  const tempFixtureDir = mkdtempSync(resolve(tmpdir(), "kltn-invalid-vote-"));

  try {
    expect(() =>
      execFileSync(process.execPath, [resolve(rootDir, "scripts", "proof-generate.mjs")], {
        cwd: rootDir,
        env: {
          ...process.env,
          VOTE_CANDIDATE_ID: String(candidate),
          VOTE_FIXTURE_DIR: tempFixtureDir,
        },
        stdio: "pipe",
      }),
    ).to.throw();
  } finally {
    rmSync(tempFixtureDir, { force: true, recursive: true });
  }
}

describe("ZK voting election contract", function () {
  async function deployElectionFixture() {
    const [owner, voter1] = await ethers.getSigners();

    const verifier = await ethers.deployContract("Groth16Verifier");
    const election = await ethers.deployContract("Election", [
      await verifier.getAddress(),
      electionId,
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

  it("deploys and stores the election configuration", async function () {
    const { election, owner } = await networkHelpers.loadFixture(
      deployElectionFixture,
    );

    expect(await election.admin()).to.equal(owner.address);
    expect(await election.electionId()).to.equal(electionId);
    expect(await election.CANDIDATE_COUNT()).to.equal(4n);
    expect(await election.MIN_CANDIDATE_ID()).to.equal(1n);
    expect(await election.MAX_CANDIDATE_ID()).to.equal(4n);
  });

  it("initializes candidate vote counts to zero", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    expect(await election.getVotes(1)).to.equal(0n);
  });

  it("accepts a valid proof, emits VoteCast, and increments the candidate tally", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await expect(castFixtureVote(election))
      .to.emit(election, "VoteCast")
      .withArgs(candidateId, nullifierHash);

    expect(await election.getVotes(candidateId)).to.equal(1n);
    expect(await election.usedNullifiers(nullifierHash)).to.equal(true);
  });

  it("rejects replaying the same nullifier", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await castFixtureVote(election);

    await expect(castFixtureVote(election)).to.be.revertedWith(
      "Loi: Cu tri nay da bo phieu!",
    );
  });

  it("rejects a proof submitted for the wrong election", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

    await expect(
      election.castVote(
        voteCalldata.a,
        voteCalldata.b,
        voteCalldata.c,
        withElectionId(electionId + 1n),
      ),
    ).to.be.revertedWith("Invalid election");
  });

  it("rejects candidate 0 and candidate 5 in Solidity", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);

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
});
