import React, { useState, useEffect } from "react";
import axios from "axios";
import PoolCountdown from "./PoolCountdown";

const GOLD = "#c89d3c";

export default function OpenPoolsCard() {
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        axios.get("/api/settings/active-states")
            .then(async res => {
                const gameSettings = res.data || [];
                const activePools = gameSettings.filter(pool => {
                    const isActive = pool.is_active === true || pool.is_active === 1 || pool.is_active === "true";
                    return isActive;
                });

                const openPoolsPromises = activePools.map(async pool => {
                    try {
                        const statusRes = await axios.get(`/api/settings/pool-started?game_key=${pool.game_key}`);
                        if (statusRes.data && statusRes.data.started === false) {
                            return pool;
                        }
                    } catch (err) {
                        console.error(`Failed to check start status for ${pool.game_key}:`, err);
                    }
                    return null;
                });

                const results = await Promise.all(openPoolsPromises);
                const validPools = results.filter(Boolean);

                // Sort pools by next game up (earliest lock_date or open_date first)
                validPools.sort((a, b) => {
                    const dateA = new Date(a.lock_date || a.open_date || 0);
                    const dateB = new Date(b.lock_date || b.open_date || 0);
                    return dateA - dateB;
                });

                setPools(validPools);
            })
            .catch(err => {
                console.error("Failed to fetch pool settings for card", err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    return (
        <div style={{
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            borderRadius: 12,
            padding: "10px 12px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            border: "1px solid #334155"
        }}>
            <div 
                onClick={() => setIsExpanded(!isExpanded)} 
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
            >
                <h3 style={{
                    margin: 0,
                    fontSize: "13px",
                    fontWeight: 800,
                    color: GOLD,
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                }}>
                    <span>⚡</span> Open Pools
                </h3>
                <span style={{ color: "#9ca3af", fontSize: "11px", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", padding: "2px" }}>▼</span>
            </div>

            <div style={{ maxHeight: isExpanded ? "800px" : "0px", opacity: isExpanded ? 1 : 0, transition: "all 0.25s ease-in-out", overflow: "hidden" }}>
                {loading ? (
                    <div style={{ fontSize: "10px", color: "#94a3b8", textAlign: "center", padding: "8px 0" }}>
                        Checking open pools...
                    </div>
                ) : pools.length === 0 ? (
                    <div style={{ fontSize: "10px", color: "#94a3b8", textAlign: "center", padding: "8px 0" }}>
                        No pools currently accepting entries.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8 }}>
                        {pools.map(pool => {
                            const poolRoute = pool.prefix ? `#${pool.prefix}` : `#/${pool.game_key}`;
                            const poolLabel = pool.title || pool.game_label || pool.game_key;
                            const poolIcon = pool.emoji || "🎯";

                            return (
                                <a
                                    key={pool.game_key}
                                    href={poolRoute}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        background: "rgba(255,255,255,0.04)",
                                        padding: "8px 10px",
                                        borderRadius: 6,
                                        color: "white",
                                        textDecoration: "none",
                                        border: "1px solid rgba(255,255,255,0.06)",
                                        transition: "all 0.2s ease",
                                        gap: "8px"
                                    }}
                                >
                                    {/* Left: Title & Sign Up */}
                                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, gap: "2px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                                            <span style={{ fontSize: "13px", flexShrink: 0 }}>{poolIcon}</span>
                                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {poolLabel}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: "10px", color: GOLD, fontWeight: 700, paddingLeft: "19px" }}>Sign Up {pool.credits ? `(${pool.credits}cr)` : ""} ➡️ </span>
                                    </div>

                                    {/* Right: Integrated Countdown Clock */}
                                    <div style={{ flexShrink: 0 }}>
                                        <PoolCountdown poolData={pool} mode="upcoming" isDarkMode={true} compact={true} daysAndHoursOnly={true} />
                                    </div>
                                </a>
                            );
                        })}

                        <a
                            href="#/"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                background: "rgba(255,255,255,0.03)",
                                padding: "6px 8px",
                                borderRadius: 6,
                                color: "#cbd5e1",
                                textDecoration: "none",
                                fontSize: "10px",
                                fontWeight: 600,
                                border: "1px solid rgba(255,255,255,0.04)",
                                marginTop: 2
                            }}
                        >
                            <span>🏆 View All Pools</span>
                            <span style={{ fontSize: "10px", color: GOLD }}>View →</span>
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}