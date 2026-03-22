import React, { useEffect, useState } from "react";
import { fetchLabAudit, hederaTxUrl, verifyOnChainReport, type LabAuditRow } from "../api";
import type { User } from "./Login";

interface Toast {
  id: number;
  message: string;
  type: "info" | "success" | "error";
}

interface AuditTrailProps {
  user: User;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ user }) => {
  const [rows, setRows] = useState<LabAuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = (message: string, type: "info" | "success" | "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const filter = user.role === "patient" ? user.patient_evm : undefined;
      const data = await fetchLabAudit(filter);
      setRows(data);
    } catch (err: any) {
      console.error(err);
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (reportId: string) => {
    try {
      setVerifying(true);
      pushToast("Signing verification on Hedera...", "info");
      await verifyOnChainReport(Number(reportId));
      pushToast("Report successfully verified", "success");
      await load();
    } catch (err: any) {
      console.error(err);
      pushToast(err.message || "Failed to verify report", "error");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Lab History</h1>
        <p className="sub">
          Historical records stored in the remote lab_audit database. Select a row to view full telemetry.
        </p>
        <button
          className="secondary-btn"
          onClick={load}
          disabled={loading}
          style={{ marginTop: "1rem" }}
        >
          {loading ? "Syncing..." : "Refresh Records"}
        </button>
      </header>

      {error && <p className="error" style={{ marginBottom: "1rem" }}>{error}</p>}

      <div className="grid-two" style={{ gridTemplateColumns: selectedId ? "1fr 380px" : "1fr", transition: "all 0.3s" }}>
        <div className="card" style={{ padding: "1rem" }}>
          {toasts.length > 0 && (
            <div className="toast-list">
              {toasts.map((t) => (
                <div key={t.id} className={`toast ${t.type}`}>
                  {t.message}
                </div>
              ))}
            </div>
          )}
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Patient Name</th>
                  <th>Test</th>
                  <th>Result</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={selectedId === r.id ? "selected" : ""}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{r.report_id ?? "—"}</td>
                    <td style={{ fontWeight: 500, color: "var(--text-main)" }}>
                      {(user.role === "admin" || (user.role === "patient" && r.patient_evm === user.patient_evm)) 
                        ? (r.patient_name || "(Anonymous)") 
                        : "(Hidden for Privacy)"}
                    </td>
                    <td>{r.test_name ?? "—"}</td>
                    <td>{r.result_value ?? "—"}</td>
                    <td>
                      <span
                        className={
                          (r.verified_by || r.status === "VERIFIED")
                            ? "pill pill-success"
                            : "pill pill-neutral"
                        }
                        style={{ border: (r.verified_by || r.status === "VERIFIED") ? "1px solid #10b981" : "1px solid #64748b" }}
                      >
                        {(r.verified_by || r.status === "VERIFIED") ? "FULLY VERIFIED" : "AGENT SIGNED"}
                      </span>
                    </td>
                    <td className="small" style={{ color: "var(--text-sub)" }}>
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                      No records found. Run the agent workflow to add data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedId && (() => {
          const selected = rows.find(r => r.id === selectedId);
          if (!selected) return null;
          return (
            <div className="card" style={{ alignSelf: "start", position: "sticky", top: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h2 style={{ margin: 0 }}>Report {selected.report_id}</h2>
                <button
                  onClick={() => setSelectedId(null)}
                  style={{ background: "none", border: "none", color: "var(--text-sub)", cursor: "pointer", fontSize: "1.25rem", padding: "0 0.25rem" }}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>

              <dl style={{ display: "flex", flexDirection: "column", gap: "1rem", margin: 0 }}>
                {user.role === "admin" && (
                  <div>
                    <dt style={{ color: "var(--text-sub)", fontSize: "0.8rem", marginBottom: "0.2rem", fontWeight: 600, textTransform: "uppercase" }}>Off-Chain Name (Admin Only)</dt>
                    <dd style={{ margin: 0, fontWeight: 500, color: "var(--text-main)" }}>{selected.patient_name || "(Anonymous)"}</dd>
                  </div>
                )}
                <div>
                  <dt style={{ color: "var(--text-sub)", fontSize: "0.8rem", marginBottom: "0.2rem", fontWeight: 600, textTransform: "uppercase" }}>Diagnostic Summary</dt>
                  <dd style={{ 
                    margin: 0, 
                    background: "var(--nav-hover)", 
                    padding: "0.75rem", 
                    borderRadius: "8px", 
                    border: "1px solid var(--border-color)", 
                    fontSize: "0.95rem", 
                    lineHeight: 1.5,
                    wordBreak: "break-all",
                    color: "var(--text-main)"
                  }}>
                    {selected.ai_summary ?? "—"}
                  </dd>
                </div>
                {user.role === "admin" && (
                  <div>
                    <dt style={{ color: "var(--text-sub)", fontSize: "0.8rem", marginBottom: "0.2rem", fontWeight: 600, textTransform: "uppercase" }}>Patient EVM Address</dt>
                    <dd className="mono small" style={{ margin: 0, wordBreak: "break-all" }}>
                      {selected.patient_evm ?? "—"}
                    </dd>
                  </div>
                )}
                <div>
                  <dt style={{ color: "var(--text-sub)", fontSize: "0.8rem", marginBottom: "0.5rem", fontWeight: 600, textTransform: "uppercase" }}>Multi-Sig Validation</dt>
                  <dd style={{ margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="pill pill-success" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>SIGNER 1</span>
                      <span style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>Agent: Uzumaki-AI</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className={(selected.verified_by || selected.status === "VERIFIED") ? "pill pill-success" : "pill pill-neutral"} style={{ fontSize: "0.7rem", padding: "2px 8px" }}>SIGNER 2</span>
                      <span style={{ fontSize: "0.9rem", color: (selected.verified_by || selected.status === "VERIFIED") ? "var(--text-main)" : "var(--text-sub)" }}>
                        Medical Officer: {(selected.verified_by || selected.status === "VERIFIED") ? (selected.verified_by || "Verified") : "Pending Review..."}
                      </span>
                    </div>
                  </dd>
                </div>
                
                {/* Admin Verification Button */}
                {user.role === "admin" && selected.status !== "VERIFIED" && (
                  <div style={{ marginTop: "1rem" }}>
                    <button 
                      className="primary-btn" 
                      style={{ width: "100%", background: "var(--btn-primary)" }}
                      onClick={() => handleVerify(selected.report_id!)}
                      disabled={verifying}
                    >
                      {verifying ? "Executing Tx..." : "Verify & Sign on Ledger"}
                    </button>
                  </div>
                )}

                <div>
                  <dt style={{ color: "var(--text-sub)", fontSize: "0.8rem", marginBottom: "0.2rem", fontWeight: 600, textTransform: "uppercase" }}>Hedera Anchor Tx</dt>
                  <dd className="mono small" style={{ margin: 0, wordBreak: "break-all" }}>
                    {selected.tx_id ?? "—"}
                  </dd>
                </div>
                {selected.ipfs_cid && (
                  <div>
                    <dt style={{ color: "var(--text-sub)", fontSize: "0.8rem", marginBottom: "0.2rem", fontWeight: 600, textTransform: "uppercase" }}>IPFS Storage (CID)</dt>
                    <dd className="mono small" style={{ margin: 0, wordBreak: "break-all" }}>
                      <a 
                        href={`https://gateway.pinata.cloud/ipfs/${selected.ipfs_cid}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: "var(--blue-main)", textDecoration: "none" }}
                      >
                        {selected.ipfs_cid} ↗
                      </a>
                    </dd>
                  </div>
                )}
                {selected.tx_id && hederaTxUrl(selected.tx_id) && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <a
                      href={hederaTxUrl(selected.tx_id)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="secondary-btn"
                      style={{ display: "block", textAlign: "center", textDecoration: "none", fontSize: "0.8rem" }}
                    >
                      View on HashScan ↗
                    </a>
                  </div>
                )}
              </dl>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
