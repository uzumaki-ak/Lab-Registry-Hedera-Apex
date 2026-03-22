import React, { useState, useRef } from "react";
import type { LabReportInput } from "../types";
import { executeAgent, insertLabAudit, hederaTxUrl, fetchLabAudit, type LabAuditRow } from "../api";

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
  const [lastReport, setLastReport] = useState<LabAuditRow | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pushToast(message: string, type: Toast["type"] = "info") {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }

  const checkStatus = async (reportId: string) => {
    try {
      const all = await fetchLabAudit();
      const match = all.find(r => r.report_id === reportId);
      if (match) setLastReport(match);
    } catch (err) {
      console.error("Failed to check status", err);
    }
  };

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
    const ipfsCID = result.ipfsCID ?? null;
    
    const row = {
      report_id: String(data.id),
      patient_evm: data.patientAddress,
      patient_name: data.patientName,
      test_name: data.testName,
      result_value: String(data.resultValue),
      ai_summary: result.aiSummary,
      ipfs_cid: ipfsCID,
      tx_id: tx,
      status: "PENDING" as const,
    };

    await insertLabAudit(row);
    setLastReport(row as any);
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientAddress || !form.testName || !form.resultValue) {
      pushToast("Please fill all required fields.", "error");
      return;
    }

    try {
      setLoading(true);
      await processRecord(form);
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
    pushToast(`Found ${rows.length} records. Processing...`, "info");
    
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
          Anonymize, interpret, and anchor lab data to Hedera Trust Layer.
        </p>
      </header>

      {lastReport?.status === "REJECTED" && (
        <div className="rejection-banner">
          <h4>⚠️ Clinical Veto Issued</h4>
          <p>Reason: {lastReport.rejection_reason || "Clinical anomaly detected by Officer."}</p>
          <button className="primary-btn" style={{ background: '#ef4444', width: 'fit-content' }} onClick={() => setLastReport(null)}>
            Acknowledge & Clear
          </button>
        </div>
      )}

      <div className="grid-two">
        <section className="card">
          <h2>Diagnostic Entry</h2>
          <form className="form" onSubmit={handleSubmit}>
            <div className="field-row">
              <label>
                Report ID
                <input type="number" name="id" value={form.id} onChange={handleChange} />
              </label>
              <label>
                Patient Name
                <input type="text" name="patientName" value={form.patientName} onChange={handleChange} placeholder="PII (Database only)" />
              </label>
            </div>
            <div className="field-row">
              <label>
                Patient EVM Address
                <input type="text" name="patientAddress" value={form.patientAddress} onChange={handleChange} placeholder="0x..." required />
              </label>
            </div>
            <div className="field-row">
              <label>
                Test Name
                <input type="text" name="testName" value={form.testName} onChange={handleChange} placeholder="e.g. Glucose" required />
              </label>
              <label>
                Result Value
                <input type="text" name="resultValue" value={form.resultValue} onChange={handleChange} placeholder="e.g. 110 mg/dL" required />
              </label>
            </div>
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Anchoring..." : "Run AI Diagnostic"}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>Anchor Telemetry</h2>
          
          {lastReport ? (
            <div className="telemetry-content">
              <div className="timeline">
                <div className={`step complete`}>
                  <div className="step-dot">1</div>
                  <span className="step-label">Anchored</span>
                </div>
                <div className={`step ${lastReport.status === 'PENDING' ? 'active' : 'complete'}`}>
                  <div className="step-dot">2</div>
                  <span className="step-label">Clinical Queue</span>
                </div>
                <div className={`step ${lastReport.status === 'VERIFIED' ? 'complete' : (lastReport.status === 'REJECTED' ? 'rejected' : '')}`}>
                  <div className="step-dot">3</div>
                  <span className="step-label">{lastReport.status === 'REJECTED' ? 'Vetoed' : 'Verified'}</span>
                </div>
              </div>

              <div className="result-block">
                <h3>Interpretive Summary</h3>
                <p className="mono" style={{ fontSize: '0.9rem' }}>{lastReport.ai_summary}</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  {lastReport.tx_id && (
                    <a href={hederaTxUrl(lastReport.tx_id)!} target="_blank" rel="noreferrer" className="small" style={{ color: 'var(--btn-primary)' }}>
                      View Transaction →
                    </a>
                  )}
                  <button className="small text-btn" style={{ width: 'auto' }} onClick={() => checkStatus(lastReport.report_id!)}>
                    Refresh Status ↻
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
              <p>No active session. <strong>Click to bulk upload CSV</strong></p>
              <input type="file" accept=".csv" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} />
            </div>
          )}

          <ul className="toast-list" style={{ marginTop: '1.5rem' }}>
            {toasts.map((t) => (
              <li key={t.id} className={`toast ${t.type}`}>{t.message}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};
