// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;  // LabRegistry V3.1

import "@openzeppelin/contracts/access/Ownable.sol";

contract LabRegistry is Ownable {
    struct LabReport {
        string results;
        string technician;
        uint256 timestamp;
        address patientAddress;
    }

    mapping(uint256 => LabReport) private labReports;
    error AccessDenied();

    event ReportAnchored(uint256 indexed id, string technician, uint256 timestamp);

    // Standard constructor sets YOU as owner immediately
    constructor(address _initialOwner) Ownable(_initialOwner) {}

    function addReport(uint256 _id, string memory _results, string memory _technician, address _patient) public onlyOwner {
        labReports[_id] = LabReport({
            results: _results,
            technician: _technician,
            timestamp: block.timestamp,
            patientAddress: _patient
        });
        emit ReportAnchored(_id, _technician, block.timestamp);
    }

    function getReport(uint256 _id) public view returns (LabReport memory) {
        LabReport memory report = labReports[_id];
        if (msg.sender != owner() && msg.sender != report.patientAddress) {
            revert AccessDenied();
        }
        return report;
    }
}
