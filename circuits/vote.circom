pragma circom 2.1.5;

include "../node_modules/circomlib/circuits/poseidon.circom";

template Vote() {
    // Public input order must match scripts, tests, contracts/Election.sol,
    // and the generated verifier:
    // input[0] = nullifierHash
    // input[1] = candidateId
    // input[2] = electionId
    // input[3] = merkleRoot
    signal input nullifierHash;
    signal input candidateId;
    signal input electionId;
    signal input merkleRoot;

    // Private inputs.
    signal input secretKey;
    signal input pathElements[3];
    signal input pathIndices[3];

    component identityCommitment = Poseidon(1);
    identityCommitment.inputs[0] <== secretKey;

    component nullifier = Poseidon(2);
    nullifier.inputs[0] <== secretKey;
    nullifier.inputs[1] <== electionId;
    nullifier.out === nullifierHash;

    // Fixed depth-3 Merkle membership proof.
    signal merkleHashes[4];
    signal left[3];
    signal right[3];
    signal swaps[3];
    component pathHashers[3];

    merkleHashes[0] <== identityCommitment.out;

    for (var i = 0; i < 3; i++) {
        pathIndices[i] * (pathIndices[i] - 1) === 0;

        swaps[i] <== pathIndices[i] * (pathElements[i] - merkleHashes[i]);
        left[i] <== merkleHashes[i] + swaps[i];
        right[i] <== pathElements[i] - swaps[i];

        pathHashers[i] = Poseidon(2);
        pathHashers[i].inputs[0] <== left[i];
        pathHashers[i].inputs[1] <== right[i];
        merkleHashes[i + 1] <== pathHashers[i].out;
    }

    merkleHashes[3] === merkleRoot;

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

component main { public [nullifierHash, candidateId, electionId, merkleRoot] } = Vote();
