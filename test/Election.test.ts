import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

type VoteCalldata = {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
  input: [string, string];
  nullifierHash: string;
  candidateId: string;
};

const testDir = dirname(fileURLToPath(import.meta.url));
const voteCalldata = JSON.parse(
  readFileSync(resolve(testDir, "fixtures", "vote", "calldata.json"), "utf8"),
) as VoteCalldata;

const nullifierHash = BigInt(voteCalldata.input[0]);
const candidateId = BigInt(voteCalldata.input[1]);

describe("ZK voting election contract", function () {
  async function deployElectionFixture() {
    const [owner, voter1] = await ethers.getSigners();

    const verifier = await ethers.deployContract("Groth16Verifier");
    const election = await ethers.deployContract("Election", [
      await verifier.getAddress(),
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

  it("deploys and assigns the deployer as admin", async function () {
    const { election, owner } = await networkHelpers.loadFixture(
      deployElectionFixture,
    );

    expect(await election.admin()).to.equal(owner.address);
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

  it("rejects a proof with mismatched public input ordering or values", async function () {
    const { election } = await networkHelpers.loadFixture(deployElectionFixture);
    const mismatchedInput = [
      voteCalldata.input[0],
      `0x${(candidateId + 1n).toString(16)}`,
    ];

    await expect(
      election.castVote(
        voteCalldata.a,
        voteCalldata.b,
        voteCalldata.c,
        mismatchedInput,
      ),
    ).to.be.revertedWith("Loi: ZK Proof khong hop le");
  });
});
