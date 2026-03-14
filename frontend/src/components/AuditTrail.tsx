import React, { useEffect, useState } from "react";
import { fetchLabAudit, hederaTxUrl, type LabAuditRow } from "../api";

export const AuditTrail: React.FC = () => {
  const [rows, setRows] = useState<LabAuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLabAudit();
      setRows(data);
    } catch (err: any) {
      console.error(err);
      setError(String(err.message || err));
    } finally {
      setLoading(false);
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
                    style={{ 
                      cursor: "pointer", 
                      background: selectedId === r.id ? "#eff6ff" : "transparent"
                    }}
                  >
                    <td>{r.report_id ?? "—"}</td>
                    <td style={{ fontWeight: 500, color: "#0f172a" }}>{r.patient_name || "(Anonymous)"}</td>
                    <td>{r.test_name ?? "—"}</td>
                    <td>{r.result_value ?? "—"}</td>
                    <td>
                      <span
                        className={
                          (r.status ?? "").toLowerCase().includes("success") ||
                          r.status === "AUTHENTICATED"
                            ? "pill pill-success"
                            : r.status === "FAILED" ? "pill pill-error" : "pill pill-neutral"
                        }
                      >
                        {r.status ?? "—"}
                      </span>
                    </td>
                    <td className="small" style={{ color: "#64748b" }}>
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
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1.25rem", padding: "0 0.25rem" }}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>

              <dl style={{ display: "flex", flexDirection: "column", gap: "1rem", margin: 0 }}>
                <div>
                  <dt style={{ color: "#64748b", fontSize: "0.8rem", marginBottom: "0.2rem", fontWeight: 600, textTransform: "uppercase" }}>Off-Chain Name (Admin Only)</dt>
                  <dd style={{ margin: 0, fontWeight: 500, color: "#0f172a" }}>{selected.patient_name || "(Anonymous)"}</dd>
                </div>
                <div>
                  <dt style={{ color: "#64748b", fontSize: "0.8rem", marginBottom: "0.2rem", fontWeight: 600, textTransform: "uppercase" }}>Diagnostic Summary</dt>
                  <dd style={{ margin: 0, background: "#f8fafc", padding: "0.75rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.95rem", lineHeight: 1.5 }}>
                    {selected.ai_summary ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt style={{ color: "#64748b", fontSize: "0.8rem", marginBottom: "0.2rem", fontWeight: 600, textTransform: "uppercase" }}>Patient EVM Address</dt>
                  <dd className="mono small" style={{ margin: 0, wordBreak: "break-all" }}>
                    {selected.patient_evm ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt style={{ color: "#64748b", fontSize: "0.8rem", marginBottom: "0.2rem", fontWeight: 600, textTransform: "uppercase" }}>Hedera Anchor Tx</dt>
                  <dd className="mono small" style={{ margin: 0, wordBreak: "break-all" }}>
                    {selected.tx_id ?? "—"}
                  </dd>
                </div>
                {selected.tx_id && hederaTxUrl(selected.tx_id) && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <a
                      href={hederaTxUrl(selected.tx_id)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="primary-btn"
                      style={{ display: "block", textAlign: "center", textDecoration: "none" }}
                    >
                      Verify Ledger Anchor →
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
