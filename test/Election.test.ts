import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

describe("ZK voting election contract", function () {
  async function deployElectionFixture() {
    const [owner, voter1] = await ethers.getSigners();

    const verifier = await ethers.deployContract("Groth16Verifier");
    const election = await ethers.deployContract("Election", [
      await verifier.getAddress(),
    ]);

    return { election, owner, verifier, voter1 };
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
});
