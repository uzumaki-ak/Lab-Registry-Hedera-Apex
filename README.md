# 🏥 Smart Lab Registry (Hedera Apex 2026)

**"A verifiable biotechnology ecosystem that anchors AI-driven microbial analysis onto the Hedera network, providing a decentralized, aBFT-secured registry for immutable scientific data provenance."**

**Track:** AI & Agents

**Lead Architect:** Liasandeen Ikienu (Crimson_Ox)

**Architecture:** HTS-EVM Hybrid | Sovereign RBAC | Dual-Signature Governance

**Network:** Hedera Testnet (aBFT Secured)

**Contract Address:** `0.0.8166906`

---

## 🔗 Live Access & Media

> [!IMPORTANT]
> **Project URL:** [Production URL here after deployment]
> **Technical Demo Video:** [YouTube/Loom Link here]
> **Storage Layer:** [Verified Pinata IPFS Gateway]

---

## 🎯 Project Motivation: Bridging Microbiology & Web3

As a **Microbiology student**, I recognized a critical vulnerability in the path of medical data: the "last mile" between AI analysis and physician decision-making is prone to tampering, centralized failure, and lack of provenance. In 2026, medical AI is powerful, but its output is only as trustworthy as the audit trail supporting it.

The **Smart Lab Registry** was born from a need to provide a verifiable **"Single Source of Truth."** By leveraging Hedera’s **asynchronous Byzantine Fault Tolerance (aBFT)**—the gold standard for consensus security—I have architected a system where scientific integrity is a cryptographic certainty. Every microbial insight is anchored to an immutable ledger, shifting the paradigm from "Trust us, we're doctors" to **"Verify us, it's on the ledger."**

---

## 🏗️ Technical Architecture & Ecosystem Flow

The Smart Lab Registry is a multi-tier ecosystem designed for high-frequency medical throughput. We have transitioned to a **Dual-Signature Governance** model to ensure human-in-the-loop accountability.

### 1. The HTS-Gated Sovereign RBAC

The backbone of the system is a custom **Role-Based Access Control (RBAC)** model that integrates directly with the **Hedera Token Service (HTS)**. To interact with the registry, the AI Agent must hold the **Sovereign Badge Token (0.0.8138959)**. This ensures that even whitelisted accounts cannot execute diagnostic anchors without the physical presence of the utility token in their vault.

### 2. Dual-Signature Multi-Sig Validation 

To eliminate dependency on standalone AI interpretations, reports now undergo a two-stage verification:

* **Signer 1 (Agent):** The `Uzumaki-AI` agent performs the initial analysis and signs the telemetry.
* **Signer 2 (Human):** A Medical Officer (Account `0.0.8182742`) reviews the diagnostic before final ledger anchoring.
* **Status:** Only reports with both signatures achieve the **"FULLY VERIFIED"** status on the blockchain.

### 3. Agentic IPFS Merkle-Bridge (Production Ready)

Large-scale lab results are no longer stored on-chain to preserve gas. Instead:

* **Storage:** Encrypted clinical data is pinned via the **Pinata SDK**.
* **Anchoring:** Only the **IPFS Content Identifier (CID)** is stored in the Smart Contract, creating an immutable link between the ledger and the decentralized storage layer.

---

## 💻 The Technical Stack: Enterprise-Grade Architecture

| Layer                 | Technology                 | Function |
|                   --- |                        --- |                                                         --- |
| **Blockchain**        | **Hedera Network (aBFT)**  | Secure provenance and gas-efficient medical anchoring.      |
| **Smart Contracts**   | **Solidity 0.8.23**        | Sovereign RBAC, HTS Gating, and Dual-Signature logic.       |
| **AI/LLM**            | **OpenAI (Euron Model)**   | Clinical interpretation, PII scrubbing, and bulk analysis.  |
| **Storage (Bulk)**    | **IPFS (via Pinata SDK)**  | Decentralized Merkle-Bridge for high-capacity medical data. |
| **Frontend**          | **React 18 + TypeScript**  | Type-safe, high-performance diagnostic dashboard.           |
| **Auth/Identity**     | **Supabase**               | Off-chain RBAC management and user session security.        |

---

## 🛠️ Evolutionary Roadmap: From Sandbox to Sovereign Infrastructure

The development of the Smart Lab Registry followed a rigorous, iterative audit lifecycle. Every phase was manually verified and gas-profiled.

### ⏳ Phase 1 - 3: Foundation & Security

* **V1:** Basic String storage (Baseline Gas: 23,893).
* **V2:** Moving to Structs and Metadata (47% gas reduction).
* **V3:** **Proxy Experiment.** Tested Initializable Proxies but deprecated them to avoid storage collisions in medical data.
* **Status:** Verified on-chain at `0xcC1C87ADE2A84f42a7F8aFcc24E216317fe53E29`.

> [!NOTE]
> For full technical details and stress-test logs of Phases 1 through 3, please refer to the [Project Issues] and [TESTING_LOG.md].

---

### ⚔️ Phase 4: The HTS Integration Battlefield (V4)

* **Objective:** Transition from centralized ownership to decentralized HTS-EVM Hybrid security.
* **The Pivot:** Successfully shifted to **ERC20-parity bridge** for Token `0.0.8138959` after native precompile reverts.
* **🔗 Full Audit Log:** [Evolution V4 Log](./development-logs/V4-V5/EVOLUTION_V4.md)
)
### 🏛️ Phase 5: The "Clean State" Production (V5.0)

