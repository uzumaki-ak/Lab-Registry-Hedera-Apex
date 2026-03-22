import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { AuditTrail } from "./components/AuditTrail";
import { ChatAgent } from "./components/ChatAgent";
import { Landing } from "./components/Landing";
import { AIDiagnostics } from "./components/AIDiagnostics";
import { Login, getStoredUser, clearStoredUser, type User } from "./components/Login";
import { VerifyQueue } from "./components/VerifyQueue";
import { Governance } from "./components/Governance";
import { Treasury } from "./components/Treasury";

type NavKey = "dashboard" | "ai-diagnostics" | "audit" | "chat" | "landing" | "verify-queue" | "governance" | "treasury";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [nav, setNav] = useState<NavKey>("landing");

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);
  }, []);

  const handleLogout = () => {
    clearStoredUser();
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  let content: React.ReactNode = null;
  const role = user.role;

  if (nav === "dashboard" && ['director', 'admin'].includes(role)) {
    content = <Dashboard />;
  } else if (nav === "ai-diagnostics" && ['technician', 'medical_officer', 'director', 'admin'].includes(role)) {
    content = <AIDiagnostics />;
  } else if (nav === "audit" && ['patient', 'medical_officer', 'director', 'admin'].includes(role)) {
    content = <AuditTrail user={user} />;
  } else if (nav === "verify-queue" && ['medical_officer', 'director', 'admin'].includes(role)) {
    content = <VerifyQueue />;
  } else if (nav === "governance" && ['director', 'admin'].includes(role)) {
    content = <Governance />;
  } else if (nav === "treasury" && ['director', 'admin'].includes(role)) {
    content = <Treasury />;
  } else if (nav === "chat") {
    content = <ChatAgent />;
  } else {
    content = <Landing />;
  }

  return (
    <Layout user={user} onLogout={handleLogout} current={nav} onChange={setNav}>
      {content}
    </Layout>
  );
};

ReactDOM.createRoot(document.getElementById("app") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
