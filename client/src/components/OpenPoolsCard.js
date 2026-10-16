import React, { useState, useEffect } from "react";
import axios from "axios";
import PoolCountdown from "./PoolCountdown";
import PoolEmoji from "./PoolEmoji";

export default function OpenPoolsCard({ isDarkMode = true }) {
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
        <section className={`open-pools-card${isDarkMode ? " open-pools-card--dark" : " open-pools-card--light"}`}>
            <button
                type="button"
                className="open-pools-card-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
            >
                <h3 className="open-pools-card-title">
                    <span>⚡</span> Open Pools
                </h3>
                <span className={`open-pools-card-chevron${isExpanded ? " open-pools-card-chevron--expanded" : ""}`}>▼</span>
            </button>

            <div className={`open-pools-card-content${isExpanded ? " open-pools-card-content--expanded" : ""}`}>
                {loading ? (
                    <div className="open-pools-card-message">
                        Checking open pools...
                    </div>
                ) : pools.length === 0 ? (
                    <div className="open-pools-card-message">
                        No pools currently accepting entries.
                    </div>
                ) : (
                    <div className="open-pools-card-list">
                        {pools.map(pool => {
                            const poolRoute = pool.prefix ? `#${pool.prefix}` : `#/${pool.game_key}`;
                            const poolLabel = pool.title || pool.game_label || pool.game_key;
                            return (
                                <a
                                    key={pool.game_key}
                                    href={poolRoute}
                                    className="open-pools-card-pool"
                                >
                                    {/* Left: Title & Sign Up */}
                                    <div className="open-pools-card-pool-copy">
                                        <div className="open-pools-card-pool-title">
                                            <PoolEmoji gameKey={pool.game_key} className="open-pools-card-pool-icon" />
                                            <span className="open-pools-card-pool-name">
                                                {poolLabel}
                                            </span>
                                        </div>
                                        <span className="open-pools-card-signup">Sign Up {pool.credits ? `(${pool.credits}cr)` : ""} ➡️ </span>
                                    </div>

                                    {/* Right: Integrated Countdown Clock */}
                                    <div className="open-pools-card-countdown">
                                        <PoolCountdown poolData={pool} mode="upcoming" isDarkMode={isDarkMode} compact={true} daysAndHoursOnly={true} />
                                    </div>
                                </a>
                            );
                        })}

                        <a
                            href="#/"
                            className="open-pools-card-all"
                        >
                            <span>🏆 View All Pools</span>
                            <span className="open-pools-card-all-action">View →</span>
                        </a>
                    </div>
                )}
            </div>
        </section>
    );
}