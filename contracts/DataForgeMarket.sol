// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DataForgeMarket {
    enum BountyStatus {
        Draft,
        Active,
        Review,
        Completed,
        Cancelled,
        Archived
    }

    enum SubmissionStatus {
        Review,
        Accepted,
        Rejected,
        Disputed
    }

    struct Bounty {
        address requester;
        string metadata;
        string license;
        uint64 target;
        uint64 accepted;
        uint64 submitted;
        uint64 unresolved;
        uint64 deadline;
        uint96 reward;
        uint96 balance;
        uint8 minimumScore;
        BountyStatus status;
    }

    struct Submission {
        uint256 bountyId;
        address contributor;
        bytes32 rootHash;
        bytes32 storageTxHash;
        bytes32 fingerprint;
        bytes32 reportHash;
        string fileName;
        uint64 submittedAt;
        uint8 score;
        SubmissionStatus status;
    }

    struct Reputation {
        uint64 bountiesCreated;
        uint64 submissions;
        uint64 accepted;
        uint64 rejected;
        uint64 disputes;
        uint256 earned;
        uint256 paid;
    }

    error Unauthorized();
    error InvalidInput();
    error InvalidState();
    error InvalidFunding();
    error InvalidAttestation();
    error DuplicateContribution();
    error DeadlinePassed();
    error DeadlineNotReached();
    error TransferFailed();
    error ContractPaused();
    error ReentrantCall();
    error AlreadyReported();

    uint256 public bountyCount;
    uint256 public submissionCount;
    address public admin;
    address public validator;
    bool public paused;

    mapping(uint256 => Bounty) private bounties;
    mapping(uint256 => Submission) private submissions;
    mapping(bytes32 => bool) public usedFingerprints;
    mapping(address => Reputation) private reputations;
    mapping(uint256 => uint64) public reportCount;
    mapping(uint256 => mapping(address => bool)) public hasReported;

    uint256 private unlocked = 1;

    event BountyCreated(
        uint256 indexed bountyId,
        address indexed requester,
        BountyStatus status,
        uint256 fundedAmount
    );
    event BountyPublished(uint256 indexed bountyId, uint256 fundedAmount);
    event BountyClosed(
        uint256 indexed bountyId,
        BountyStatus status,
        uint256 refundedAmount
    );
    event BountyArchived(uint256 indexed bountyId);
    event SubmissionCreated(
        uint256 indexed submissionId,
        uint256 indexed bountyId,
        address indexed contributor,
        SubmissionStatus status,
        uint8 score,
        bytes32 rootHash
    );
    event SubmissionReviewed(
        uint256 indexed submissionId,
        SubmissionStatus status,
        address indexed reviewer
    );
    event PaymentReleased(
        uint256 indexed submissionId,
        uint256 indexed bountyId,
        address indexed contributor,
        uint256 amount
    );
    event DisputeOpened(
        uint256 indexed submissionId,
        address indexed contributor,
        bytes32 reasonHash
    );
    event DisputeResolved(
        uint256 indexed submissionId,
        bool accepted,
        address indexed resolver
    );
    event SubmissionReported(
        uint256 indexed submissionId,
        address indexed reporter,
        bytes32 reasonHash
    );
    event ValidatorChanged(address indexed previousValidator, address indexed newValidator);
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
    event PauseChanged(bool paused);

    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    modifier whenRunning() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier nonReentrant() {
        if (unlocked != 1) revert ReentrantCall();
        unlocked = 2;
        _;
        unlocked = 1;
    }

    constructor(address validatorAddress, address adminAddress) {
        if (validatorAddress == address(0) || adminAddress == address(0)) {
            revert InvalidInput();
        }
        validator = validatorAddress;
        admin = adminAddress;
    }

    function createDraft(
        string calldata metadata,
        string calldata license,
        uint64 target,
        uint96 reward,
        uint64 deadline,
        uint8 minimumScore
    ) external whenRunning returns (uint256 bountyId) {
        bountyId = _createBounty(
            metadata,
            license,
            target,
            reward,
            deadline,
            minimumScore,
            BountyStatus.Draft,
            0
        );
    }

    function createAndPublish(
        string calldata metadata,
        string calldata license,
        uint64 target,
        uint96 reward,
        uint64 deadline,
        uint8 minimumScore
    ) external payable whenRunning returns (uint256 bountyId) {
        uint256 requiredFunding = uint256(target) * uint256(reward);
        if (msg.value != requiredFunding || requiredFunding > type(uint96).max) {
            revert InvalidFunding();
        }
        bountyId = _createBounty(
            metadata,
            license,
            target,
            reward,
            deadline,
            minimumScore,
            BountyStatus.Active,
            uint96(msg.value)
        );
    }

    function publishDraft(uint256 bountyId) external payable whenRunning {
        Bounty storage bounty = bounties[bountyId];
        if (bounty.requester != msg.sender) revert Unauthorized();
        if (bounty.status != BountyStatus.Draft) revert InvalidState();
        if (block.timestamp >= bounty.deadline) revert DeadlinePassed();
        uint256 requiredFunding = uint256(bounty.target) * uint256(bounty.reward);
        if (msg.value != requiredFunding || requiredFunding > type(uint96).max) {
            revert InvalidFunding();
        }
        bounty.balance = uint96(msg.value);
        bounty.status = BountyStatus.Active;
        emit BountyPublished(bountyId, msg.value);
    }

    function submitProof(
        uint256 bountyId,
        bytes32 rootHash,
        bytes32 storageTxHash,
        bytes32 fingerprint,
        uint8 score,
        bytes32 reportHash,
        uint64 issuedAt,
        bytes calldata validationSignature,
        string calldata fileName
    ) external whenRunning nonReentrant returns (uint256 submissionId) {
        Bounty storage bounty = bounties[bountyId];
        if (bounty.status != BountyStatus.Active) revert InvalidState();
        if (block.timestamp > bounty.deadline) revert DeadlinePassed();
        if (bounty.requester == msg.sender) revert InvalidInput();
        if (
            rootHash == bytes32(0) ||
            storageTxHash == bytes32(0) ||
            fingerprint == bytes32(0) ||
            reportHash == bytes32(0) ||
            score > 100 ||
            bytes(fileName).length == 0 ||
            bytes(fileName).length > 160
        ) revert InvalidInput();
        if (usedFingerprints[fingerprint]) revert DuplicateContribution();
        if (issuedAt > block.timestamp + 5 minutes || block.timestamp > issuedAt + 20 minutes) {
            revert InvalidAttestation();
        }

        bytes32 digest = validationDigest(
            bountyId,
            msg.sender,
            rootHash,
            storageTxHash,
            fingerprint,
            score,
            reportHash,
            issuedAt
        );
        if (_recover(_toEthSignedMessageHash(digest), validationSignature) != validator) {
            revert InvalidAttestation();
        }

        usedFingerprints[fingerprint] = true;
        submissionId = ++submissionCount;
        SubmissionStatus initialStatus = score >= bounty.minimumScore
            ? SubmissionStatus.Accepted
            : SubmissionStatus.Review;

        submissions[submissionId] = Submission({
            bountyId: bountyId,
            contributor: msg.sender,
            rootHash: rootHash,
            storageTxHash: storageTxHash,
            fingerprint: fingerprint,
            reportHash: reportHash,
            fileName: fileName,
            submittedAt: uint64(block.timestamp),
            score: score,
            status: initialStatus
        });
        bounty.submitted += 1;
        reputations[msg.sender].submissions += 1;

        emit SubmissionCreated(
            submissionId,
            bountyId,
            msg.sender,
            initialStatus,
            score,
            rootHash
        );

        if (initialStatus == SubmissionStatus.Accepted) {
            _releasePayment(submissionId, bounty, submissions[submissionId]);
        } else {
            bounty.unresolved += 1;
            bounty.status = BountyStatus.Review;
        }
    }

    function reviewSubmission(uint256 submissionId, bool accept)
        external
        whenRunning
        nonReentrant
    {
        Submission storage submission = submissions[submissionId];
        Bounty storage bounty = bounties[submission.bountyId];
        if (bounty.requester != msg.sender) revert Unauthorized();
        if (submission.status != SubmissionStatus.Review) revert InvalidState();

        if (accept) {
            submission.status = SubmissionStatus.Accepted;
            bounty.unresolved -= 1;
            _releasePayment(submissionId, bounty, submission);
        } else {
            submission.status = SubmissionStatus.Rejected;
            bounty.unresolved -= 1;
            reputations[submission.contributor].rejected += 1;
            _refreshBountyStatus(bounty);
        }
        emit SubmissionReviewed(submissionId, submission.status, msg.sender);
    }

    function openDispute(uint256 submissionId, bytes32 reasonHash) external whenRunning {
        Submission storage submission = submissions[submissionId];
        if (submission.contributor != msg.sender) revert Unauthorized();
        if (
            submission.status != SubmissionStatus.Review &&
            submission.status != SubmissionStatus.Rejected
        ) revert InvalidState();
        if (reasonHash == bytes32(0)) revert InvalidInput();
        if (submission.status == SubmissionStatus.Rejected) {
            bounties[submission.bountyId].unresolved += 1;
        }
        submission.status = SubmissionStatus.Disputed;
        reputations[msg.sender].disputes += 1;
        emit DisputeOpened(submissionId, msg.sender, reasonHash);
    }

    function resolveDispute(uint256 submissionId, bool accept)
        external
        onlyAdmin
        nonReentrant
    {
        Submission storage submission = submissions[submissionId];
        if (submission.status != SubmissionStatus.Disputed) revert InvalidState();
        Bounty storage bounty = bounties[submission.bountyId];
        if (accept) {
            submission.status = SubmissionStatus.Accepted;
            bounty.unresolved -= 1;
            _releasePayment(submissionId, bounty, submission);
        } else {
            submission.status = SubmissionStatus.Rejected;
            bounty.unresolved -= 1;
            reputations[submission.contributor].rejected += 1;
            _refreshBountyStatus(bounty);
        }
        emit DisputeResolved(submissionId, accept, msg.sender);
    }

    function reportSubmission(uint256 submissionId, bytes32 reasonHash) external whenRunning {
        if (submissions[submissionId].contributor == address(0) || reasonHash == bytes32(0)) {
            revert InvalidInput();
        }
        if (hasReported[submissionId][msg.sender]) revert AlreadyReported();
        hasReported[submissionId][msg.sender] = true;
        reportCount[submissionId] += 1;
        emit SubmissionReported(submissionId, msg.sender, reasonHash);
    }

    function cancelBounty(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = bounties[bountyId];
        if (bounty.requester != msg.sender) revert Unauthorized();
        if (bounty.status == BountyStatus.Draft) {
            bounty.status = BountyStatus.Cancelled;
            emit BountyClosed(bountyId, bounty.status, 0);
            return;
        }
        if (bounty.status != BountyStatus.Active && bounty.status != BountyStatus.Review) {
            revert InvalidState();
        }
        if (bounty.unresolved != 0) revert InvalidState();
        uint256 refund = bounty.balance;
        bounty.balance = 0;
        bounty.status = BountyStatus.Cancelled;
        _sendValue(bounty.requester, refund);
        emit BountyClosed(bountyId, bounty.status, refund);
    }

    function closeExpiredBounty(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = bounties[bountyId];
        if (bounty.requester != msg.sender && msg.sender != admin) revert Unauthorized();
        if (block.timestamp <= bounty.deadline) revert DeadlineNotReached();
        if (bounty.status != BountyStatus.Active && bounty.status != BountyStatus.Review) {
            revert InvalidState();
        }
        if (bounty.unresolved != 0) revert InvalidState();
        uint256 refund = bounty.balance;
        bounty.balance = 0;
        bounty.status = bounty.accepted > 0
            ? BountyStatus.Completed
            : BountyStatus.Cancelled;
        _sendValue(bounty.requester, refund);
        emit BountyClosed(bountyId, bounty.status, refund);
    }

    function archiveBounty(uint256 bountyId) external {
        Bounty storage bounty = bounties[bountyId];
        if (bounty.requester != msg.sender) revert Unauthorized();
        if (
            bounty.status != BountyStatus.Completed &&
            bounty.status != BountyStatus.Cancelled
        ) revert InvalidState();
        bounty.status = BountyStatus.Archived;
        emit BountyArchived(bountyId);
    }

    function setPaused(bool nextPaused) external onlyAdmin {
        paused = nextPaused;
        emit PauseChanged(nextPaused);
    }

    function setValidator(address nextValidator) external onlyAdmin {
        if (nextValidator == address(0)) revert InvalidInput();
        address previous = validator;
        validator = nextValidator;
        emit ValidatorChanged(previous, nextValidator);
    }

    function setAdmin(address nextAdmin) external onlyAdmin {
        if (nextAdmin == address(0)) revert InvalidInput();
        address previous = admin;
        admin = nextAdmin;
        emit AdminChanged(previous, nextAdmin);
    }

    function getBounty(uint256 bountyId) external view returns (Bounty memory) {
        return bounties[bountyId];
    }

    function getSubmission(uint256 submissionId) external view returns (Submission memory) {
        return submissions[submissionId];
    }

    function getReputation(address account) external view returns (Reputation memory) {
        return reputations[account];
    }

    function validationDigest(
        uint256 bountyId,
        address contributor,
        bytes32 rootHash,
        bytes32 storageTxHash,
        bytes32 fingerprint,
        uint8 score,
        bytes32 reportHash,
        uint64 issuedAt
    ) public view returns (bytes32) {
        return keccak256(
            abi.encode(
                address(this),
                block.chainid,
                bountyId,
                contributor,
                rootHash,
                storageTxHash,
                fingerprint,
                score,
                reportHash,
                issuedAt
            )
        );
    }

    function _createBounty(
        string calldata metadata,
        string calldata license,
        uint64 target,
        uint96 reward,
        uint64 deadline,
        uint8 minimumScore,
        BountyStatus status,
        uint96 funding
    ) private returns (uint256 bountyId) {
        if (
            bytes(metadata).length == 0 ||
            bytes(metadata).length > 3072 ||
            bytes(license).length == 0 ||
            bytes(license).length > 96 ||
            target == 0 ||
            reward == 0 ||
            deadline < block.timestamp + 15 minutes ||
            minimumScore == 0 ||
            minimumScore > 100
        ) revert InvalidInput();

        bountyId = ++bountyCount;
        bounties[bountyId] = Bounty({
            requester: msg.sender,
            metadata: metadata,
            license: license,
            target: target,
            accepted: 0,
            submitted: 0,
            unresolved: 0,
            deadline: deadline,
            reward: reward,
            balance: funding,
            minimumScore: minimumScore,
            status: status
        });
        reputations[msg.sender].bountiesCreated += 1;
        emit BountyCreated(bountyId, msg.sender, status, funding);
    }

    function _releasePayment(
        uint256 submissionId,
        Bounty storage bounty,
        Submission storage submission
    ) private {
        if (bounty.balance < bounty.reward || bounty.accepted >= bounty.target) {
            revert InvalidFunding();
        }
        uint256 payment = bounty.reward;
        bounty.balance -= bounty.reward;
        bounty.accepted += 1;
        reputations[submission.contributor].accepted += 1;
        reputations[submission.contributor].earned += payment;
        reputations[bounty.requester].paid += payment;
        _refreshBountyStatus(bounty);
        _sendValue(submission.contributor, payment);
        emit PaymentReleased(submissionId, submission.bountyId, submission.contributor, payment);
    }

    function _refreshBountyStatus(Bounty storage bounty) private {
        if (bounty.accepted >= bounty.target) {
            bounty.status = BountyStatus.Completed;
            return;
        }
        if (bounty.status == BountyStatus.Completed || bounty.status == BountyStatus.Cancelled) {
            return;
        }
        bounty.status = bounty.unresolved > 0
            ? BountyStatus.Review
            : BountyStatus.Active;
    }

    function _sendValue(address recipient, uint256 amount) private {
        if (amount == 0) return;
        (bool success, ) = payable(recipient).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    function _toEthSignedMessageHash(bytes32 digest) private pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
    }

    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address) {
        if (signature.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);
        if (uint256(s) > 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0) {
            return address(0);
        }
        return ecrecover(digest, v, r, s);
    }

    receive() external payable {
        revert InvalidFunding();
    }
}
