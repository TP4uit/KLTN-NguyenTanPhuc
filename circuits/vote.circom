pragma circom 2.1.5;

include "../node_modules/circomlib/circuits/poseidon.circom";

template Vote() {
    // Public input order must match contracts/Election.sol and contracts/Verifier.sol:
    // input[0] = nullifierHash
    // input[1] = candidateId
    // input[2] = electionId
    signal input nullifierHash;
    signal input candidateId;
    signal input electionId;

    // Private voter secret.
    signal input secretKey;

    component nullifier = Poseidon(2);
    nullifier.inputs[0] <== secretKey;
    nullifier.inputs[1] <== electionId;
    nullifier.out === nullifierHash;

    // MVP candidate validity: candidateId must be one of 1, 2, 3, or 4.
    signal candidateMinus1;
    signal candidateMinus2;
    signal candidateMinus3;
    signal candidateMinus4;
    signal candidateProduct12;
    signal candidateProduct34;
    signal candidateValidityProduct;

    candidateMinus1 <== candidateId - 1;
    candidateMinus2 <== candidateId - 2;
    candidateMinus3 <== candidateId - 3;
    candidateMinus4 <== candidateId - 4;
    candidateProduct12 <== candidateMinus1 * candidateMinus2;
    candidateProduct34 <== candidateMinus3 * candidateMinus4;
    candidateValidityProduct <== candidateProduct12 * candidateProduct34;
    candidateValidityProduct === 0;
}

component main { public [nullifierHash, candidateId, electionId] } = Vote();
