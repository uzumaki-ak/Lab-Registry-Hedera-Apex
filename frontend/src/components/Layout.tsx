import React, { useState, useEffect } from "react";
import type { User } from "./Login";

type NavKey = "dashboard" | "ai-diagnostics" | "audit" | "chat" | "landing" | "verify-queue" | "governance" | "treasury";

interface LayoutProps {
  user: User;
  onLogout: () => void;
  current: NavKey;
  onChange: (key: NavKey) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  user,
  onLogout,
  current,
  onChange,
  children,
}) => {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  const role = user.role;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-dot" />
          <span className="logo-text">Smart Lab Registry</span>
        </div>
        <nav className="sidebar-nav">
          <button
            className={current === "landing" ? "nav-btn active" : "nav-btn"}
            onClick={() => onChange("landing")}
          >
            About System
          </button>
          
          {/* 1. TECHNICIAN, OFFICER, & DIRECTOR: Entry Portal */}
          {['technician', 'medical_officer', 'director', 'admin'].includes(role) && (
            <button
              className={current === "ai-diagnostics" ? "nav-btn active" : "nav-btn"}
              onClick={() => onChange("ai-diagnostics")}
            >
              AI Diagnostics
            </button>
          )}

          {/* 2. PATIENT, OFFICER, & DIRECTOR: History Access */}
          {['patient', 'medical_officer', 'director', 'admin'].includes(role) && (
            <button
              className={current === "audit" ? "nav-btn active" : "nav-btn"}
              onClick={() => onChange("audit")}
            >
              History Report
            </button>
          )}

          {/* 3. MEDICAL OFFICER ONLY: Verification Queue */}
          {['medical_officer', 'director', 'admin'].includes(role) && (
            <button
              className={current === "verify-queue" ? "nav-btn active" : "nav-btn"}
              onClick={() => onChange("verify-queue")}
            >
              Verification Desk
            </button>
          )}

          {/* 4. PATIENT & DIRECTOR: Stats */}
          {['patient', 'director', 'admin'].includes(role) && (
            <button
              className={current === "dashboard" ? "nav-btn active" : "nav-btn"}
              onClick={() => onChange("dashboard")}
            >
              Health Dashboard
            </button>
          )}

          {/* 5. DIRECTOR ONLY: Governance & Treasury */}
          {['director', 'admin'].includes(role) && (
            <>
              <button
                className={current === "governance" ? "nav-btn active" : "nav-btn"}
                onClick={() => onChange("governance")}
              >
                Clinical Governance
              </button>
              <button
                className={current === "treasury" ? "nav-btn active" : "nav-btn"}
                onClick={() => onChange("treasury")}
              >
                Hospital Treasury
              </button>
            </>
          )}

          <button
            className={current === "chat" ? "nav-btn active" : "nav-btn"}
            onClick={() => onChange("chat")}
          >
            Agent Chat (AI)
          </button>
        </nav>
        <footer className="sidebar-footer">
          <button className="nav-btn theme-toggle-btn" onClick={toggleTheme}>
            {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </button>
          
          <span className="small" style={{ display: "block", marginBottom: "0.5rem" }}>
            {user.email} · {user.role}
          </span>
          <button
            className="nav-btn"
            onClick={onLogout}
            style={{ width: "100%", textAlign: "left", marginTop: "0.25rem" }}
          >
            Sign out
          </button>
          <small style={{ display: "block", marginTop: "0.75rem" }}>
            Hedera Apex 2026 · Contract {import.meta.env.VITE_LAB_REGISTRY_CONTRACT_ID || "0.0.8321102"}
          </small>
        </footer>
      </aside>
      <main className="main-panel">{children}</main>
    </div>
  );
};
