import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import useAuth from "../../hooks/useAuth";

const NAVY = "#13447a";
const GOLD = "#c89d3c";
const SOFT_BG = "#f4f7f9";

export default function WorldCupSignUp() {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    const [entryName, setEntryName] = useState("");
    const [alreadyIn, setAlreadyIn] = useState(false);
    const [checking, setChecking] = useState(true);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Redirect to home if session isn't found
    useEffect(() => {
        if (!loading && !user) navigate("/worldcup");
    }, [user, loading, navigate]);

    // Pre-fill display name from profile registry and check if registered
    useEffect(() => {
        if (!user) return;
        setEntryName(user.name);

        async function checkEntry() {
            try {
                const token = localStorage.getItem("token");
                const { data } = await axios.get("/api/worldcup/entries/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (data.entry) setAlreadyIn(true);
            } catch {
                // No active tournament profile found yet
            } finally {
                setChecking(false);
            }
        }
        checkEntry();
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!entryName.trim()) return setError("Please enter a display name for your profile.");

        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const { data } = await axios.post(
                "/api/worldcup/entries",
                { entry_name: entryName.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.success) {
                setSuccess(true);
            } else {
                setError(data.error || "Profile initialization failed.");
            }
        } catch (err) {
            setError(err.response?.data?.error || "Profile initialization failed — please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || checking) {
        return (
            <div  style={{ textAlign: "center", paddingTop: 80, color: "#6b7280" }}>
                Verifying entry criteria…
            </div>
        );
    }

    return (
        <div  style={{ maxWidth: "800px", margin: "0 auto", paddingLeft: "8px", paddingRight: "8px" }}>
            <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 16px" }}>

                {/* Tournament Identity Header */}
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>⚽</div>
                    <h1 style={{
                        color: NAVY, fontSize: 26, fontWeight: 900,
                        textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
                    }}>
                        World Cup 2026 Pool
                    </h1>
                    <p style={{ color: "#6b7280", fontSize: 14 }}>
                        Predict match outcomes, dominate group stages, and fill out your knockout bracket.
                    </p>
                </div>

                <div style={{
                    background: "white", borderRadius: 16, padding: 32,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                    borderTop: `5px solid ${NAVY}`,
                }}>
                    {/* Already registered check redirect link */}
                    {alreadyIn && (
                        <div>
                            <div style={{
                                background: "#f0fdf4", border: "1px solid #bbf7d0",
                                borderRadius: 8, padding: "14px 16px",
                                color: "#166534", fontSize: 14, marginBottom: 24,
                            }}>
                                ✓ You're already registered! Head to the dashboard to make choices.
                            </div>
                            <button
                                onClick={() => navigate("/worldcup/picks")}
                                style={{
                                    width: "100%", padding: 14,
                                    backgroundColor: NAVY, color: "white",
                                    border: "none", borderRadius: 8,
                                    fontWeight: 700, fontSize: 15, cursor: "pointer",
                                }}
                            >
                                Go to Picks →
                            </button>
                        </div>
                    )}

                    {/* Registration Success Form Redirect */}
                    {!alreadyIn && success && (
                        <div>
                            <div style={{
                                background: "#f0fdf4", border: "1px solid #bbf7d0",
                                borderRadius: 8, padding: "14px 16px",
                                color: "#166534", fontSize: 14, marginBottom: 24,
                            }}>
                                🎉 Entry generated! Welcome to the pool, <strong>{entryName}</strong>.
                            </div>
                            <button
                                onClick={() => navigate("/worldcup/picks")}
                                style={{
                                    width: "100%", padding: 14,
                                    backgroundColor: NAVY, color: "white",
                                    border: "none", borderRadius: 8,
                                    fontWeight: 700, fontSize: 15, cursor: "pointer",
                                }}
                            >
                                Make Your Picks →
                            </button>
                        </div>
                    )}

                    {/* Main Profiling Setup Form */}
                    {!alreadyIn && !success && (
                        <form onSubmit={handleSubmit}>
                            <p style={{ fontSize: 14, color: "#374151", marginBottom: 20 }}>
                                Registering profile under account <strong>{user?.name}</strong>. Customize your display name for public dashboards below.
                            </p>

                            <div style={{ marginBottom: 20 }}>
                                <label style={{
                                    display: "block", fontSize: 13, fontWeight: 600,
                                    color: "#374151", marginBottom: 5,
                                }}>
                                    Leaderboard Display Name
                                    <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: 6 }}>
                                        — visible in matrices and standings
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={entryName}
                                    onChange={e => { setEntryName(e.target.value); setError(""); }}
                                    placeholder="Display name"
                                    style={{
                                        width: "100%", padding: "10px 12px", borderRadius: 8,
                                        border: "1px solid #d1d5db", fontSize: 15,
                                        outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                                    }}
                                />
                            </div>

                            {/* Updated Custom Scoring Explainer Module */}
                            <div style={{
                                background: "#f8fafc", borderRadius: 8, padding: "14px 16px",
                                marginBottom: 20, fontSize: 13, color: "#374151",
                                borderLeft: `3px solid ${GOLD}`,
                            }}>
                                <strong style={{ display: "block", marginBottom: 6 }}>Tournament Rules</strong>
                                Pick match paths during the group stage. Correct winners give <strong>1pt</strong>, while accurately predicting a Draw awards a <strong>2pt</strong> bonus. Follow up with a comprehensive path bracket for scaling points (up to 10pts in the Final).
                            </div>

                            {error && (
                                <div style={{
                                    background: "#fef2f2", border: "1px solid #fecaca",
                                    borderRadius: 8, padding: "10px 14px",
                                    color: "#dc2626", fontSize: 13, marginBottom: 16,
                                }}>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    width: "100%", padding: 14,
                                    backgroundColor: submitting ? "#9ca3af" : NAVY,
                                    color: "white", border: "none", borderRadius: 8,
                                    fontWeight: 700, fontSize: 15,
                                    cursor: submitting ? "default" : "pointer",
                                }}
                            >
                                {submitting ? "Processing Entry…" : "Enter World Cup Pool"}
                            </button>
                        </form>
                    )}
                </div>

                <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#6b7280" }}>
                    <Link to="/worldcup" style={{ color: NAVY, fontWeight: 600 }}>← Back to World Cup Home</Link>
                </p>
            </div>
        </div>
    );
}