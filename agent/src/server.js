require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const { summarizeLabResult, chatWithLabContext } = require("./llm");
const { anchorReport } = require("./index");
const { pinDiagnosticToIPFS } = require("./ipfs");

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

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

    // --- NEW: IPFS STORAGE LAYER ---
    const ipfsData = {
      id,
      patientAddress,
      hashedPatientId,
      testName,
      resultValue,
      aiSummary,
      timestamp: new Date().toISOString()
    };
    
    const ipfsCID = await pinDiagnosticToIPFS(ipfsData);

    const agentName =
      process.env.LAB_REGISTRY_AGENT_NAME || "Uzumaki-AI-Agent";

    const hederaResult = await anchorReport({
      id,
      resultSummary: ipfsCID, // We anchor the CID, not the summary!
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
      ipfsCID,
      hedera: hederaResult,
    });
  } catch (err) {
    console.error("Agent execution failed:", err);
    res
      .status(500)
      .json({ error: "Agent execution failed", details: String(err) });
  }
});

app.post("/api/verify-report", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing report ID" });

    const { verifyReport } = require("./index");
    const result = await verifyReport(id);

    // Update Supabase status to VERIFIED
    const { createClient } = require("@supabase/supabase-client");
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    await supabase
      .from("lab_audit")
      .update({ status: "VERIFIED", verified_by: process.env.HEDERA_OPERATOR_ID })
      .eq("report_id", String(id));

    res.json({ success: true, hedera: result });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/chat", async (req, res) => {
  const { query, labContext } = req.body || {};
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing query" });
  }
  try {
    const answer = await chatWithLabContext({
      userQuery: query.trim(),
      labContext: Array.isArray(labContext) ? labContext : [],
    });
    res.json({ answer });
  } catch (err) {
    console.error("Chat failed:", err);
    res.status(500).json({ error: String(err.message) });
  }
});

app.listen(PORT, () => {
  console.log(`Agent API listening on http://localhost:${PORT}`);
});

