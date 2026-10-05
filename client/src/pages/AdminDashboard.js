import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import BTSrandomizer from '../components/nfl_bts/AdminTeamRandomizer';

const NAVY = "#1c61ac";

// 3D Flipping Digit Component for smooth mechanical downward animation
function SingleFlipCard({ value }) {
    const [displayVal, setDisplayVal] = useState(String(value));
    const [prevVal, setPrevVal] = useState(String(value));
    const [isFlipping, setIsFlipping] = useState(false);
    const refVal = useRef(value);

    useEffect(() => {
        const strVal = String(value);
        if (strVal !== refVal.current) {
            setPrevVal(refVal.current);
            setDisplayVal(strVal);
            setIsFlipping(true);
            refVal.current = strVal;

            const timer = setTimeout(() => {
                setIsFlipping(false);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [value]);

    const currentToShow = isFlipping ? displayVal : String(value);
    const prevToShow = isFlipping ? prevVal : String(value);

    return (
        <div className={`flip-card-unit ${isFlipping ? 'flipping' : ''}`}>
            <div className="top-static"><span>{currentToShow}</span></div>
            <div className="bottom-static"><span>{prevToShow}</span></div>
            <div className="flipper">
                <div className="front"><span>{prevToShow}</span></div>
                <div className="back"><span>{currentToShow}</span></div>
            </div>
        </div>
    );
}

function PoolCountdown({ poolData, mode }) {
    const [timeLeft, setTimeLeft] = useState(null);
    const [subText, setSubText] = useState("");
    const token = localStorage.getItem("token");

    useEffect(() => {
        let timer;
        let isMounted = true;

        if (mode === "pre-start" && poolData?.lock_date) {
            const target = new Date(poolData.lock_date);
            timer = setInterval(() => {
                const diff = target - new Date();
                if (diff <= 0) {
                    setTimeLeft(null);
                    clearInterval(timer);
                } else {
                    setTimeLeft(formatTime(diff));
                    setSubText(`Until Entries Close`);
                }
            }, 1000);
        } else if (mode === "active" && poolData?.games_api_path) {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const fetchNextGame = async () => {
                try {
                    let basePath = poolData.games_api_path;
                    let baseWeek = poolData.current_week || 1;

                    if (basePath.includes("week=")) {
                        basePath = basePath.split("?")[0];
                    }

                    let foundGame = null;

                    for (let w = Number(baseWeek); w <= Number(baseWeek) + 3; w++) {
                        const separator = basePath.includes("?") ? "&" : "?";
                        const queryUrl = `${basePath}${separator}week=${w}`;

                        const res = await axios.get(queryUrl, { headers });
                        const games = res.data.games || res.data || [];

                        const now = new Date();
                        const upcoming = games
                            .filter(g => new Date(g.game_date || g.date) > now)
                            .sort((a, b) => new Date(a.game_date || a.date) - new Date(b.game_date || b.date));

                        if (upcoming.length > 0) {
                            foundGame = upcoming[0];
                            break;
                        }
                    }

                    if (foundGame && isMounted) {
                        const gameTime = new Date(foundGame.game_date || foundGame.date);
                        timer = setInterval(() => {
                            const diff = gameTime - new Date();
                            if (diff <= 0) {
                                clearInterval(timer);
                                fetchNextGame();
                            } else {
                                setTimeLeft(formatTime(diff));
                                setSubText(`Next: ${foundGame.away_team} @ ${foundGame.home_team}`);
                            }
                        }, 1000);
                    }
                } catch (err) {
                    console.error("Error fetching games for countdown:", err);
                }
            };

            fetchNextGame();
        }

        return () => {
            isMounted = false;
            clearInterval(timer);
        };
    }, [mode, poolData, token]);

    if (!timeLeft) return <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>⚡ Games underway or lock time passed</div>;

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#111", padding: "4px 10px", borderRadius: "6px" }}>
            <span style={{ fontSize: "10px", color: "#c89d3c", fontWeight: 700 }}>{mode === "pre-start" ? "LOCKS IN:" : "NEXT:"}</span>
            <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                <TimeBox label="D" value={timeLeft.d} />
                <span style={{ color: "#01da25", fontWeight: "bold" }}>:</span>
                <TimeBox label="H" value={timeLeft.h} />
                <span style={{ color: "#01da25", fontWeight: "bold" }}>:</span>
                <TimeBox label="M" value={timeLeft.m} />
                <span style={{ color: "#01da25", fontWeight: "bold" }}>:</span>
                <TimeBox label="S" value={timeLeft.s} />
            </div>
        </div>
    );
}

function formatTime(diff) {
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);
    return {
        d: String(d).padStart(2, "0"),
        h: String(h).padStart(2, "0"),
        m: String(m).padStart(2, "0"),
        s: String(s).padStart(2, "0"),
    };
}

function TimeBox({ label, value }) {
    const strVal = String(value).padStart(2, "0");
    const tens = strVal[0] || '0';
    const ones = strVal[1] || '0';

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "1px" }}>
            <SingleFlipCard value={tens} />
            <SingleFlipCard value={ones} />
        </div>
    );
}

