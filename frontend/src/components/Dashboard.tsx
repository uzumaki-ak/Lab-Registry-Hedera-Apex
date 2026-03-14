import React, { useState, useEffect } from "react";
import { fetchLabAudit, hederaTxUrl, type LabAuditRow } from "../api";

export const Dashboard: React.FC = () => {
  const [recentReports, setRecentReports] = useState<LabAuditRow[]>([]);

  const refreshRecent = () => {
    fetchLabAudit().then(setRecentReports).catch(() => {});
  };
  useEffect(() => {
    refreshRecent();
  }, []);

  const totalReports = recentReports.length;
  const uniqueTests = new Set(recentReports.map(r => r.test_name)).size;
  const successRate = totalReports > 0 
    ? Math.round((recentReports.filter(r => (r.status || "").toLowerCase().includes("success") || r.status === "AUTHENTICATED").length / totalReports) * 100) 
    : 0;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Dashboard Overview</h1>
        <p className="sub">
          High-level statistics and recent activity across the decentralized lab network.
        </p>
      </header>

      <div className="grid-three" style={{ marginBottom: "2rem" }}>
        <div className="stat-card">
          <span className="stat-label">Total Anchored Reports</span>
          <span className="stat-value">{totalReports}</span>
          <span className="stat-sub">Across all connected agents</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Unique Diagnostic Tests</span>
          <span className="stat-value">{uniqueTests}</span>
          <span className="stat-sub">Tracked on-chain parameters</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Consensus Success Rate</span>
          <span className="stat-value">{successRate}%</span>
          <span className="stat-sub">Valid HTS-gated transactions</span>
        </div>
      </div>

      <div className="grid-two">
        <section className="card">
          <h2>Test Distribution</h2>
          {recentReports.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
              {(() => {
                const counts = recentReports.reduce<Record<string, number>>((acc, r) => {
                  const t = r.test_name || "Unknown";
                  acc[t] = (acc[t] || 0) + 1;
                  return acc;
                }, {});
                const max = Math.max(...Object.values(counts), 1);
                return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([name, n]) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ minWidth: 100, fontSize: "0.9rem", color: "#475569", fontWeight: 500 }}>{name}</span>
                    <div
                      style={{
                        flex: 1,
                        height: 24,
                        background: "#f1f5f9",
                        borderRadius: 6,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${(n / max) * 100}%`,
                          height: "100%",
                          background: "#2563eb",
                          borderRadius: 6,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "0.9rem", color: "#0f172a", fontWeight: 600, minWidth: 30, textAlign: "right" }}>{n}</span>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <p className="sub" style={{ marginTop: "1rem" }}>No data available yet.</p>
          )}
        </section>

        <section className="card">
          <h2>Recent Activity</h2>
          <table className="table" style={{ fontSize: "0.85rem" }}>
            <thead>
              <tr>
                <th>Test</th>
                <th>Result</th>
                <th>Status</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.slice(0, 5).map((r) => (
                <tr key={r.id}>
                  <td>{r.test_name ?? "—"}</td>
                  <td>{r.result_value ?? "—"}</td>
                  <td>
                    <span
                      className={
                        (r.status ?? "").toLowerCase().includes("success") || r.status === "AUTHENTICATED"
                          ? "pill pill-success"
                          : "pill pill-error"
                      }
                    >
                      {r.status ?? "—"}
                    </span>
                  </td>
                  <td>
                    {r.tx_id && hederaTxUrl(r.tx_id) ? (
                      <a href={hederaTxUrl(r.tx_id)!} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "none" }}>
                        View
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {recentReports.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "#64748b" }}>No recent activity.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};
