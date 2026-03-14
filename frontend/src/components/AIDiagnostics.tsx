import React, { useState, useRef } from "react";
import type { LabReportInput } from "../types";
import { executeAgent, insertLabAudit, hederaTxUrl } from "../api";

interface Toast {
  id: number;
  message: string;
  type: "info" | "success" | "error";
}

let toastId = 0;

export const AIDiagnostics: React.FC = () => {
  const [form, setForm] = useState<LabReportInput>({
    id: Math.floor(Math.random() * 1000) + 1000,
    patientName: "",
    patientAddress: "",
    testName: "",
    resultValue: "",
  });
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pushToast(message: string, type: Toast["type"] = "info") {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "id" ? Number(value) || 0 : value,
    }));
  };

  const processRecord = async (data: LabReportInput) => {
    pushToast(`Processing report ${data.id}...`, "info");
    const result = await executeAgent(data);
    const tx = result.hedera.transactionId ?? null;
    
    await insertLabAudit({
      report_id: String(data.id),
      patient_evm: data.patientAddress,
      patient_name: data.patientName, // We send actual name to DB
      test_name: data.testName,
      result_value: String(data.resultValue),
      ai_summary: result.aiSummary,
      tx_id: tx,
      status: result.hedera.status,
    });

    return { aiSummary: result.aiSummary, tx };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientAddress || !form.testName || !form.resultValue) {
      pushToast("Please fill all required fields.", "error");
      return;
    }

    try {
      setLoading(true);
      setAiSummary(null);
      setTxId(null);
      const res = await processRecord(form);
      setAiSummary(res.aiSummary);
      setTxId(res.tx);
      pushToast("Report anchored successfully", "success");
    } catch (err: any) {
      console.error(err);
      pushToast(String(err.message || err), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = text.split(/\r?\n/).filter(r => r.trim());
    
    if (rows.length === 0) {
      pushToast("CSV is empty", "error");
      return;
    }

    setLoading(true);
    pushToast(`Found ${rows.length} records. Processing in background...`, "info");
    
    // Process sequentially to not overload DB/Agent concurrently too much for large CSVs
    let successCount = 0;
    for (const row of rows) {
      const parts = row.split(",");
      if (parts.length < 5) continue;
      
      const [idStr, pName, pAddress, tName, rValue] = parts;
      try {
        await processRecord({
          id: Number(idStr) || Math.floor(Math.random() * 10000),
          patientName: pName?.trim() || "",
          patientAddress: pAddress?.trim() || "",
          testName: tName?.trim() || "",
          resultValue: rValue?.trim() || "",
        });
        successCount++;
      } catch (err: any) {
        pushToast(`Error on row ${idStr}: ${err.message}`, "error");
      }
    }
    
    pushToast(`Finished CSV. ${successCount} records anchored.`, "success");
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>AI Diagnostics</h1>
        <p className="sub">
          Upload structured lab parameters manually or via CSV. The agent will anonymize, interpret, and anchor to Hedera.
        </p>
      </header>

      <div className="grid-two">
        <section className="card">
          <h2>Manual Entry</h2>
          <form className="form" onSubmit={handleSubmit}>
            <div className="field-row">
              <label>
                Report ID
                <input type="number" name="id" value={form.id} onChange={handleChange} />
              </label>
              <label>
                Patient Name
                <input
                  type="text"
                  name="patientName"
                  value={form.patientName}
                  onChange={handleChange}
                  placeholder="Will be saved to DB but hashed on-chain"
                />
              </label>
            </div>
            <div className="field-row">
              <label>
                Patient EVM Address
                <input
                  type="text"
                  name="patientAddress"
                  value={form.patientAddress}
                  onChange={handleChange}
                  placeholder="0x…"
                  required
                />
              </label>
            </div>
            <div className="field-row">
              <label>
                Test Name
                <input
                  type="text"
                  name="testName"
                  value={form.testName}
                  onChange={handleChange}
                  placeholder="Glucose, HbA1c, etc."
                  required
                />
              </label>
              <label>
                Result Value
                <input
                  type="text"
                  name="resultValue"
                  value={form.resultValue}
                  onChange={handleChange}
                  placeholder="150, 7.5, etc."
                  required
                />
              </label>
            </div>
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Executing Workflow…" : "Run Single Diagnostic"}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>Bulk CSV Upload</h2>
          <p className="sub" style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
            Format: <code>ID, PatientName, EVMAddress, TestName, ResultValue</code>
          </p>
          <div 
            className="upload-zone" 
            onClick={() => fileInputRef.current?.click()}
          >
            <p><strong>Click to browse</strong> or drag CSV here.</p>
            <p className="sub" style={{ fontSize: "0.8rem" }}>Supports bulk automated AI analysis.</p>
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              onChange={handleFileUpload}
            />
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h3>Agent Telemetry</h3>
            <ul className="toast-list">
              {toasts.map((t) => (
                <li key={t.id} className={`toast ${t.type}`}>{t.message}</li>
              ))}
            </ul>
            {aiSummary && (
              <div className="result-block" style={{ marginTop: "1rem" }}>
                <h3>Last Diagnostic Result</h3>
                <p className="mono">{aiSummary}</p>
                {txId && hederaTxUrl(txId) && (
                  <p style={{ marginTop: "0.5rem" }}>
                    <a href={hederaTxUrl(txId)!} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", fontSize: "0.85rem", fontWeight: 500 }}>
                      Verify on HashScan →
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
