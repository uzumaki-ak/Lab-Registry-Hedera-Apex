require("dotenv").config();

const {
  Client,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  PrivateKey,
} = require("@hashgraph/sdk");

const path = require("path");
const fs = require("fs");

function createClientFromEnv() {
  const network = process.env.HEDERA_NETWORK || "testnet";
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error("HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set");
  }

  const client =
    network === "mainnet" ? Client.forMainnet() : Client.forTestnet();

  const privateKey = PrivateKey.fromStringECDSA(operatorKey);

  return client.setOperator(operatorId, privateKey);
}

async function anchorReport({
  id,
  resultSummary,
  technicianName,
  patientEvmAddress,
}) {
  const client = createClientFromEnv();

  const contractId = process.env.LAB_REGISTRY_CONTRACT_ID;
  if (!contractId) {
    throw new Error("LAB_REGISTRY_CONTRACT_ID must be set");
  }

  const gasLimit = 150000;

  const tx = await new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(gasLimit)
    .setFunction(
      "addReport",
      new ContractFunctionParameters()
        .addUint256(id)
        .addString(resultSummary)
        .addString(technicianName)
        .addAddress(patientEvmAddress)
    )
    .freezeWith(client);

  const signTx = await tx.signWithOperator(client);
  const response = await signTx.execute(client);
  const receipt = await response.getReceipt(client);

  console.log(
    `Anchor status for report ${id}: ${receipt.status.toString()}`
  );

  return {
    status: receipt.status.toString(),
    transactionId: response.transactionId.toString(),
  };
}

module.exports = { anchorReport };

