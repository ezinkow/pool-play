import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // 🧠 Added routers to manage redirect tracks safely
import useAuth from "../hooks/useAuth"; // 🧠 Step-up verified inside src/ boundaries

const NAVY = "#0a1628";

export default function AuthModal({ show, onClose }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [loginName, setLoginName] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loginSubmitting, setLoginSubmitting] = useState(false);

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setLoginError("");
        setLoginSubmitting(true);

        const result = await login(loginName.trim(), loginPassword);
        setLoginSubmitting(false);
        if (result.success) {
            handleClose();
        } else {
            setLoginError(result.error);
        }
    };

    const handleClose = () => {
        setLoginName("");
        setLoginPassword("");
        setLoginError("");
        onClose();
    };

    const handleSignUpRedirect = () => {
        handleClose();
        // If they aren't already on the signup route page view layer, navigate them over
        if (location.pathname !== "/signup") {
            navigate("/signup");
        }
    };

    if (!show) return null;

    return (
        <div onClick={handleClose} style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ position: "relative", background: "white", borderRadius: 16, padding: 32, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "left" }}>
                <button onClick={handleClose} style={{ position: "absolute", top: 12, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>

                <h2 style={{ marginBottom: 4, color: "#0a1628", fontWeight: 800, fontSize: 20 }}>Log in</h2>
                <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>One account works across all games.</p>

                <form onSubmit={handleAuthSubmit}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Username</label>
                        <input type="text" value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Your username" required style={inputStyle} />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Password</label>
                        <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Password" required style={inputStyle} />
                    </div>

                    {loginError && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{loginError}</p>}

                    <button type="submit" disabled={loginSubmitting} style={{ width: "100%", padding: "12px", backgroundColor: loginSubmitting ? "#9ca3af" : "#0a1628", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: loginSubmitting ? "default" : "pointer", marginBottom: 16 }}>
                        {loginSubmitting ? "Processing…" : "Log in"}
                    </button>
                </form>

                {/* ✨ RESTORED FOOTER ACTION LINK ELEMENT ROW */}
                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14, textAlign: "center", fontSize: 13, color: "#4b5563" }}>
                    Don't have an account?{" "}
                    <button
                        onClick={handleSignUpRedirect}
                        style={{ background: "none", border: "none", color: NAVY, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "inherit", textDecoration: "underline" }}
                    >
                        Create one
                    </button>
                    <br />
                    <a
                        href="#/changepassword"
                        style={{ color: "#13447a", textDecoration: "none", fontWeight: 600 }}
                        onClick={() => onClose()} // Ensure the modal closes on click
                    >
                        Forgot Password?
                    </a>

                    <span style={{ margin: "0 8px", color: "#d1d5db" }}>|</span>

                    <a
                        href="#/comments"
                        style={{ color: "#13447a", textDecoration: "none", fontWeight: 600 }}
                        onClick={() => onClose()}
                    >
                        Forgot Username?
                    </a>
                </div>
            </div>
        </div>
    );
}

const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #d1d5db", fontSize: 15, outline: "none", boxSizing: "border-box"
};