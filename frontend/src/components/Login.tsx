import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export type UserRole = "patient" | "technician" | "medical_officer" | "director" | "admin";

export interface User {
  email: string;
  role: UserRole;
  full_name?: string;
  patient_evm?: string;
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (role === "patient") {
        // Patient PIN Login
        const { data: preReg, error: preRegError } = await supabase!
          .from("hospital_pre_reg")
          .select("*")
          .eq("phone", phone)
          .eq("default_pin", pin)
          .single();

        if (preRegError || !preReg) {
          setError("Invalid Phone Number or PIN");
          setLoading(false);
          return;
        }

        const user: User = {
          email: `${phone}@hospital.com`, // Virtual email for patient session
          role: "patient",
          full_name: preReg.patient_name || "Patient",
          patient_evm: preReg.patient_evm || undefined,
        };
        setStoredUser(user);
        onLogin(user);
      } else {
        // Staff/Admin Email Login
        const { data, error: rpcError } = await supabase!.rpc("auth_app_user", {
          p_email: email.trim(),
          p_password: password,
        });

        if (rpcError) {
          setError(rpcError.message || "Sign in failed");
          setLoading(false);
          return;
        }

        const row = Array.isArray(data) ? data[0] : data;
        if (!row || !row.email) {
          setError("Invalid email or password");
          setLoading(false);
          return;
        }

        const user: User = {
          email: row.email,
          role: row.role as UserRole,
        };
        setStoredUser(user);
        onLogin(user);
      }
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const [isSignup, setIsSignup] = useState(false);
  const [role, setRole] = useState<UserRole>("patient");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [fullName, setFullName] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // --- STEP 1: THE GATEKEEPER CHECK ---
      if (role === 'patient') {
        const { data: preReg, error: preRegError } = await supabase!
          .from('hospital_pre_reg').select('*')
          .eq('phone', phone).eq('default_pin', pin).single();

        if (preRegError || !preReg) {
          setError("❌ Invalid PIN. Check your Hospital Card.");
          setLoading(false);
          return;
        }
      } 
      else {
        // Staff validation requires an authorized_staff_emails table
        const { data: staffAuth, error: staffError } = await supabase!
          .from('authorized_staff_emails').select('*')
          .eq('email', email.trim()).eq('role', role).single();

        if (staffError || !staffAuth) {
          setError("❌ Unauthorized Email. Contact Admin.");
          setLoading(false);
          return;
        }
      }

      // --- STEP 2: ACCOUNT CREATION ---
      const { error: authError } = await supabase!.auth.signUp({
        email: email.trim() || `${phone}@hospital.com`, // Email for staff, fake email for phone patients
        password: password,
        options: {
          data: { role: role, full_name: fullName }
        }
      });

      if (authError) {
        setError(`❌ Signup Failed: ${authError.message}`);
        setLoading(false);
        return;
      }

      // --- STEP 3: ACTIVATE PATIENT ---
      if (role === 'patient') {
        await supabase!.from('hospital_pre_reg').update({ is_activated: true }).eq('phone', phone);
      }

      alert("🎉 Account Created! You can now Sign In.");
      setIsSignup(false);
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Smart Lab Registry</h1>
        <p className="sub">{isSignup ? "Create your account" : "Sign in to access the dashboard"}</p>
        
        {isSignup ? (
          <form onSubmit={handleSignUp}>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} style={{ marginBottom: '1rem' }}>
              <option value="patient">Patient</option>
              <option value="technician">Technician</option>
              <option value="medical_officer">Medical Officer</option>
              <option value="director">Director</option>
            </select>

            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            {role === 'patient' ? (
              <>
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Hospital PIN (6 digits)"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                />
              </>
            ) : (
              <input
                type="email"
                placeholder="Work Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}

            <input
              type="password"
              placeholder="Set Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="error" style={{ marginBottom: "0.75rem" }}>{error}</p>}
            
            <button type="submit" disabled={loading}>
              {loading ? "Creating Account…" : "Register"}
            </button>
            <button type="button" className="text-btn" onClick={() => setIsSignup(false)} style={{ marginTop: '1rem' }}>
              Back to Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value as UserRole)} 
              style={{ marginBottom: '1rem', width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
            >
              <option value="patient">Login as Patient</option>
              <option value="technician">Login as Staff (Technician)</option>
              <option value="medical_officer">Login as Staff (Officer)</option>
              <option value="director">Login as Staff (Director)</option>
              <option value="admin">Login as Admin (Legacy)</option>
            </select>

            {role === 'patient' ? (
              <>
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Hospital PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                />
              </>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div style={{ position: 'relative' }}>
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      position: 'absolute', 
                      left: '10px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      zIndex: 10
                    }}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </>
            )}

            {error && (
              <p className="error" style={{ marginBottom: "0.75rem" }}>
                {error}
              </p>
            )}
            
            <button type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <button type="button" className="text-btn" onClick={() => setIsSignup(true)} style={{ marginTop: '1rem' }}>
              Don't have an account? Sign Up
            </button>
          </form>
        )}
        
        {!isSignup && (
          <p className="sub" style={{ marginTop: "1rem", fontSize: "0.75rem" }}>
            Demo: demo@lab.local / Demo123! &nbsp;|&nbsp; user@lab.local / User123!
          </p>
        )}
      </div>
    </div>
  );
};
