// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title LabRegistry V4.6 - The Agentic Sovereign Protocol
 * @author Crimson Ox
 * @notice Verified for Hedera Apex 2026. 
 * @dev Uses HTS-EVM compatibility for real-time token gating.
 */
contract LabRegistry is AccessControl, Pausable {
    // Role Definitions
    bytes32 public constant FACTORY_ADMIN_ROLE = keccak256("FACTORY_ADMIN_ROLE");
    bytes32 public constant LAB_DIRECTOR_ROLE = keccak256("LAB_DIRECTOR_ROLE");

    // HTS Configuration
    address public agentPermissionToken; // The 0x Address of your Badge Token
    uint256 public anchorFee = 1e8;      // 1 HBAR (100,000,000 tinybars)
    bool public automationEnabled; 
    
    mapping(address => bool) public authorizedAgents; 

    struct LabReport {
        string results;
        string technician;
        uint256 timestamp;
        address patientAddress;
    }

    mapping(uint256 => LabReport) private labReports;

    // Events
    event ReportAnchored(uint256 indexed id, address indexed patient, string tech, uint256 time);
    event FeeUpdated(uint256 newFee);
    event AgentStatusChanged(address indexed agent, bool status);
    event TokenRequirementUpdated(address indexed newToken);

    constructor(address _factoryAdmin, address _localDirector, address _tokenID) {
        // Master Admin Setup
        _grantRole(DEFAULT_ADMIN_ROLE, _factoryAdmin);
        _grantRole(FACTORY_ADMIN_ROLE, _factoryAdmin);
        
        // Operational Setup
        _grantRole(LAB_DIRECTOR_ROLE, _localDirector);

        // Factory Admin manages the Director role
        _setRoleAdmin(LAB_DIRECTOR_ROLE, FACTORY_ADMIN_ROLE);
        
        agentPermissionToken = _tokenID; 
    }

    // --- EMERGENCY OVERRIDES ---

    function pause() external {
        require(hasRole(FACTORY_ADMIN_ROLE, msg.sender) || hasRole(LAB_DIRECTOR_ROLE, msg.sender), "Unauthorized");
        _pause();
    }

    function unpause() external {
        require(hasRole(FACTORY_ADMIN_ROLE, msg.sender) || hasRole(LAB_DIRECTOR_ROLE, msg.sender), "Unauthorized");
        _unpause();
    }

    // --- ADMINISTRATIVE CONTROLS ---

    function setAgentToken(address _newToken) external {
        require(hasRole(FACTORY_ADMIN_ROLE, msg.sender), "Only Factory Admin");
        agentPermissionToken = _newToken;
        emit TokenRequirementUpdated(_newToken);
    }

    function setAnchorFee(uint256 _newFee) external {
        require(hasRole(LAB_DIRECTOR_ROLE, msg.sender), "Only Director");
        anchorFee = _newFee;
        emit FeeUpdated(_newFee);
    }

    function setAutomation(bool _status) external {
        require(hasRole(LAB_DIRECTOR_ROLE, msg.sender), "Only Director");
        automationEnabled = _status;
    }

    function setAgentStatus(address _agent, bool _status) external {
        require(hasRole(LAB_DIRECTOR_ROLE, msg.sender), "Only Director");
        authorizedAgents[_agent] = _status;
        emit AgentStatusChanged(_agent, _status);
    }

    // --- CORE LOGIC (HTS-Gated Agentic Anchor) ---

    function addReport(uint256 _id, string memory _res, string memory _tech, address _pat) 
        public payable whenNotPaused 
    {
        bool isDirector = hasRole(LAB_DIRECTOR_ROLE, msg.sender);
        
        // HTS-EVM Check: Queries the token balance via standard ERC20 interface
        uint256 agentBalance = IERC20(agentPermissionToken).balanceOf(msg.sender);
        
        bool isAuthAgent = (automationEnabled && authorizedAgents[msg.sender] && agentBalance > 0);
        
        if (!isDirector && !isAuthAgent) revert("Unauthorized: Missing Role or HTS Token");
        if (msg.value < anchorFee) revert("Insufficient HBAR Fee");

        labReports[_id] = LabReport(_res, _tech, block.timestamp, _pat);
        emit ReportAnchored(_id, _pat, _tech, block.timestamp);
    }

    function withdraw() external whenNotPaused {
        require(hasRole(LAB_DIRECTOR_ROLE, msg.sender), "Only Director");
        payable(msg.sender).transfer(address(this).balance);
    }

    function getReport(uint256 _id) public view returns (LabReport memory) {
        LabReport memory r = labReports[_id];
        // Privacy Shield
        if (!hasRole(LAB_DIRECTOR_ROLE, msg.sender) && msg.sender != r.patientAddress) revert("Access Denied");
        return r;
    }

    // Fallback to receive HBAR
    receive() external payable {}
}
