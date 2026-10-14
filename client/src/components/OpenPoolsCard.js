import React, { useState, useEffect } from "react";
import axios from "axios";

const GOLD = "#c89d3c";

export default function OpenPoolsCard() {
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch active states publicly (no token required)
        axios.get("/api/settings/active-states")
            .then(async res => {
                const gameSettings = res.data || [];
                const activePools = gameSettings.filter(pool => {
                    const isActive = pool.is_active === true || pool.is_active === 1 || pool.is_active === "true";
                    return isActive;
                });

                // Check each active pool against the pool-started endpoint publicly
                const openPoolsPromises = activePools.map(async pool => {
                    try {
                        const statusRes = await axios.get(`/api/settings/pool-started?game_key=${pool.game_key}`);
                        // If started is false, it's open and accepting entries
                        if (statusRes.data && statusRes.data.started === false) {
                            return pool;
                        }
                    } catch (err) {
                        console.error(`Failed to check start status for ${pool.game_key}:`, err);
                    }
                    return null;
                });

                const results = await Promise.all(openPoolsPromises);
                setPools(results.filter(Boolean));
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
            padding: "16px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            border: "1px solid #334155"
        }}>
            <h3 style={{
                margin: "0 0 10px 0",
                fontSize: "14px",
                fontWeight: 800,
                color: GOLD,
                display: "flex",
                alignItems: "center",
                gap: 6
            }}>
                <span>⚡</span> Open Pools (Accepting Entries)
            </h3>
            <p style={{
                fontSize: "11px",
                color: "#94a3b8",
                margin: "0 0 14px 0",
                lineHeight: 1.4
            }}>
                Make your picks for upcoming matchups before the lock deadline!
            </p>

            {loading ? (
                <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", padding: "10px 0" }}>
                    Checking open pools...
                </div>
            ) : pools.length === 0 ? (
                <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", padding: "10px 0" }}>
                    No pools are currently accepting entries. Check back soon!
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                                    background: "rgba(255,255,255,0.07)",
                                    padding: "10px 12px",
                                    borderRadius: 8,
                                    color: "white",
                                    textDecoration: "none",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                <span>{poolIcon} {poolLabel} {pool.credits ? `(${pool.credits} cr)` : ""}</span>
                                <span style={{ fontSize: "10px", color: GOLD }}>Sign Up →</span>
                            </a>
                        );
                    })}

                    <a
                        href="#/"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "rgba(255,255,255,0.04)",
                            padding: "8px 12px",
                            borderRadius: 8,
                            color: "#cbd5e1",
                            textDecoration: "none",
                            fontSize: "11px",
                            fontWeight: 600,
                            border: "1px solid rgba(255,255,255,0.05)",
                            marginTop: 4
                        }}
                    >
                        <span>🏆 View All Pools</span>
                        <span style={{ fontSize: "10px", color: GOLD }}>View →</span>
                    </a>
                </div>
            )}
        </div>
    );
}