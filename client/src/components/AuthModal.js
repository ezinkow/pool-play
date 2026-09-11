import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import toast, { Toaster } from "react-hot-toast";

export default function AuthModal({ show, onClose }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!show) return null;

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    const result = await login(identifier, password);
    if (result.success) {
      toast.success("Welcome back!");
      onClose();
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } else {
      toast.error(result.error || "Login failed");
      setLoading(false);
    }
  };

  const overlayStyle = {
    position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000, padding: 16
  };

  const modalStyle = {
    width: "100%", maxWidth: 400, background: "white", borderRadius: 16,
    padding: 32, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", position: "relative", textAlign: "center"
  };

  const inputStyle = {
    width: "100%", padding: "12px", margin: "8px 0",
    borderRadius: 8, border: "1px solid #d1d5db", boxSizing: "border-box"
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <Toaster />
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={onClose} 
          style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}
        >
          ✕
        </button>

        <h2 style={{ color: "#13447a", marginBottom: 8 }}>Welcome Back</h2>
        <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 14 }}>Log in with your username or email!</p>
        
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username or Email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "12px", marginTop: 16,
              borderRadius: 8, border: "none", fontWeight: 700,
              backgroundColor: "#13447a", color: "white",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div style={{ marginTop: 20, fontSize: 13, display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
          <a href="#/changepassword" onClick={onClose} style={{ color: "#13447a", textDecoration: "none" }}>Forgot Password?</a>
          <span style={{ color: "#d1d5db" }}>|</span>
          <a href="#/forgotusername" onClick={onClose} style={{ color: "#13447a", textDecoration: "none" }}>Forgot Username?</a>
          <span style={{ color: "#d1d5db" }}>|</span>
          <a href="#/signup" onClick={onClose} style={{ color: "#13447a", textDecoration: "none" }}>Create Account</a>
        </div>
      </div>
    </div>
  );
}