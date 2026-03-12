const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { anchorReport } = require("./index");
const { summarizeLabResult } = require("./llm");

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function parseCsvLine(line) {
  const [idStr, patientName, patientAddress, testName, resultValue] =
    line.split(",");

  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    throw new Error(`Invalid id in CSV: ${idStr}`);
  }

  return {
    id,
    patientName: patientName?.trim(),
    patientAddress: patientAddress?.trim(),
    testName: testName?.trim(),
    resultValue: resultValue?.trim(),
  };
}

function scrubLabRecord(record) {
  const hashedPatientId = hashValue(record.patientName || "unknown");

  return {
    id: record.id,
    patientAddress: record.patientAddress,
    testName: record.testName,
    resultValue: record.resultValue,
    hashedPatientId,
  };
}

async function processCsvFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  for (const line of lines) {
    try {
      const parsed = parseCsvLine(line);
      const scrubbed = scrubLabRecord(parsed);

      const aiSummary = await summarizeLabResult({
        hashedPatientId: scrubbed.hashedPatientId,
        testName: scrubbed.testName,
        resultValue: scrubbed.resultValue,
      });

      await anchorReport({
        id: scrubbed.id,
        resultSummary: aiSummary,
        technicianName:
          process.env.LAB_REGISTRY_AGENT_NAME || "Uzumaki-AI-Agent",
        patientEvmAddress: scrubbed.patientAddress,
      });
    } catch (err) {
      console.error(`Failed to process line "${line}":`, err.message);
    }
  }
}

function startFolderListener(folderPath) {
  const watchPath = path.resolve(folderPath);

  if (!fs.existsSync(watchPath)) {
    fs.mkdirSync(watchPath, { recursive: true });
  }

  console.log(`Watching folder for lab files: ${watchPath}`);

  fs.watch(watchPath, async (eventType, filename) => {
    if (!filename || !filename.endsWith(".csv")) return;

    const fullPath = path.join(watchPath, filename);

    // Simple debounce: wait a moment for the write to finish.
    setTimeout(() => {
      processCsvFile(fullPath).catch((err) =>
        console.error("Error processing file:", err)
      );
    }, 500);
  });
}

module.exports = { startFolderListener, processCsvFile };

