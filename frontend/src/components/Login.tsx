import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export type UserRole = "admin" | "user";

export interface User {
  email: string;
  role: UserRole;
}

const AUTH_KEY = "lab-registry-auth";

export const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as User;
    if (!u.email || !u.role) return null;
    return u;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User) => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
};

export const clearStoredUser = () => {
  localStorage.removeItem(AUTH_KEY);
};

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Enter your email");
      return;
    }
    if (!password) {
      setError("Enter your password");
      return;
    }
    if (!supabase) {
      setError("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("auth_app_user", {
        p_email: email.trim(),
        p_password: password,
      });
      if (rpcError) {
        setError(rpcError.message || "Sign in failed");
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || !row.email) {
        setError("Invalid email or password");
        return;
      }
      const user: User = {
        email: row.email,
        role: (row.role === "admin" ? "admin" : "user") as UserRole,
      };
      setStoredUser(user);
      onLogin(user);
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Smart Lab Registry</h1>
        <p className="sub">Sign in to access the dashboard</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="error" style={{ marginBottom: "0.75rem" }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="sub" style={{ marginTop: "1rem", fontSize: "0.75rem" }}>
          Demo: demo@lab.local / Demo123! &nbsp;|&nbsp; user@lab.local / User123!
        </p>
      </div>
    </div>
  );
};
