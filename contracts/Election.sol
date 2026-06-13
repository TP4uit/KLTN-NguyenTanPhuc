// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Verifier.sol";

contract Election {
    uint256 public constant MIN_CANDIDATE_ID = 1;
    uint256 public constant MAX_CANDIDATE_ID = 4;
    uint256 public constant CANDIDATE_COUNT = 4;

    address public admin;
    Groth16Verifier public verifier;
    uint256 public immutable electionId;

    mapping(uint256 => bool) public usedNullifiers;
    mapping(uint256 => uint256) public voteCounts;

    event VoteCast(uint256 indexed candidateId, uint256 nullifierHash);

    constructor(address _verifierAddress, uint256 _electionId) {
        admin = msg.sender;
        verifier = Groth16Verifier(_verifierAddress);
        electionId = _electionId;
    }

    function castVote(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[3] memory input
    ) public {
        // Public input order:
        // input[0] = nullifierHash
        // input[1] = candidateId
        // input[2] = electionId
        uint256 nullifierHash = input[0];
        uint256 candidateId = input[1];
        uint256 proofElectionId = input[2];

        require(proofElectionId == electionId, "Invalid election");
        require(
            candidateId >= MIN_CANDIDATE_ID && candidateId <= MAX_CANDIDATE_ID,
            "Invalid candidate"
        );
        require(!usedNullifiers[nullifierHash], "Loi: Cu tri nay da bo phieu!");
        require(verifier.verifyProof(a, b, c, input), "Loi: ZK Proof khong hop le");

        usedNullifiers[nullifierHash] = true;
        voteCounts[candidateId] += 1;

        emit VoteCast(candidateId, nullifierHash);
    }

    function getVotes(uint256 candidateId) public view returns (uint256) {
        return voteCounts[candidateId];
    }
}
