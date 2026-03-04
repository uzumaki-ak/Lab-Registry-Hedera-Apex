// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title LabRegistry V3 (Proxy-Compatible & Guarded)
 * @author Crimson (Junior Auditor) & Gemini (Senior Auditor)
 */
contract LabRegistry is Initializable, OwnableUpgradeable {
    
    // --- CUSTOM ERRORS ---
    error InvalidReportID(uint256 id);
    error AccessDenied();

    // --- DATA STRUCTURES ---
    struct LabReport { 
        string results;
        string technician;
        uint256 timestamp;
        address patientAddress; 
    }

    mapping(uint256 => LabReport) private labReports;

    // --- EVENTS ---
    event ReportAnchored(uint256 indexed id, string technician, uint256 timestamp);

    /**
     *  THE GUARD RAIL:
     * This constructor ensures that the master "Blueprint" contract 
     * cannot be initialized. It protects the logic from being hijacked.
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
       _disableInitializers();
    }

    /**
     * @notice Replaces the Constructor for the Factory Pattern.
     * @param _initialOwner The address that will own this specific child contract.
     */
    function initialize(address _initialOwner) public initializer {
        __Ownable_init(_initialOwner);
    }

    
    //  Records a lab report and assigns it to a specific patient.
    
    function addReport(
        uint256 _id, 
        string memory _results, 
        string memory _technician,
        address _patient 
    ) public onlyOwner {
        if (labReports[_id].timestamp != 0) revert InvalidReportID(_id);

        labReports[_id] = LabReport(_results, _technician, block.timestamp, _patient);
        emit ReportAnchored(_id, _technician, block.timestamp);
    }

    /**
     *  Privacy-Locked Retrieval.
     * Only the Owner OR the assigned Patient can view.
     */
    function getReport(uint256 _id) public view returns (LabReport memory) {
        LabReport memory report = labReports[_id];
        
        if (report.timestamp == 0) revert InvalidReportID(_id);

        if (msg.sender != owner() && msg.sender != report.patientAddress) {
            revert AccessDenied();
        }

        return report;
    }
}