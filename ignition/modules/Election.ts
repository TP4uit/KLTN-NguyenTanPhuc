import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ElectionModule", (m) => {
  const electionId = m.getParameter("electionId", 1);
  // Default root comes from test/fixtures/registry/registry.json.
  const merkleRoot = m.getParameter(
    "merkleRoot",
    7932749078796165988725230467181390602760147441196774940239533986225546804780n,
  );

  const verifier = m.contract("Groth16Verifier");
  const election = m.contract("Election", [verifier, electionId, merkleRoot]);

  return { verifier, election };
});
