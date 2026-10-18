// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DonateLink — on-chain donation registry
/// @notice Records every donation immutably and forwards the funds straight to
///         the NGO's wallet. The contract never custodies money: value in, value
///         out, in the same transaction. What it keeps is the *proof* — an
///         immutable record any donor can verify on PolygonScan.
contract DonationRegistry {
    /// @dev Lifecycle stages mirror the app: 1 Pending, 2 Confirmed,
    ///      3 Allocated, 4 Transferred, 5 Completed.
    uint8 public constant STAGE_MIN = 1;
    uint8 public constant STAGE_MAX = 5;

    struct Donation {
        uint256 id;
        address donor;
        address ngoWallet;
        uint256 amount;      // wei
        string  ngoId;       // Supabase uuid — links chain record back to the app
        string  cause;       // e.g. "Clean Water Access"
        uint64  timestamp;
        uint8   stage;
    }

    address public admin;
    uint256 public donationCount;

    mapping(uint256 => Donation) private donations;
    /// @notice Addresses allowed to advance a donation's stage (NGO + admin backend).
    mapping(address => bool) public stageUpdaters;
    /// @notice Every donation id a given donor has made, for cheap client lookups.
    mapping(address => uint256[]) private donationsByDonor;

    event DonationRecorded(
        uint256 indexed id,
        address indexed donor,
        address indexed ngoWallet,
        uint256 amount,
        string  ngoId,
        string  cause,
        uint64  timestamp
    );

    /// @notice Emitted in phase 2 when a lifecycle stage is proven on-chain.
    event StageRecorded(
        uint256 indexed id,
        uint8   indexed stage,
        bytes32 proofHash,
        address indexed updatedBy,
        uint64  timestamp
    );

    event StageUpdaterSet(address indexed account, bool allowed);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    error NotAdmin();
    error NotStageUpdater();
    error ZeroAmount();
    error InvalidNgoWallet();
    error UnknownDonation();
    error StageOutOfRange();
    error StageNotIncreasing();
    error TransferFailed();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor() {
        admin = msg.sender;
        stageUpdaters[msg.sender] = true;
        emit StageUpdaterSet(msg.sender, true);
    }

    /// @notice Donate to an NGO. The full msg.value is forwarded to `ngoWallet`;
    ///         this contract keeps no fee and holds no balance.
    /// @param ngoWallet The NGO's payout address.
    /// @param ngoId     The NGO's Supabase uuid, so the app can match the record.
    /// @param cause     Human-readable cause label shown in the app.
    /// @return id       The on-chain donation id.
    function donate(
        address payable ngoWallet,
        string calldata ngoId,
        string calldata cause
    ) external payable returns (uint256 id) {
        if (msg.value == 0) revert ZeroAmount();
        if (ngoWallet == address(0)) revert InvalidNgoWallet();

        // Effects before interaction — the record exists even if we revert below.
        id = ++donationCount;
        donations[id] = Donation({
            id: id,
            donor: msg.sender,
            ngoWallet: ngoWallet,
            amount: msg.value,
            ngoId: ngoId,
            cause: cause,
            timestamp: uint64(block.timestamp),
            stage: STAGE_MIN
        });
        donationsByDonor[msg.sender].push(id);

        emit DonationRecorded(
            id, msg.sender, ngoWallet, msg.value, ngoId, cause, uint64(block.timestamp)
        );

        (bool sent, ) = ngoWallet.call{value: msg.value}("");
        if (!sent) revert TransferFailed();
    }

    /// @notice Phase 2 — anchor a lifecycle stage and its proof file on-chain.
    /// @param proofHash keccak256 of the uploaded proof file (bytes32(0) if none).
    function recordStage(uint256 id, uint8 stage, bytes32 proofHash) external {
        if (!stageUpdaters[msg.sender]) revert NotStageUpdater();
        Donation storage d = donations[id];
        if (d.id == 0) revert UnknownDonation();
        if (stage < STAGE_MIN || stage > STAGE_MAX) revert StageOutOfRange();
        // Stages only ever move forward — history cannot be rewritten.
        if (stage <= d.stage) revert StageNotIncreasing();

        d.stage = stage;
        emit StageRecorded(id, stage, proofHash, msg.sender, uint64(block.timestamp));
    }

    function getDonation(uint256 id) external view returns (Donation memory) {
        Donation memory d = donations[id];
        if (d.id == 0) revert UnknownDonation();
        return d;
    }

    function getDonationIdsByDonor(address donor) external view returns (uint256[] memory) {
        return donationsByDonor[donor];
    }

    function setStageUpdater(address account, bool allowed) external onlyAdmin {
        stageUpdaters[account] = allowed;
        emit StageUpdaterSet(account, allowed);
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert InvalidNgoWallet();
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }
}
