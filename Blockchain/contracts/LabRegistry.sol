// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;
import "@openzeppelin/contracts/access/Ownable.sol";

contract LabRegistry is Ownable {
    struct LabReport { string results; string tech; uint256 time; address patient; }
    mapping(uint256 => LabReport) private labReports;
    event ReportAnchored(uint256 id, string tech, uint256 time);

    constructor(address _owner) Ownable(_owner) {}

    function addReport(uint256 _id, string memory _res, string memory _tech, address _pat) public onlyOwner {
        labReports[_id] = LabReport(_res, _tech, block.timestamp, _pat);
        emit ReportAnchored(_id, _tech, block.timestamp);
    }
}