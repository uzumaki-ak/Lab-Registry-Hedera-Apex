// SPDX-License-Identifier: MIT
pragma solidity 0.8.23; //V4.2
import "@openzeppelin/contracts/access/Ownable.sol";

contract LabRegistry is Ownable {
    uint256 public anchorFee = 1e8; 
    bool public automationEnabled;
    mapping(address => bool) public authorizedAgents;

    struct LabReport { string results; string tech; uint256 time; address patient; }
    mapping(uint256 => LabReport) private labReports;
    event ReportAnchored(uint256 indexed id, address indexed patient, string tech, uint256 time);

    constructor(address _owner) Ownable(_owner) {}

    function setAutomation(bool _status) external onlyOwner { automationEnabled = _status; }

    function addReport(uint256 _id, string memory _res, string memory _tech, address _pat) public payable {
        bool isAuth = (msg.sender == owner() || (automationEnabled && authorizedAgents[msg.sender]));
        require(isAuth, "Not Authorized");
        require(msg.value >= anchorFee, "Fee Required");
        labReports[_id] = LabReport(_res, _tech, block.timestamp, _pat);
        emit ReportAnchored(_id, _pat, _tech, block.timestamp);
    }
}
    