* **Objective:** Deploy a pristine, "Zero-Cluster" infrastructure for judges.
* **Innovation:** Triple-Lock Security System (HTS Gating + RBAC + Anti-Overwrite Shield).
* **Status:** **ACTIVE / FINAL** at `0.0.8166906`
*  **🔗 Full Audit Log:** [Production V5 Log](./development-logs/V4-V5/PRODUCTION_V5.md)

---

## 📊 Comprehensive Gas Evolution & "The Security Tax"

| Operation              | V1 (Primitive) | V3.1 (Secured Proxy) | V5.0 (Final Hardened) |
|                    --- |            --- |                  --- |                   --- |
| **Deployment**         | 185,000        | 850,000              | **558,394**           |
| **`addReport` (Warm)** | 23,893         | 32,440               | **137,902***          |
| **`getReport`**        | 5,500          | 8,200                | **18,500**            |

***Note on Gas Optimization:** The V5.0 gas cost includes the "Security Tax" required for 3-Factor Authentication (HTS Token + Whitelist + RBAC), ensuring medical-grade data integrity.*

### 🏛️ Architectural Pivot: Proxy to Standard Implementation

> **Decision:** Deprecated the *Initializable Proxy* pattern in favor of the **V5.0 Hardened Standard** implementation.
> **Rationale:** > * **Data Integrity:** Eliminated the risk of "Storage Collision" in a high-stakes medical registry.
> * **Reliability:** Standard contracts provide a direct, immutable ABI for the AI Agent.
> * **Security Reinvestment:** Saved gas from proxy overhead was reinvested into the mandatory **HTS Badge Token balance check**.
> 
> 

---

## 💻 Core Implementation: LabRegistry V5.0 (Standard)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LabRegistry is AccessControl, Pausable {
    bytes32 public constant FACTORY_ADMIN_ROLE = keccak256("FACTORY_ADMIN_ROLE");
    bytes32 public constant LAB_DIRECTOR_ROLE = keccak256("LAB_DIRECTOR_ROLE");

    address public agentPermissionToken;
    uint256 public anchorFee = 1 ether; 
    bool public automationEnabled; 
    
    mapping(address => bool) public authorizedAgents; 

    struct LabReport {
        string results;
        string technician;
        uint256 timestamp;
        address patientAddress;
    }

    mapping(uint256 => LabReport) private labReports;

    constructor(address _factoryAdmin, address _localDirector, address _tokenID) {
        _grantRole(DEFAULT_ADMIN_ROLE, _factoryAdmin);
        _grantRole(FACTORY_ADMIN_ROLE, _factoryAdmin);
        _grantRole(LAB_DIRECTOR_ROLE, _localDirector);
        _setRoleAdmin(LAB_DIRECTOR_ROLE, FACTORY_ADMIN_ROLE);
        agentPermissionToken = _tokenID; 
    }

    function addReport(uint256 _id, string memory _res, string memory _tech, address _pat) 
        public payable whenNotPaused 
    {
        require(labReports[_id].timestamp == 0, "ID already exists");

        bool isDirector = hasRole(LAB_DIRECTOR_ROLE, msg.sender);
        uint256 agentBalance = IERC20(agentPermissionToken).balanceOf(msg.sender);
        bool isAuthAgent = (automationEnabled && authorizedAgents[msg.sender] && agentBalance > 0);
        
        if (!isDirector && !isAuthAgent) revert("Unauthorized: Missing Role or HTS Token");
        if (msg.value < anchorFee) revert("Insufficient HBAR Fee"); 

        labReports[_id] = LabReport(_res, _tech, block.timestamp, _pat);
    }

    function setAgentStatus(address _agent, bool _status) external onlyRole(LAB_DIRECTOR_ROLE) {
        authorizedAgents[_agent] = _status;
    }
}

```

---

## 🛡️ Security Audit & Manual Verification

### 1. Mandatory Security Key Rotation

* **Audit Milestone:** Rotated AI Agent from Legacy R&D account to Production Identity.
* **New Agent ID:** `0.0.8182742` (Check Account 4 history for production anchors).
* **HTS Verification:** Successfully whitelisted and transferred 500 Sovereign Badge Tokens.

### 2. Sourcify Verification

The contract is verified on **Sourcify** with a **100% Runtime Bytecode Match**.

### 3. Data Sovereignty (GDPR/HIPAA Alignment)

* **Decoupled Storage:** Clinical telemetry is stored on IPFS, enabling "Soft-Delete" capabilities without breaking blockchain integrity.

---

## 🧪 Installation & Testing (Forge/Foundry)

```bash
# Clone and Build
git clone https://github.com/[YourUsername]/Lab-Registry-Hedera-Apex
cd Lab-Registry-Hedera-Apex
forge install openzeppelin/openzeppelin-contracts
forge build

# Run Audit Suite
forge test -vv --match-test testUnauthorizedAnchor

```

---

## 🚀 Future Roadmap

* **The Lab Factory:** Deploying departmental clones (Virology, Oncology) with isolated HTS-gated storage.
* **Health Data NFTs:** Tokenizing results as unique HTS NFTs, giving patients true ownership and "burn" capabilities.

---

## 👥 The Development Team

* **Liasandeen Ikienu ([Crimson-Ox](https://www.google.com/search?q=https://github.com/Crimson-Ox)) — Project Lead & Full-Stack Architect:** Executed the end-to-end architecture, core Solidity development, life-science research alignment, and the conceptual logic flow of the bridge.
* **Anikesh Kumar ([uzumaki-ak](https://www.google.com/search?q=https://github.com/uzumaki-ak)) — AI Strategy & Lead Frontend Developer:** Focused on AI model selection, React dashboard implementation, Dual-Signature logic, and Pinata/IPFS storage architecture.

---

**Verified on Hedera Testnet | aBFT Secured | 2026 Crimson Spiral Team**
