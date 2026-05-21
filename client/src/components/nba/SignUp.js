import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import useAuth from "../../hooks/useAuth";

const NAVY = "#0a1628";
const RED  = "#c8102e";
const GOLD = "#c89d3c";

export default function NbaSignUp() {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    const [entryName,    setEntryName]    = useState("");
    const [alreadyIn,    setAlreadyIn]    = useState(false);
    const [checking,     setChecking]     = useState(true);
    const [error,        setError]        = useState("");
    const [submitting,   setSubmitting]   = useState(false);
    const [success,      setSuccess]      = useState(false);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !user) navigate("/nba");
    }, [user, loading, navigate]);

    // Pre-fill entry name from username and check if already entered
    useEffect(() => {
        if (!user) return;
        setEntryName(user.name);

        async function checkEntry() {
            try {
                const token = localStorage.getItem("token");
                const { data } = await axios.get("/api/nba/entries/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (data.entry) setAlreadyIn(true);
            } catch {
                // No entry yet — that's fine
            } finally {
                setChecking(false);
            }
        }
        checkEntry();
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!entryName.trim()) return setError("Please enter a display name for your entry.");

        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const { data } = await axios.post(
                "/api/nba/entries",
                { entry_name: entryName.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.success) {
                setSuccess(true);
            } else {
                setError(data.error || "Sign-up failed.");
            }
        } catch (err) {
            setError(err.response?.data?.error || "Sign-up failed — please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || checking) {
        return (
            <div className="page-content" style={{ textAlign: "center", paddingTop: 80, color: "#6b7280" }}>
                Loading…
            </div>
        );
    }

    return (
        <div className="page-content" style={{ background: "#f4f7f9", minHeight: "100vh" }}>
            <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 16px" }}>

                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🏀</div>
                    <h1 style={{
                        color: NAVY, fontSize: 26, fontWeight: 900,
                        textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
                    }}>
                        NBA Playoffs Pool
                    </h1>
                    <p style={{ color: "#6b7280", fontSize: 14 }}>
                        Pick every series, assign confidence points, guess the length for a 2× bonus.
                    </p>
                </div>

                <div style={{
                    background: "white", borderRadius: 16, padding: 32,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                    borderTop: `5px solid ${RED}`,
                }}>
                    {/* Already entered */}
                    {alreadyIn && (
                        <div>
                            <div style={{
                                background: "#f0fdf4", border: "1px solid #bbf7d0",
                                borderRadius: 8, padding: "14px 16px",
                                color: "#166534", fontSize: 14, marginBottom: 24,
                            }}>
                                ✓ You're already in the pool! Head to Picks to make your selections.
                            </div>
                            <button
                                onClick={() => navigate("/nba/picks")}
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

                    {/* Success state */}
                    {!alreadyIn && success && (
                        <div>
                            <div style={{
                                background: "#f0fdf4", border: "1px solid #bbf7d0",
                                borderRadius: 8, padding: "14px 16px",
                                color: "#166534", fontSize: 14, marginBottom: 24,
                            }}>
                                🎉 You're in! Welcome to the pool, <strong>{entryName}</strong>.
                            </div>
                            <button
                                onClick={() => navigate("/nba/picks")}
                                style={{
                                    width: "100%", padding: 14,
                                    backgroundColor: NAVY, color: "white",
                                    border: "none", borderRadius: 8,
                                    fontWeight: 700, fontSize: 15, cursor: "pointer",
                                }}
                            >
                                Make your picks →
                            </button>
                        </div>
                    )}

                    {/* Sign-up form */}
                    {!alreadyIn && !success && (
                        <form onSubmit={handleSubmit}>
                            <p style={{ fontSize: 14, color: "#374151", marginBottom: 20 }}>
                                Signing up as <strong>{user?.name}</strong>. You can set a different
                                display name for the leaderboard below.
                            </p>

                            <div style={{ marginBottom: 20 }}>
                                <label style={{
                                    display: "block", fontSize: 13, fontWeight: 600,
                                    color: "#374151", marginBottom: 5,
                                }}>
                                    Entry display name
                                    <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: 6 }}>
                                        — shown in standings and group picks
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

                            {/* How it works */}
                            <div style={{
                                background: "#f8fafc", borderRadius: 8, padding: "14px 16px",
                                marginBottom: 20, fontSize: 13, color: "#374151",
                                borderLeft: `3px solid ${GOLD}`,
                            }}>
                                <strong style={{ display: "block", marginBottom: 6 }}>How it works</strong>
                                Pick the winner of each series and assign confidence points.
                                Guess the series length correctly and your points double.
                                Best total at the end of the playoffs wins.
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
                                    backgroundColor: submitting ? "#9ca3af" : RED,
                                    color: "white", border: "none", borderRadius: 8,
                                    fontWeight: 700, fontSize: 15,
                                    cursor: submitting ? "default" : "pointer",
                                }}
                            >
                                {submitting ? "Joining…" : "Join the pool"}
                            </button>
                        </form>
                    )}
                </div>

                <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#6b7280" }}>
                    <Link to="/nba" style={{ color: NAVY, fontWeight: 600 }}>← Back to NBA home</Link>
                </p>
            </div>
        </div>
    );
}