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

type NavKey = "dashboard" | "ai-diagnostics" | "audit" | "chat" | "landing";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [nav, setNav] = useState<NavKey>("dashboard");

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
  if (nav === "dashboard") content = <Dashboard />;
  else if (nav === "ai-diagnostics") content = <AIDiagnostics />;
  else if (nav === "audit") content = <AuditTrail />;
  else if (nav === "chat") content = <ChatAgent />;
  else content = <Landing />;

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
