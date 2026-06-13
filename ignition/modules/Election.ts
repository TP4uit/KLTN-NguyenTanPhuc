import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ElectionModule", (m) => {
  const electionId = m.getParameter("electionId", 1);

  const verifier = m.contract("Groth16Verifier");
  const election = m.contract("Election", [verifier, electionId]);

  return { verifier, election };
});
