import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const NAVY = "#0a1628";
const RED  = "#c8102e";

export default function NbaGatekeeper({ user, children }) {
    const [showModal,  setShowModal]  = useState(false);
    const [entryName,  setEntryName]  = useState("");
    const [loading,    setLoading]    = useState(false);
    const [error,      setError]      = useState("");

    const openModal = () => {
        setEntryName(user?.name || "");
        setError("");
        setShowModal(true);
    };

    const handleJoinPool = async (e) => {
        e.preventDefault();
        if (!entryName.trim()) return setError("Please enter a display name.");
        if (!user?.id) {
            toast.error("User session not found. Please log in again.");
            return;
        }

        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                "/api/nba/entries/create",
                { entry_name: entryName.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("You're in! Good luck 🏀");
            setShowModal(false);
            setTimeout(() => window.location.reload(), 800);
        } catch (err) {
            const msg = err.response?.data?.error || "Failed to join. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Not logged in
    if (!user) {
        return (
            <div style={{
                maxWidth: 480, margin: "20px auto", padding: 40,
                textAlign: "center", background: "#fdfdfd",
                borderRadius: 12, border: "1px solid #e5e7eb",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            }}>
                <span style={{ fontSize: 40 }}>🏀</span>
                <h2 style={{ color: NAVY, marginTop: 10 }}>NBA Playoffs Pool</h2>
                <p style={{ color: "#4b5563", lineHeight: "1.6" }}>
                    Please log in to participate.
                </p>
            </div>
        );
    }

    // Logged in but no entry yet
    if (!user.hasNbaEntry) {
        return (
            <>
                <div style={{
                    maxWidth: 480, margin: "20px auto", padding: 40,
                    textAlign: "center", background: "#fdfdfd",
                    borderRadius: 12, border: "1px solid #e5e7eb",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                }}>
                    <span style={{ fontSize: 40 }}>🏀</span>
                    <h2 style={{ color: NAVY, marginTop: 10 }}>NBA Playoffs Pool</h2>
                    <p style={{ color: "#4b5563", marginBottom: 24, lineHeight: "1.6" }}>
                        You're logged in as <strong>{user.name}</strong>, but haven't
                        joined the pool yet. Create your entry to start making picks!
                    </p>
                    <button
                        onClick={openModal}
                        style={{
                            backgroundColor: "#16a34a", color: "white",
                            padding: "14px 28px", borderRadius: 8,
                            fontWeight: 700, border: "none",
                            cursor: "pointer", fontSize: 16,
                        }}
                    >
                        ➕ Join NBA Playoff Pool
                    </button>
                </div>

                {/* Join modal */}
                {showModal && (
                    <div
                        onClick={() => setShowModal(false)}
                        style={{
                            position: "fixed", inset: 0, zIndex: 9000,
                            background: "rgba(0,0,0,0.55)",
                            display: "flex", alignItems: "center",
                            justifyContent: "center", padding: 16,
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                position: "relative",
                                background: "white", borderRadius: 16,
                                padding: 32, width: "100%", maxWidth: 400,
                                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                                borderTop: `4px solid ${RED}`,
                            }}
                        >
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    position: "absolute", top: 12, right: 16,
                                    background: "none", border: "none",
                                    fontSize: 20, cursor: "pointer", color: "#9ca3af",
                                }}
                            >✕</button>

                            <h2 style={{ color: NAVY, marginTop: 0, marginBottom: 4, fontSize: 20 }}>
                                Join the Pool
                            </h2>
                            <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
                                Choose your display name — this is how you'll appear
                                in standings and group picks.
                            </p>

                            <form onSubmit={handleJoinPool}>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{
                                        display: "block", fontSize: 13,
                                        fontWeight: 600, color: "#374151", marginBottom: 6,
                                    }}>
                                        Display name
                                    </label>
                                    <input
                                        type="text"
                                        value={entryName}
                                        onChange={e => { setEntryName(e.target.value); setError(""); }}
                                        placeholder="Your display name"
                                        style={{
                                            width: "100%", padding: "10px 12px",
                                            borderRadius: 8, border: "1px solid #d1d5db",
                                            fontSize: 15, outline: "none",
                                            boxSizing: "border-box", fontFamily: "inherit",
                                        }}
                                    />
                                    <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                                        Defaults to your username — change it if you'd like.
                                    </p>
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
                                    disabled={loading}
                                    style={{
                                        width: "100%", padding: 14,
                                        backgroundColor: loading ? "#9ca3af" : "#16a34a",
                                        color: "white", border: "none", borderRadius: 8,
                                        fontWeight: 700, fontSize: 15,
                                        cursor: loading ? "default" : "pointer",
                                    }}
                                >
                                    {loading ? "Joining…" : "Join the pool"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Has entry — render the page
    return <>{children}</>;
}