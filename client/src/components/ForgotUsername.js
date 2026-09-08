import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

const GOLD = "#c89d3c";
const BLUE = "#0a1628";

export default function ForgotUsername() {
    const [email, setEmail] = useState("");
    const [retrievedUsername, setRetrievedUsername] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            toast.error("Please enter your email address.");
            return;
        }

        setLoading(true);
        setRetrievedUsername(null);

        try {
            const { data } = await axios.post("/api/auth/forgot-username", { email });
            if (data.success) {
                setRetrievedUsername(data.username);
                toast.success("Username found!");
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Account not found.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: "450px", margin: "80px auto", padding: "30px", background: "#fff", borderRadius: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" }}>
            <Toaster />
            <h2 style={{ color: BLUE, fontWeight: 900, fontSize: "24px", marginBottom: "8px", textAlign: "center" }}>Forgot Username</h2>
            <p style={{ color: "#666", fontSize: "14px", marginBottom: "24px", textAlign: "center" }}>
                Enter your email address below and we'll display your username.
            </p>

            {retrievedUsername ? (
                <div style={{ textAlign: "center" }}>
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "16px", borderRadius: "8px", marginBottom: "20px", fontSize: "15px" }}>
                        Your username is: <strong style={{ fontSize: "18px", display: "block", marginTop: "4px" }}>{retrievedUsername}</strong>
                    </div>
                    <Link to="/" style={{ color: BLUE, fontWeight: 700, textDecoration: "underline", fontSize: "14px" }}>Return to Home / Log In</Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" }}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "none", background: GOLD, color: BLUE, fontWeight: 800, fontSize: "14px", cursor: "pointer", marginBottom: "16px" }}
                    >
                        {loading ? "Searching..." : "Retrieve Username"}
                    </button>
                    <div style={{ textAlign: "center" }}>
                        <Link to="/" style={{ color: "#64748b", fontSize: "13px", textDecoration: "none" }}>← Back to Login</Link>
                    </div>
                </form>
            )}
        </div>
    );
}