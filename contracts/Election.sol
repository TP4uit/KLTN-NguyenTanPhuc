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
    uint256 public merkleRoot;

    enum ElectionState {
        Registration,
        Open,
        Closed
    }

    ElectionState public electionState;

    mapping(uint256 => bool) public usedNullifiers;
    mapping(uint256 => uint256) public voteCounts;

    event MerkleRootUpdated(uint256 oldRoot, uint256 newRoot);
    event ElectionOpened(uint256 electionId, uint256 merkleRoot);
    event ElectionClosed(uint256 electionId);
    event VoteCast(uint256 indexed candidateId, uint256 nullifierHash);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor(address _verifierAddress, uint256 _electionId, uint256 _merkleRoot) {
        admin = msg.sender;
        verifier = Groth16Verifier(_verifierAddress);
        electionId = _electionId;
        merkleRoot = _merkleRoot;
        electionState = ElectionState.Registration;
    }

    function setMerkleRoot(uint256 newRoot) public onlyAdmin {
        require(newRoot != 0, "Invalid Merkle root");
        require(
            electionState == ElectionState.Registration,
            "Election not in registration"
        );

        uint256 oldRoot = merkleRoot;
        merkleRoot = newRoot;

        emit MerkleRootUpdated(oldRoot, newRoot);
    }

    function openElection() public onlyAdmin {
        require(
            electionState == ElectionState.Registration,
            "Election not in registration"
        );
        require(merkleRoot != 0, "Invalid Merkle root");

        electionState = ElectionState.Open;

        emit ElectionOpened(electionId, merkleRoot);
    }

    function closeElection() public onlyAdmin {
        require(electionState == ElectionState.Open, "Election not open");

        electionState = ElectionState.Closed;

        emit ElectionClosed(electionId);
    }

    function castVote(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[4] memory input
    ) public {
        require(electionState == ElectionState.Open, "Election not open");

        // Public input order:
        // input[0] = nullifierHash
        // input[1] = candidateId
        // input[2] = electionId
        // input[3] = merkleRoot
        uint256 nullifierHash = input[0];
        uint256 candidateId = input[1];
        uint256 proofElectionId = input[2];
        uint256 proofMerkleRoot = input[3];

        require(proofElectionId == electionId, "Invalid election");
        require(proofMerkleRoot == merkleRoot, "Invalid Merkle root");
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
