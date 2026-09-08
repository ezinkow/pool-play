import React, { useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

export default function ChangePassword() {
  const [identifier, setIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);

  const inputStyle = {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
  };

  const handleSubmit = async () => {
    if (!identifier || !newPassword || !confirmPassword)
      return toast.error("All fields required");
    if (newPassword !== confirmPassword)
      return toast.error("Passwords don't match");

    try {
      const apiUrl = window.location.hostname === "localhost" 
        ? "http://localhost:3001/api/auth/changepassword" 
        : "/api/auth/changepassword";

      // Passing identifier (can be username or email depending on backend setup)
      const res = await axios.post(apiUrl, { email: identifier, newPassword });
      
      if (res.data.success) {
        setDone(true);
        toast.success("Password updated!");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Something went wrong");
    }
  };

  return (
    <div style={{ paddingTop: 68, paddingBottom: 80 }}>
      <Toaster />
      <div style={{
        maxWidth: 420, margin: "40px auto", background: "white",
        borderRadius: 16, padding: "32px 28px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      }}>
        <h2 style={{ color: "#13447a", marginBottom: 6, textAlign: "center" }}>
          🔑 Change Password
        </h2>
        <p style={{ color: "#6b7280", fontSize: 13, textAlign: "center", marginBottom: 24 }}>
          Enter your username <strong>OR</strong> email address to update your password
        </p>

        {done ? (
          <div style={{ textAlign: "center", color: "#16a34a", fontWeight: 600, fontSize: 15 }}>
            ✅ Password updated successfully!
            <button 
              onClick={() => window.location.hash = "#/login"}
              style={{ display: "block", margin: "20px auto 0", color: "#13447a", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>
                Username <strong>OR</strong> Email Address
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="Enter username OR email"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password"
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={inputStyle}
              />
            </div>
            <button
              onClick={handleSubmit}
              style={{
                marginTop: 8, padding: "12px 0", borderRadius: 8,
                backgroundColor: "#13447a", color: "white",
                border: "none", fontWeight: 700, fontSize: 14,
                cursor: "pointer", width: "100%",
              }}
            >
              Update Password
            </button>
          </div>
        )}
      </div>
    </div>
  );
}