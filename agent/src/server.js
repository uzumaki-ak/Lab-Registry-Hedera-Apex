require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const { summarizeLabResult, chatWithLabContext } = require("./llm");
const { anchorReport } = require("./index");
const { pinDiagnosticToIPFS } = require("./ipfs");

const { createClient } = require("@supabase/supabase-js");

const app = express();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

const PORT = process.env.PORT || process.env.AGENT_API_PORT || 4000;

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
    let hederaResult;
    try {
      hederaResult = await verifyReport(id);
    } catch (err) {
      const isRevert = err.message && (
        err.message.includes("Report already final") || 
        err.message.includes("CONTRACT_REVERT_EXECUTED")
      );

      if (isRevert) {
        console.log(`Report ${id} probably already verified (Revert). Syncing DB just in case...`);
        hederaResult = { status: "SUCCESS", note: "Synced from on-chain state" };
      } else {
        throw err;
      }
    }

    // Update Supabase status to VERIFIED
    const { error: dbErr } = await supabase
      .from("lab_audit")
      .update({ status: "VERIFIED", verified_by: process.env.HEDERA_OPERATOR_ID })
      .eq("report_id", String(id));

    if (dbErr) {
      console.error(`Supabase sync failed for report ${id}:`, dbErr.message);
      // We don't throw here if on-chain was successful, but we log it
    } else {
      console.log(`✅ Supabase sync successful for report ${id}`);
    }

    res.json({ success: true, hedera: hederaResult });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/reject-report", async (req, res) => {
  try {
    const { id, reason } = req.body;
    if (!id || !reason) return res.status(400).json({ error: "Missing report ID or reason" });

    const { rejectReport } = require("./index");
    const hederaResult = await rejectReport(id, reason);

    // Update Supabase status to REJECTED
    const { error: dbErr } = await supabase
      .from("lab_audit")
      .update({ 
        status: "REJECTED", 
        verified_by: process.env.HEDERA_OPERATOR_ID,
        rejection_reason: reason // Note: Ensure this column is added if not there, or use a field
      })
      .eq("report_id", String(id));

    if (dbErr) {
      console.error(`Supabase sync failed for rejection of report ${id}:`, dbErr.message);
    }

    res.json({ success: true, hedera: hederaResult });
  } catch (err) {
    console.error("Rejection error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/handle-transfer", async (req, res) => {
  try {
    const { id, approve, note } = req.body;
    if (!id || typeof approve !== 'boolean') return res.status(400).json({ error: "Missing transfer info" });

    const { handleTransferRequest } = require("./index");
    const hederaResult = await handleTransferRequest(id, approve, note || "");
    res.json({ success: true, hedera: hederaResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/set-automation", async (req, res) => {
  try {
    const { status } = req.body;
    const { setAutomation } = require("./index");
    const hederaResult = await setAutomation(status);
    res.json({ success: true, hedera: hederaResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/set-fee", async (req, res) => {
  try {
    const { fee } = req.body;
    const { setAnchorFee } = require("./index");
    const hederaResult = await setAnchorFee(fee);
    res.json({ success: true, hedera: hederaResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/treasury-stats", async (req, res) => {
  try {
    const { getTreasuryStats } = require("./index");
    const stats = await getTreasuryStats();
    res.json(stats);
  } catch (err) {
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

