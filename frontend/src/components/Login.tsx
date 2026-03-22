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
        const { data: preReg, error: preRegError } = await (supabase as any)
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
        const { data, error: rpcError } = await (supabase as any).rpc("auth_app_user", {
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
      if (role === 'patient') {
        const { data: preReg, error: preRegError } = await (supabase as any)
          .from('hospital_pre_reg').select('*')
          .eq('phone', phone).eq('default_pin', pin).single();

        if (preRegError || !preReg) {
          setError("❌ Invalid PIN. Check your Hospital Card.");
          setLoading(false);
          return;
        }
      } 
      else {
        const { data: staffAuth, error: staffError } = await (supabase as any)
          .from('authorized_staff_emails').select('*')
          .eq('email', email.trim()).eq('role', role).single();

        if (staffError || !staffAuth) {
          setError("❌ Unauthorized Email. Contact Admin.");
          setLoading(false);
          return;
        }
      }

      const { error: authError } = await (supabase as any).auth.signUp({
        email: email.trim() || `${phone}@hospital.com`,
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

      if (role === 'patient') {
        await (supabase as any).from('hospital_pre_reg').update({ is_activated: true }).eq('phone', phone);
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
    <div className="login-page">
      <div className="card login-card">
        <header className="login-header">
          <h1>Smart Lab Registry</h1>
          <p className="sub">Sign in to access your secure medical vault.</p>
        </header>

        {isSignup ? (
          <form onSubmit={handleSignUp}>
            <div className="input-group">
              <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <option value="patient">Register as Patient (Web2)</option>
                <option value="technician">Register as Staff (Technician)</option>
                <option value="medical_officer">Register as Staff (Officer)</option>
                <option value="director">Register as Staff (Director)</option>
              </select>
            </div>

            {role === "patient" ? (
              <div className="input-group" style={{ marginTop: '15px' }}>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px' }}
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', marginTop: '10px' }}
                />
                <input
                  type="password"
                  placeholder="Hospital PIN (6 digits)"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', marginTop: '10px' }}
                />
              </div>
            ) : (
              <div className="input-group" style={{ marginTop: '15px' }}>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px' }}
                />
                <input
                  type="email"
                  placeholder="Work Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', marginTop: '10px' }}
                />
              </div>
            )}

            <div className="input-group" style={{ position: 'relative', marginTop: '15px' }}>
              <span 
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  zIndex: 10,
                  opacity: 0.7,
                  userSelect: 'none'
                }}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Set Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '45px', width: '100%', paddingRight: '12px', paddingTop: '12px', paddingBottom: '12px' }}
              />
            </div>

            {error && <p className="error" style={{ margin: '15px 0', color: 'red', textAlign: 'center' }}>{error}</p>}
            
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '12px', marginTop: '15px' }}>
              {loading ? "Creating Account…" : "Register"}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => setIsSignup(false)} style={{ width: '100%', padding: '12px', marginTop: '12px' }}>
              Back to Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value as UserRole)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              >
                <option value="patient">Login as Patient (Web2)</option>
                <option value="technician">Login as Staff (Technician)</option>
                <option value="medical_officer">Login as Staff (Officer)</option>
                <option value="director">Login as Staff (Director)</option>
                <option value="admin">Login as Admin (Legacy)</option>
              </select>
            </div>

            <div className="input-group" style={{ marginTop: '15px' }}>
              <input
                type="text"
                placeholder={role === "patient" ? "Phone Number" : "Email"}
                value={role === "patient" ? phone : email}
                onChange={(e) => role === "patient" ? setPhone(e.target.value) : setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '12px' }}
              />
            </div>

            <div className="input-group" style={{ position: 'relative', marginTop: '15px' }}>
              <span 
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  zIndex: 10,
                  opacity: 0.7,
                  userSelect: 'none'
                }}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={role === "patient" ? "Hospital PIN" : "Password"}
                value={role === "patient" ? pin : password}
                onChange={(e) => role === "patient" ? setPin(e.target.value) : setPassword(e.target.value)}
                required
                style={{ paddingLeft: '45px', width: '100%', paddingRight: '12px', paddingTop: '12px', paddingBottom: '12px' }}
              />
            </div>

            {error && <p className="error" style={{ margin: '15px 0', color: 'red', textAlign: 'center' }}>{error}</p>}

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '12px', marginTop: '15px' }}>
              {loading ? "Authenticating..." : "Sign In"}
            </button>

            <button className="btn btn-outline" type="button" onClick={() => setIsSignup(true)} style={{ width: '100%', padding: '12px', marginTop: '12px' }}>
              Don't have an account? Sign Up
            </button>
          </form>
        )}
        
        {!isSignup && (
          <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: '#666', textAlign: 'center', background: '#f8f9fa', padding: '10px', borderRadius: '8px' }}>
            <p style={{ marginBottom: '5px' }}>🔑 <strong>Staff Pass:</strong> demo@lab.local / 123456</p>
            <p>📱 <strong>Patient A:</strong> 1234567890 / 123456</p>
          </div>
        )}
      </div>
    </div>
  );
};
