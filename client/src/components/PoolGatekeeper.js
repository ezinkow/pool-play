import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
    const [checking, setChecking] = useState(true);
    const [hasAnyEntry, setHasAnyEntry] = useState(false);

    const [isPoolOpen, setIsPoolOpen] = useState(true);
    const [otherActivePools, setOtherActivePools] = useState([]);

    const [poolName, setPoolName] = useState("");
    const [poolEmoji, setPoolEmoji] = useState("🏆");

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

        // Fetch active settings and check if league/pool has started via games schedule
        Promise.all([
            axios.get("/api/settings/active-states"),
            axios.get(`/api/settings/pool-started?game_key=${gameKey}`).catch(() => ({ data: { started: false } }))
        ])
            .then(([statesRes, startedRes]) => {
                const states = statesRes.data || [];
                const currentPool = states.find(s => s.game_key === gameKey);
                const leagueStarted = startedRes.data?.started || false;

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

                    // Pool is closed if disabled, past lock time, OR if the actual league games have started
                    setIsPoolOpen(dbActive && !isPastLockTime && !leagueStarted);
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

        if (!user?.id) {
            setChecking(false);
            return;
        }

        // Strict user_id validation via secure endpoint lookup
        const token = localStorage.getItem("token");
        // Adapt endpoint based on your gameKey or general entries route
        const entriesUrl = gameKey === "nfl_survivor" ? "/api/nfl_survivor/roster" : "/api/nfl_bts/entries/me";

        axios.get(entriesUrl, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                let userHasEntry = false;
                if (gameKey === "nfl_survivor") {
                    userHasEntry = (res.data || []).some(entry => Number(entry.user_id) === Number(user.id));
                } else {
                    const entries = res.data.entries || [];
                    userHasEntry = entries.length > 0;
                }
                setHasAnyEntry(userHasEntry);
                setChecking(false);
            })
            .catch(err => {
                console.error(`Error checking entry status for user_id ${user.id}:`, err);
                setChecking(false);
            });
    }, [user, gameKey, isUserAdmin]);

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

    if (!hasAnyEntry && !isPoolOpen) {
        return (
            <div style={{ maxWidth: 600, margin: "40px auto", padding: "16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
                <div style={{ background: "white", borderRadius: 16, padding: 40, textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", borderTop: `6px solid ${GRAY}` }}>
                    <span style={{ fontSize: 48 }}>🔒</span>
                    <h2 style={{ color: NAVY, marginTop: 16, marginBottom: 8, fontSize: 24, fontWeight: 800 }}>Registration Closed</h2>
                    <p style={{ color: "#6b7280", fontSize: 15, lineHeight: 1.6, maxWidth: 420, margin: "0 auto 32px auto" }}>
                        The {poolName} pool has already started or closed registration for this season. Come back next time!
                    </p>
                    {otherActivePools.length > 0 && (
                        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 28, textAlign: "left" }}>
                            <h3 style={{ fontSize: 13, color: "#1e293b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16, textAlign: "center" }}>
                                🔥 Check out these active pools instead:
                            </h3>
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
            </div>
        );
    }

    return (
        <div {...props}>
            {children}
        </div>
    );
}