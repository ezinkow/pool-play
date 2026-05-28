import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const NAVY = "#0a1628";
const RED = "#c8102e";
const GRAY = "#9ca3af";

export default function PoolGatekeeper({
    children,
    user,
    isAdmin,
    gameKey,
    ...props
}) {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [entryName, setEntryName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [hasEntry, setHasEntry] = useState(null);
    const [checking, setChecking] = useState(true);

    const [isPoolOpen, setIsPoolOpen] = useState(true);
    const [otherActivePools, setOtherActivePools] = useState([]);

    const [poolName, setPoolName] = useState("");
    const [poolEmoji, setPoolEmoji] = useState("🏆");

    // 🧠 SYSTEM PHASE STATE TRACKING: Added to pass context state downstream
    const [isLockedPhase, setIsLockedPhase] = useState(false);

    const isUserAdmin = user?.is_admin === 1 || user?.is_admin === true;

    useEffect(() => {
        if (isUserAdmin) {
            setChecking(false);
            return;
        }

        if (!gameKey) {
            console.error("❌ PoolGatekeeper Error: 'gameKey' prop is strictly required.");
            setChecking(false);
            return;
        }

        axios.get("/api/settings/active-states")
            .then(res => {
                const states = res.data || [];
                const currentPool = states.find(s => s.game_key === gameKey);

                if (currentPool) {
                    const dbActive = !!currentPool.is_active;

                    let isPastLockTime = false;
                    if (currentPool.lock_date) {
                        let lockDateStr = currentPool.lock_date;
                        if (typeof lockDateStr === 'string' && !lockDateStr.endsWith('Z') && !lockDateStr.includes('+')) {
                            lockDateStr = lockDateStr.replace(' ', 'T') + 'Z';
                        }

                        const lockTime = new Date(lockDateStr);
                        const currentTime = new Date();
                        isPastLockTime = currentTime >= lockTime;
                    }

                    // 🧠 SAVE THE STATE PHASE: Save the timeline calculation evaluation row
                    setIsLockedPhase(isPastLockTime);
                    setIsPoolOpen(dbActive && !isPastLockTime);

                    setPoolName(currentPool.title || currentPool.game_label || gameKey.toUpperCase());
                    setPoolEmoji(currentPool.emoji || "🏆");
                } else {
                    setPoolName(gameKey.toUpperCase());
                }

                const livePools = states.filter(s => s.is_active && s.game_key !== gameKey);
                const unexpiredPools = livePools.filter(s => {
                    if (!s.lock_date) return true;
                    let dStr = s.lock_date;
                    if (typeof dStr === 'string' && !dStr.endsWith('Z') && !dStr.includes('+')) dStr = dStr.replace(' ', 'T') + 'Z';
                    return new Date() < new Date(dStr);
                });
                setOtherActivePools(unexpiredPools);
            })
            .catch(err => console.error("Error pulling system active configs:", err));

        if (!user?.name) {
            setChecking(false);
            return;
        }

        axios.get(`/api/${gameKey}/entries/check/${user.name}`)
            .then(res => {
                setHasEntry(res.data.exists);
                setChecking(false);
            })
            .catch(err => {
                console.error(`Error checking entry status for ${gameKey}:`, err);
                setChecking(false);
            });
    }, [user, gameKey, isUserAdmin]);

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

        setLoading(true); // ✅ Fixed: Use the setter, not the boolean state variable
        setError("");
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                `/api/${gameKey}/entries/create`,
                { entry_name: entryName.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`You're in! Good luck with your picks ${poolEmoji}`);
            setShowModal(false);
            setHasEntry(true);
        } catch (err) {
            const msg = err.response?.data?.error || "Failed to join. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (isUserAdmin) {
        return <>{children}</>;
    }

    if (!user) {
        return (
            <div style={{ maxWidth: 480, margin: "20px auto", padding: 40, textAlign: "center", background: "#fdfdfd", borderRadius: 12, border: "1px solid #e5e7eb" }}>
                <span style={{ fontSize: 40 }}>{poolEmoji}</span>
                <h2 style={{ color: NAVY, marginTop: 10 }}>{poolName} Pool</h2>
                <p style={{ color: "#4b5563" }}>Please log in to participate.</p>
            </div>
        );
    }

    if (checking) {
        return <div style={{ color: "white", padding: 20, textAlign: "center" }}>Verifying registration status...</div>;
    }

    if (!hasEntry) {
        return (
            <div style={{ maxWidth: 600, margin: "40px auto", padding: "16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
                {!isPoolOpen ? (
                    <div style={{ background: "white", borderRadius: 16, padding: 40, textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", borderTop: `6px solid ${GRAY}` }}>
                        <span style={{ fontSize: 48 }}>🔒</span>
                        <h2 style={{ color: NAVY, marginTop: 16, marginBottom: 8, fontSize: 24, fontWeight: 800 }}>Registration Closed</h2>
                        <p style={{ color: "#6b7280", fontSize: 15, lineHeight: 1.6, maxWidth: 420, margin: "0 auto 32px auto" }}>
                            The {poolName} pool is no longer accepting entries for this season. Come back next time to secure your slot!
                        </p>
                        {otherActivePools.length > 0 && (
                            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 28, textAlign: "left" }}>
                                <h3 style={{ fontSize: 13, color: "#1e293b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16, textAlign: "center" }}>
                                    🔥 Check out these active pools instead:
                                </h3 >
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {otherActivePools.map(pool => (
                                        <div key={pool.game_key} onClick={() => navigate(pool.route)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, cursor: "pointer", transition: "all 0.15s ease" }} onMouseEnter={e => e.currentTarget.style.borderColor = pool.accent || RED} onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                <span style={{ fontSize: 24 }}>{pool.emoji}</span>
                                                <span style={{ fontWeight: 700, color: NAVY, fontSize: 15 }}>{pool.title}</span>
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: pool.accent || RED }}>Join Now →</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div style={{ maxWidth: 480, margin: "0 auto", padding: 40, textAlign: "center", background: "#fdfdfd", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
                            <span style={{ fontSize: 40 }}>{poolEmoji}</span>
                            <h2 style={{ color: NAVY, marginTop: 10 }}>{poolName} Pool</h2>
                            <p style={{ color: "#4b5563", marginBottom: 24 }}>
                                You're logged in as <strong>{user.name}</strong>, but haven't joined the pool yet. Create your entry to start making picks!
                            </p>
                            <button onClick={openModal} style={{ backgroundColor: "#16a34a", color: "white", padding: "14px 28px", borderRadius: 8, fontWeight: 700, border: "none", cursor: "pointer", fontSize: 16 }}>
                                ➕ Join {poolName} Pool
                            </button>
                        </div>
                        {showModal && (
                            <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                                <div onClick={e => e.stopPropagation()} style={{ position: "relative", background: "white", borderRadius: 16, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", borderTop: `4px solid ${RED}` }}>
                                    <button onClick={() => setShowModal(false)} style={{ position: "absolute", top: 12, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
                                    <h2 style={{ color: NAVY, marginTop: 0, marginBottom: 4, fontSize: 20 }}>Join the Pool</h2>
                                    <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>Choose your display name — this is how you'll appear in standings and group picks.</p>
                                    <form onSubmit={handleJoinPool}>
                                        <div style={{ marginBottom: 16 }}>
                                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Display name</label>
                                            <input type="text" value={entryName} onChange={e => { setEntryName(e.target.value); setError(""); }} placeholder="Your display name" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                                            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Defaults to your username — change it if you'd like.</p>
                                        </div>
                                        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>{error}</div>}
                                        <button type="submit" disabled={loading} style={{ width: "100%", padding: 14, backgroundColor: loading ? "#9ca3af" : "#16a34a", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: loading ? "default" : "pointer" }}>Join the pool</button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    }

    return (
        <div {...props}>
            {children}
        </div>
    );
}