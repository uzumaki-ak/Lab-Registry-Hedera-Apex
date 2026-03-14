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

  const gasLimit = 300000;

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

async function verifyReport(id) {
  const client = createClientFromEnv();
  const contractId = process.env.LAB_REGISTRY_CONTRACT_ID;
  if (!contractId) throw new Error("LAB_REGISTRY_CONTRACT_ID must be set");

  const tx = await new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(200000)
    .setFunction("verifyReport", new ContractFunctionParameters().addUint256(id))
    .freezeWith(client);

  const signTx = await tx.signWithOperator(client);
  const response = await signTx.execute(client);
  const receipt = await response.getReceipt(client);

  return {
    status: receipt.status.toString(),
    transactionId: response.transactionId.toString(),
  };
}

async function getReportState(id) {
  const client = createClientFromEnv();
  const contractId = process.env.LAB_REGISTRY_CONTRACT_ID;

  const query = new ContractCallQuery()
    .setContractId(contractId)
    .setGas(100000)
    .setFunction("getReport", new ContractFunctionParameters().addUint256(id));

  const result = await query.execute(client);
  // Solidity struct layout for strings is complex, but the status is at the end.
  // For the hackathon, we know if verifyReport reverts with CONTRACT_REVERT_EXECUTED, 
  // and the report exists, it's almost certainly "already final".
  return result;
}

module.exports = { anchorReport, verifyReport, getReportState };

