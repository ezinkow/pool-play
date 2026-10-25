import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PoolEmoji from "./PoolEmoji";

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

        Promise.all([
            axios.get("/api/settings/active-states").catch(() => ({ data: [] })),
            axios.get(`/api/settings/pool-started?game_key=${gameKey}`).catch(() => ({ data: { started: false } }))
        ])
            .then(([statesRes, startedRes]) => {
                const states = statesRes.data || [];
                const currentPool = states.find(s => s.game_key === gameKey || s.route === `/${gameKey}` || s.route === gameKey || (s.route && s.route.includes(gameKey)));
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

                    setIsPoolOpen(dbActive && !isPastLockTime && !leagueStarted);
                    setPoolName(currentPool.title || currentPool.game_label || gameKey.toUpperCase());
                } else {
                    setPoolName(gameKey.toUpperCase());
                    setIsPoolOpen(true);
                }

                const livePools = states.filter(s => s.is_active && s.game_key !== gameKey && s.route !== gameKey);
                setOtherActivePools(livePools);

                if (!user?.id) {
                    setChecking(false);
                    return;
                }

                // Clean up route slashes to build correct endpoint paths safely
                const rawRoute = currentPool?.route || gameKey;
                const cleanSlug = rawRoute.startsWith('/') ? rawRoute.substring(1) : rawRoute;
                
                const candidateSlugs = [
                    cleanSlug,
                    cleanSlug.replace(/_/g, ''),
                    cleanSlug.replace(/_/g, '-'),
                    gameKey,
                    gameKey.replace(/_/g, ''),
                    'nflsurvivor_secondchance',
                    'nfl_survivor_second_chance'
                ];
                const uniqueSlugs = [...new Set(candidateSlugs)];

                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };

                const tryFetchEntry = async (slugIndex) => {
                    if (slugIndex >= uniqueSlugs.length) {
                        setHasAnyEntry(false);
                        setChecking(false);
                        return;
                    }

                    const slug = uniqueSlugs[slugIndex];
                    const url = `/api/${slug}/entries/me`;

                    try {
                        const res = await axios.get(url, { headers });
                        let userHasEntry = false;
                        if (Array.isArray(res.data)) {
                            userHasEntry = res.data.some(entry => Number(entry.user_id) === Number(user.id));
                        } else {
                            userHasEntry = !!res.data?.entry || (res.data?.entries && res.data.entries.length > 0) || res.data?.registered === true || res.data?.success === true;
                        }

                        if (userHasEntry) {
                            setHasAnyEntry(true);
                            setChecking(false);
                        } else if (slugIndex === uniqueSlugs.length - 1) {
                            setHasAnyEntry(false);
                            setChecking(false);
                        } else {
                            tryFetchEntry(slugIndex + 1);
                        }
                    } catch (err) {
                        if (slugIndex === uniqueSlugs.length - 1) {
                            setHasAnyEntry(false);
                            setChecking(false);
                        } else {
                            tryFetchEntry(slugIndex + 1);
                        }
                    }
                };

                tryFetchEntry(0);
            })
            .catch(() => {
                setChecking(false);
            });
    }, [user, gameKey, isUserAdmin]);

    if (isUserAdmin) {
        return <>{children}</>;
    }

    if (!user) {
        return (
            <div style={{ maxWidth: 480, margin: "20px auto", padding: 40, textAlign: "center", background: "#fdfdfd", borderRadius: 12, border: "1px solid #e5e7eb" }}>
                <PoolEmoji gameKey={gameKey} style={{ fontSize: 40 }} />
                <h2 style={{ color: NAVY, marginTop: 10 }}>{poolName} Pool</h2>
                <p style={{ color: "#4b5563" }}>Please log in to participate.</p>
            </div>
        );
    }

    if (checking) {
        return <div style={{ color: "white", padding: 20, textAlign: "center" }}>Verifying registration status...</div>;
    }
    
    // SAFETY: If the user has an entry, never block them regardless of pool open/closed states.
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
                                    <div key={pool.game_key} onClick={() => navigate(pool.url_path)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, cursor: "pointer", transition: "all 0.15s ease" }} onMouseEnter={e => e.currentTarget.style.borderColor = pool.accent || RED} onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <PoolEmoji gameKey={pool.game_key} style={{ fontSize: 24 }} />
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