export default function AdminDashboard() {
    const [syncs, setSyncs] = useState([]);
    const [games, setGames] = useState([]);
    const [activeTab, setActiveTab] = useState("syncs");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const token = localStorage.getItem("token");

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/admin/data", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSyncs(res.data.statuses || []);
            setGames(res.data.gameSettings || []);
        } catch (err) {
            console.error("Failed to load admin data", err);
            setError("Failed to load dashboard data. Ensure you have administrator access.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSyncToggle = async (sync_file_route, field, currentValue) => {
        try {
            await axios.post("/api/admin/sync-status", {
                sync_file_route,
                [field]: !currentValue
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSyncs(prev => prev.map(s => {
                if (s.sync_file_route === sync_file_route) {
                    return { ...s, [field]: !currentValue };
                }
                return s;
            }));
            toast.success(`Updated ${sync_file_route}`);
        } catch (err) {
            toast.error("Failed to update sync setting.");
        }
    };

    const handleGameFieldChange = async (game_key, field, value) => {
        try {
            await axios.post("/api/admin/game-settings", {
                game_key,
                updates: { [field]: value }
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setGames(prev => prev.map(g => {
                if (g.game_key === game_key) {
                    return { ...g, [field]: value };
                }
                return g;
            }));
            toast.success(`Updated ${game_key} ${field}`);
        } catch (err) {
            toast.error("Failed to update game setting.");
        }
    };

    if (loading) {
        return <div style={{ textAlign: "center", padding: 50, fontFamily: "system-ui, sans-serif" }}>Loading Admin Hub...</div>;
    }

    return (
        <div className="page-content" style={{ width: "100%", maxWidth: 1100, margin: "0 auto", padding: "20px 12px", fontFamily: "system-ui, sans-serif" }}>
            <style>{`
                .flip-card-unit {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    width: 18px;
                    height: 26px;
                    font-size: 15px;
                    font-weight: 900;
                    color: #01da25;
                    perspective: 300px;
                    font-family: 'Courier New', Courier, monospace;
                    background: #111;
                    border-radius: 3px;
                }
                .flip-card-unit .top-static, .flip-card-unit .bottom-static {
                    position: absolute;
                    left: 0;
                    width: 100%;
                    height: 50%;
                    overflow: hidden;
                }
                .flip-card-unit .top-static {
                    top: 0;
                    background: #181818;
                    border-bottom: 1px solid #000;
                    border-radius: 3px 3px 0 0;
                }
                .flip-card-unit .top-static span {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 26px; line-height: 26px; text-align: center;
                }
                .flip-card-unit .bottom-static {
                    bottom: 0;
                    background: #2c2c2c;
                    border-top: 1px solid #111;
                    border-radius: 0 0 3px 3px;
                }
                .flip-card-unit .bottom-static span {
                    position: absolute;
                    top: -13px; left: 0; width: 100%; height: 26px; line-height: 26px; text-align: center;
                }
                .flip-card-unit .flipper {
                    position: absolute;
                    width: 100%;
                    height: 50%;
                    top: 0;
                    transform-origin: bottom;
                    transform-style: preserve-3d;
                    z-index: 3;
                }
                .flip-card-unit.flipping .flipper {
                    transition: transform 0.4s ease-in-out;
                    transform: rotateX(-180deg);
                }
                .flip-card-unit .front, .flip-card-unit .back {
                    position: absolute; left: 0; width: 100%; height: 100%; overflow: hidden; backface-visibility: hidden;
                }
                .flip-card-unit .front {
                    top: 0; background: #181818; border-bottom: 1px solid #000; border-radius: 3px 3px 0 0;
                }
                .flip-card-unit .front span {
                    position: absolute; top: 0; left: 0; width: 100%; height: 26px; line-height: 26px; text-align: center;
                }
                .flip-card-unit .back {
                    bottom: 0; background: #2c2c2c; transform: rotateX(180deg); border-radius: 0 0 3px 3px;
                }
                .flip-card-unit .back span {
                    position: absolute; top: -13px; left: 0; width: 100%; height: 26px; line-height: 26px; text-align: center;
                }
            `}</style>

            <div style={{ textAlign: "center", marginBottom: 20 }}>
                <h2 style={{ color: NAVY, fontSize: "26px", fontWeight: 800, margin: 0 }}>
                    🛠️ Administrator Control Hub
                </h2>
                <p style={{ color: "#64748b", marginTop: 4, fontSize: "13px" }}>
                    Manage background sync tasks and individual game configuration schedules.
                </p>
            </div>

            {error && (
                <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: "13px", fontWeight: 600 }}>
                    {error}
                </div>
            )}

            {/* Navigation Tabs */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px" }}>
                <button
                    onClick={() => setActiveTab("syncs")}
                    style={{
                        padding: "8px 16px", fontWeight: 700, fontSize: "14px", borderRadius: "6px", border: "none",
                        background: activeTab === "syncs" ? NAVY : "#f1f5f9",
                        color: activeTab === "syncs" ? "white" : "#475569", cursor: "pointer"
                    }}
                >
                    Background Sync Control ({syncs.length})
                </button>
                <button
                    onClick={() => setActiveTab("games")}
                    style={{
                        padding: "8px 16px", fontWeight: 700, fontSize: "14px", borderRadius: "6px", border: "none",
                        background: activeTab === "games" ? NAVY : "#f1f5f9",
                        color: activeTab === "games" ? "white" : "#475569", cursor: "pointer"
                    }}
                >
                    Game Settings & Dates ({games.length})
                </button>
                <button
                    onClick={() => setActiveTab("bts_randomizer")}
                    style={{
                        padding: "8px 16px", fontWeight: 700, fontSize: "14px", borderRadius: "6px", border: "none",
                        background: activeTab === "bts_randomizer" ? NAVY : "#f1f5f9",
                        color: activeTab === "bts_randomizer" ? "white" : "#475569", cursor: "pointer"
                    }}
                >
                    BTS Team Randomizer
                </button>
            </div>

            {/* TAB 1: SYNC CONTROLS */}
            {activeTab === "syncs" && (
                <div style={{ background: "white", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <div style={{ backgroundColor: NAVY, color: "white", padding: "12px 16px", fontWeight: 800, fontSize: "14px", display: "flex", justifyContent: "space-between" }}>
                        <span>Sync Route</span>
                        <span>Controls</span>
                    </div>
                    {syncs.map((sync, idx) => (
                        <div key={sync.id || sync.sync_file_route} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "14px 16px", borderBottom: idx < syncs.length - 1 ? "1px solid #f1f5f9" : "none",
                            backgroundColor: idx % 2 === 0 ? "#fafafa" : "white"
                        }}>
                            <div>
                                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "14px" }}>{sync.sync_file_route}</div>
                            </div>
                            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={!!sync.sync_enabled}
                                        onChange={() => handleSyncToggle(sync.sync_file_route, "sync_enabled", sync.sync_enabled)}
                                        style={{ width: 16, height: 16, accentColor: NAVY }}
                                    />
                                    Enabled
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={!!sync.is_active}
                                        onChange={() => handleSyncToggle(sync.sync_file_route, "is_active", sync.is_active)}
                                        style={{ width: 16, height: 16, accentColor: "#16a34a" }}
                                    />
                                    Active
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB 2: GAME SETTINGS */}
            {activeTab === "games" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {games.map((game) => {
                        const now = new Date();
                        const lockTime = game.lock_date ? new Date(game.lock_date) : null;
                        const mode = lockTime && now < lockTime ? "pre-start" : "active";

                        return (
                            <div key={game.game_key} style={{ background: "white", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", padding: "16px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                                    <div style={{ fontSize: "16px", fontWeight: 800, color: NAVY }}>
                                        {game.emoji || "🎮"} {game.game_label} <span style={{ fontSize: "11px", color: "#64748b" }}>({game.game_key})</span>
                                    </div>

                                    {/* Countdown Component injected right into the header card slot */}
                                    <PoolCountdown poolData={game} mode={mode} />

                                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={!!game.is_active}
                                            onChange={(e) => handleGameFieldChange(game.game_key, "is_active", e.target.checked)}
                                            style={{ width: 16, height: 16, accentColor: "#16a34a" }}
                                        />
                                        Game Active
                                    </label>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", fontSize: "12px" }}>
                                    <div>
                                        <label style={{ display: "block", fontWeight: 700, marginBottom: 4, color: "#475569" }}>Open Date</label>
                                        <input
                                            type="datetime-local"
                                            defaultValue={game.open_date ? game.open_date.slice(0, 16) : ""}
                                            onBlur={(e) => handleGameFieldChange(game.game_key, "open_date", e.target.value)}
                                            style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontWeight: 700, marginBottom: 4, color: "#475569" }}>Lock Date</label>
                                        <input
                                            type="datetime-local"
                                            defaultValue={game.lock_date ? game.lock_date.slice(0, 16) : ""}
                                            onBlur={(e) => handleGameFieldChange(game.game_key, "lock_date", e.target.value)}
                                            style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontWeight: 700, marginBottom: 4, color: "#475569" }}>Sync Start Date</label>
                                        <input
                                            type="datetime-local"
                                            defaultValue={game.sync_start_date ? game.sync_start_date.slice(0, 16) : ""}
                                            onBlur={(e) => handleGameFieldChange(game.game_key, "sync_start_date", e.target.value)}
                                            style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontWeight: 700, marginBottom: 4, color: "#475569" }}>Sync End Date</label>
                                        <input
                                            type="datetime-local"
                                            defaultValue={game.sync_end_date ? game.sync_end_date.slice(0, 16) : ""}
                                            onBlur={(e) => handleGameFieldChange(game.game_key, "sync_end_date", e.target.value)}
                                            style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* TAB 3: BTS Randomizer */}
            {activeTab === "bts_randomizer" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <BTSrandomizer />
                </div>
            )}
        </div>
    );
}