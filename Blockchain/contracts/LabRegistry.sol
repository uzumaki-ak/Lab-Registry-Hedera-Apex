// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title LabRegistry V5.1 - Sovereign Architecture
 * @author Crimson Ox
 * @notice Official Submission for Hedera Apex 2026.
 * @dev Implements Director Veto, Patient Portability, and AI Agent Anchoring.
 */
contract LabRegistry is AccessControl, Pausable {
    bytes32 public constant FACTORY_ADMIN_ROLE = keccak256("FACTORY_ADMIN_ROLE");
    bytes32 public constant LAB_DIRECTOR_ROLE = keccak256("LAB_DIRECTOR_ROLE");
    bytes32 public constant MEDICAL_OFFICER_ROLE = keccak256("MEDICAL_OFFICER_ROLE");

    // // Status now includes REJECTED for the Director's Clinical Veto
    enum Status { PENDING, VERIFIED, DISPUTED, REJECTED }

    address public agentPermissionToken;
    uint256 public anchorFee = 0; 
    bool public automationEnabled; 

    mapping(address => bool) public authorizedAgents; 

    struct LabReport {
        string results; // // CID or Encrypted Data
        string technician;
        uint256 timestamp;
        address patientAddress;
        Status status;
        address verifiedBy;
        string rejectionReason; // // New: Stores why a Director vetoed a report
    }

    // // New: Tracks Patient requests to move or delete their data (Portability)
    struct TransferRequest {
        bool isPending;
        address requestedBy;
        uint256 requestTimestamp;
        string reason;
    }

    mapping(uint256 => LabReport) private labReports;
    // // New: Mapping for Portability Handshake
    mapping(uint256 => TransferRequest) public transferRequests;

    event ReportAnchored(uint256 indexed id, address indexed patient, string tech, uint256 time);
    event ReportVerified(uint256 indexed id, address indexed doctor, uint256 time);
    event ReportRejected(uint256 indexed id, address indexed doctor, string reason);
    event TransferRequested(uint256 indexed id, address indexed patient);
    event TransferHandled(uint256 indexed id, bool approved, string reason);
    event FeeUpdated(uint256 newFee);
    event AgentStatusChanged(address indexed agent, bool status);

    constructor(address _factoryAdmin, address _localDirector, address _tokenID) {
        _grantRole(DEFAULT_ADMIN_ROLE, _factoryAdmin);
        _grantRole(FACTORY_ADMIN_ROLE, _factoryAdmin);
        _grantRole(LAB_DIRECTOR_ROLE, _localDirector);
        _grantRole(MEDICAL_OFFICER_ROLE, _localDirector); 

        _setRoleAdmin(LAB_DIRECTOR_ROLE, FACTORY_ADMIN_ROLE);
        _setRoleAdmin(MEDICAL_OFFICER_ROLE, FACTORY_ADMIN_ROLE);

        agentPermissionToken = _tokenID; 
    }

    // --- CORE LOGIC ---

    function addReport(uint256 _id, string memory _res, string memory _tech, address _pat) 
        public payable whenNotPaused 
    {
        require(labReports[_id].timestamp == 0, "ID already exists");

        bool isDirector = hasRole(LAB_DIRECTOR_ROLE, msg.sender);
        uint256 agentBalance = IERC20(agentPermissionToken).balanceOf(msg.sender);
        bool isAuthAgent = (automationEnabled && authorizedAgents[msg.sender] && agentBalance > 0);

        if (!isDirector && !isAuthAgent) revert("Unauthorized: Missing Role or HTS Token");
        if (msg.value < anchorFee) revert("Insufficient HBAR Fee"); 

        labReports[_id] = LabReport({
            results: _res,
            technician: _tech,
            timestamp: block.timestamp,
            patientAddress: _pat,
            status: Status.PENDING,
            verifiedBy: address(0),
            rejectionReason: ""
        });
        emit ReportAnchored(_id, _pat, _tech, block.timestamp);
    }

    // // Director Verification: Finalizes the report for Patient access
    function verifyReport(uint256 _id) external onlyRole(MEDICAL_OFFICER_ROLE) {
        require(labReports[_id].timestamp != 0, "Report does not exist");
        require(labReports[_id].status == Status.PENDING, "Report already final");

        labReports[_id].status = Status.VERIFIED;
        labReports[_id].verifiedBy = msg.sender;

        emit ReportVerified(_id, msg.sender, block.timestamp);
    }

    // // New: Clinical Veto - Allows Director to reject a report anchored by AI
    function rejectReport(uint256 _id, string memory _reason) external onlyRole(MEDICAL_OFFICER_ROLE) {
        require(labReports[_id].status == Status.PENDING, "Cannot reject final report");
        
        labReports[_id].status = Status.REJECTED;
        labReports[_id].rejectionReason = _reason;
        
        emit ReportRejected(_id, msg.sender, _reason);
    }

    // // New: Portability Handshake - Patient requests to move/delete data
    function requestDataTransfer(uint256 _id) external {
        require(labReports[_id].patientAddress == msg.sender, "Only patient can request");
        require(!transferRequests[_id].isPending, "Request already active");

        transferRequests[_id] = TransferRequest({
            isPending: true,
            requestedBy: msg.sender,
            requestTimestamp: block.timestamp,
            reason: ""
        });

        emit TransferRequested(_id, msg.sender);
    }

    // // New: Governance Veto - Director approves or denies the data transfer
    function handleTransferRequest(uint256 _id, bool _approve, string memory _note) 
        external onlyRole(LAB_DIRECTOR_ROLE) 
    {
        require(transferRequests[_id].isPending, "No pending request");
        
        transferRequests[_id].isPending = false;
        
        if (_approve) {
            // // In a real scenario, this triggers a 'Soft Delete' or 'Move'
            labReports[_id].status = Status.DISPUTED; 
        }

        emit TransferHandled(_id, _approve, _note);
    }

    function getReport(uint256 _id) public view returns (LabReport memory) {
        LabReport memory r = labReports[_id];
        require(r.timestamp != 0, "Report not found");
        
        // // Strict Privacy: Only Director or the Patient can view the results
        if (!hasRole(LAB_DIRECTOR_ROLE, msg.sender) && msg.sender != r.patientAddress) revert("Access Denied");
        return r;
    }

    // --- ADMIN CONTROLS ---

    function setAnchorFee(uint256 _newFee) external onlyRole(LAB_DIRECTOR_ROLE) {
        anchorFee = _newFee;
        emit FeeUpdated(_newFee);
    }

    function setAgentStatus(address _agent, bool _status) external onlyRole(LAB_DIRECTOR_ROLE) {
        authorizedAgents[_agent] = _status;
        emit AgentStatusChanged(_agent, _status);
    }

    function setAutomation(bool _status) external onlyRole(LAB_DIRECTOR_ROLE) {
        automationEnabled = _status;
    }

    function pause() external onlyRole(FACTORY_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(FACTORY_ADMIN_ROLE) { _unpause(); }

    function withdraw() external onlyRole(LAB_DIRECTOR_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }

    receive() external payable {}
}
 