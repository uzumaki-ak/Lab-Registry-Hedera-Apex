const {
    Client,
    ContractCreateFlow,
    ContractFunctionParameters,
    PrivateKey,
} = require("@hashgraph/sdk");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
    // 1. Initialize Client
    let operatorId = process.env.HEDERA_OPERATOR_ID;
    let operatorKeyConfig = process.env.HEDERA_OPERATOR_KEY;

    if (!operatorId || !operatorKeyConfig) {
        throw new Error("Please set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY in agent/.env");
    }

    // Explicitly parse the private key (using ECDSA to match agent/src/index.js)
    const operatorKey = PrivateKey.fromStringECDSA(operatorKeyConfig);
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    // 2. Load Bytecode from Forge Artifact
    const artifactPath = path.resolve(__dirname, "../Blockchain/out/LabRegistry.sol/LabRegistry.json");
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artifact not found at ${artifactPath}. Did you run 'forge build' in Blockchain folder?`);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const bytecode = artifact.bytecode.object;

    console.log("Deploying LabRegistry v6.0 (Multi-Sig Upgrade)...");

    // 3. Deployment Parameters (Admin/Director/Token)
    // IMPORTANT: We use your primary ECDSA EVM address (0x6282d9286d6f6d326db5cba6e53878a6bd6c98af)
    // instead of the short account number to ensure the 'onlyRole' checks pass correctly.
    const params = new ContractFunctionParameters()
        .addAddress("0x6282d9286d6f6d326db5cba6e53878a6bd6c98af") // Factory Admin
        .addAddress("0x6282d9286d6f6d326db5cba6e53878a6bd6c98af") // Lab Director
        .addAddress("00000000000000000000000000000000007c30cf"); // Badge Token (0.0.8138959)

    // 4. Create Contract
    const contractCreateTx = new ContractCreateFlow()
        .setBytecode(bytecode)
        .setGas(2000000) // Deployment takes more gas
        .setConstructorParameters(params);

    const txResponse = await contractCreateTx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const newContractId = receipt.contractId;

    console.log("-------------------------------------------------");
    console.log(`✅ DEPLOYMENT SUCCESSFUL!`);
    console.log(`New Contract ID: ${newContractId}`);
    console.log(`New Contract EVM Address: ${newContractId.toSolidityAddress()}`);
    console.log("-------------------------------------------------");
    console.log("Next steps:");
    console.log("1. Update LAB_REGISTRY_CONTRACT_ID in agent/.env");
    console.log("2. Update VITE_LAB_REGISTRY_CONTRACT_ID in frontend/.env");
    console.log("3. Restart your agent and frontend.");
}

main().catch((err) => {
    console.error("Deployment failed:", err);
    process.exit(1);
});
