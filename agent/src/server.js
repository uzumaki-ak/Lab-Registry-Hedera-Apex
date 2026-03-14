require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const { summarizeLabResult } = require("./llm");
const { anchorReport } = require("./index");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.AGENT_API_PORT || 4000;

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

app.post("/api/execute-report", async (req, res) => {
  const { id, patientName, patientAddress, testName, resultValue } = req.body || {};

  if (
    typeof id !== "number" ||
    !patientAddress ||
    !testName ||
    typeof resultValue === "undefined"
  ) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const hashedPatientId = hashValue(patientName || "unknown");

  try {
    const aiSummary = await summarizeLabResult({
      hashedPatientId,
      testName,
      resultValue,
    });

    const agentName =
      process.env.LAB_REGISTRY_AGENT_NAME || "Uzumaki-AI-Agent";

    const hederaResult = await anchorReport({
      id,
      resultSummary: aiSummary,
      technicianName: agentName,
      patientEvmAddress: patientAddress,
    });

    res.json({
      id,
      patientAddress,
      hashedPatientId,
      testName,
      resultValue,
      aiSummary,
      hedera: hederaResult,
    });
  } catch (err) {
    console.error("Agent execution failed:", err);
    res
      .status(500)
      .json({ error: "Agent execution failed", details: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Agent API listening on http://localhost:${PORT}`);
});

