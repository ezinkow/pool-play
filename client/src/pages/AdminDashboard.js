import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";
import useTeamColors from "../hooks/useNCAATeamColors";
import NotFound from "../pages/NotFound";
import BTSrandomizer from '../components/nfl_bts/AdminTeamRandomizer';
import PoolEmoji from "../components/PoolEmoji";

const NAVY = "#1c61ac";
const GOLD = "#c89d3c";
const GRAY = "#94a3b8";

// --- CSS FOR FLIPCARDS (Exact Homepage Match) ---
const countdownStyle = `
.flip-card-unit {
    position: relative; display: flex; flex-direction: column; width: 18px; height: 28px;
    font-size: 15px; font-weight: 900; color: #ffffff; perspective: 300px;
    font-family: 'Courier New', Courier, monospace; background: #111; border-radius: 3px;
}
.flip-card-unit .top-static, .flip-card-unit .bottom-static { position: absolute; left: 0; width: 100%; height: 50%; overflow: hidden; }
.flip-card-unit .top-static { top: 0; background: #181818; border-bottom: 1px solid #000; border-radius: 3px 3px 0 0; }
.flip-card-unit .top-static span { position: absolute; top: 0; left: 0; width: 100%; height: 28px; line-height: 28px; text-align: center; }
.flip-card-unit .bottom-static { bottom: 0; background: #2c2c2c; border-top: 1px solid #111; border-radius: 0 0 3px 3px; }
.flip-card-unit .bottom-static span { position: absolute; top: -14px; left: 0; width: 100%; height: 28px; line-height: 28px; text-align: center; }
.flip-card-unit .bottom-shade { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 100%); pointer-events: none; }
.flip-card-unit .flipper { position: absolute; width: 100%; height: 50%; top: 0; transform-origin: bottom; transform-style: preserve-3d; z-index: 3; }
.flip-card-unit.flipping .flipper { transition: transform 0.4s ease-in-out; transform: rotateX(-180deg); }
.flip-card-unit .front, .flip-card-unit .back { position: absolute; left: 0; width: 100%; height: 100%; overflow: hidden; backface-visibility: hidden; }
.flip-card-unit .front { top: 0; background: #181818; border-bottom: 1px solid #000; border-radius: 3px 3px 0 0; }
.flip-card-unit .front span { position: absolute; top: 0; left: 0; width: 100%; height: 28px; line-height: 28px; text-align: center; }
.flip-card-unit .back { bottom: 0; background: #2c2c2c; transform: rotateX(180deg); border-radius: 0 0 3px 3px; }
.flip-card-unit .back span { position: absolute; top: -14px; left: 0; width: 100%; height: 28px; line-height: 28px; text-align: center; }
`;

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
            const timer = setTimeout(() => setIsFlipping(false), 400);
            return () => clearTimeout(timer);
        }
    }, [value]);

    const currentToShow = isFlipping ? displayVal : String(value);
    const prevToShow = isFlipping ? prevVal : String(value);

    return (
        <div className={`flip-card-unit ${isFlipping ? 'flipping' : ''}`}>
            <div className="top-static"><span>{currentToShow}</span></div>
            <div className="bottom-static">
                <span>{prevToShow}</span>
                <div className="bottom-shade"></div>
            </div>
            <div className="flipper">
                <div className="front"><span>{prevToShow}</span></div>
                <div className="back"><span>{currentToShow}</span></div>
            </div>
        </div>
    );
}

function PoolCountdown({ poolData, isDarkMode }) {
    const [timeLeft, setTimeLeft] = useState(null);
    const token = localStorage.getItem("token");

    const gameKey = poolData?.game_key;
    const lockDate = poolData?.lock_date;
    const openDate = poolData?.open_date;
    const isActive = poolData?.is_active === true || poolData?.is_active === 1 || poolData?.is_active === "true";

    useEffect(() => {
        let timer;
        let isMounted = true;

        const now = new Date();
        const openTime = openDate ? new Date(openDate) : null;
        const lockTime = lockDate ? new Date(lockDate) : null;

        const isBeforeOpen = !isActive || (openTime && now < openTime);
        const isPreStart = isActive && lockTime && now >= (openTime || 0) && now < lockTime;

        if (isBeforeOpen && openTime) {
            timer = setInterval(() => {
                const diff = openTime - new Date();
                if (diff <= 0) {
                    if (isMounted) setTimeLeft(null);
                    clearInterval(timer);
                } else if (isMounted) {
                    setTimeLeft(formatTime(diff));
                }
            }, 1000);
        } else if (isPreStart && lockTime) {
            timer = setInterval(() => {
                const diff = lockTime - new Date();
                if (diff <= 0) {
                    if (isMounted) setTimeLeft(null);
                    clearInterval(timer);
                } else if (isMounted) {
                    setTimeLeft(formatTime(diff));
                }
            }, 1000);
        } else if (isActive && gameKey) {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const fetchNextGame = async () => {
                try {
                    const res = await axios.get(`/api/pools/next-game?game_key=${gameKey}`, { headers });
                    const nextGame = res.data;
                    if (nextGame && isMounted) {
                        const gameTime = new Date(nextGame.game_date || nextGame.date);
                        if (timer) clearInterval(timer);
                        timer = setInterval(() => {
                            const diff = gameTime - new Date();
                            if (diff <= 0) {
                                clearInterval(timer);
                                fetchNextGame();
                            } else if (isMounted) {
                                setTimeLeft(formatTime(diff));
                            }
                        }, 1000);
                    } else if (isMounted) setTimeLeft(null);
                } catch (err) { console.error("Error fetching countdown:", err); }
            };
            fetchNextGame();
        } else if (isMounted) setTimeLeft(null);

        return () => {
            isMounted = false;
            if (timer) clearInterval(timer);
        };
    }, [gameKey, lockDate, openDate, isActive, token]);

    if (!timeLeft) return <span style={{ fontSize: "11px", color: GRAY, fontStyle: "italic" }}>⚡ Check Status</span>;

    const now = new Date();
    const openTime = openDate ? new Date(openDate) : null;
    const lockTime = lockDate ? new Date(lockDate) : null;
    const isBeforeOpen = !isActive || (openTime && now < openTime);
    const isPreStart = isActive && lockTime && now >= (openTime || 0) && now < lockTime;
    const labelText = isBeforeOpen ? "OPENS:" : isPreStart ? "LOCKS:" : "NEXT:";

    const showYears = parseInt(timeLeft.y, 10) > 0;

    const renderFlipPair = (valStr, subLabel, digits = 2) => {
        const padded = String(valStr).padStart(digits, "0");
        const digitsArr = padded.split("");
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "2px" }}>
                    {digitsArr.map((d, i) => (
                        <SingleFlipCard key={`${subLabel}-${i}`} value={d} />
                    ))}
                </div>
                <span style={{ fontSize: "8px", color: "#ffffff", fontWeight: "800", marginTop: "3px", textTransform: "uppercase" }}>{subLabel}</span>
            </div>
        );
    };

    const containerBg = isDarkMode ? "#0b0f19" : "#1e293b";
    const containerBorder = isDarkMode ? "#334155" : GOLD;

    return (
        <div style={{ display: "inline-flex", alignItems: "center", backgroundColor: containerBg, padding: "4px 8px", borderRadius: "6px", border: `1px solid ${containerBorder}`, maxWidth: "100%", overflow: "hidden" }}>
            <span style={{ color: "#ffffff", fontSize: "9px", fontWeight: "800", marginRight: "6px", textTransform: "uppercase" }}>{labelText}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "nowrap" }}>
                {showYears && (
                    <>
                        {renderFlipPair(timeLeft.y, "Yrs", 2)}
                        <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: "bold", paddingBottom: "10px" }}>:</span>
                    </>
                )}
                {renderFlipPair(timeLeft.d, "Days", 3)}
                <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: "bold", paddingBottom: "16px" }}>:</span>
                {renderFlipPair(timeLeft.h, "Hrs", 2)}
                <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: "bold", paddingBottom: "16px" }}>:</span>
                {renderFlipPair(timeLeft.m, "Min", 2)}
                <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: "bold", paddingBottom: "16px" }}>:</span>
                {renderFlipPair(timeLeft.s, "Sec", 2)}
            </div>
        </div>
    );
}

function formatTime(diff) {
    const msPerSecond = 1000;
    const msPerMinute = msPerSecond * 60;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    const msPerYear = msPerDay * 365.25;

    let years = Math.floor(diff / msPerYear);
    let remainingAfterYears = diff % msPerYear;

    if (years < 0) {
        years = 0;
        remainingAfterYears = diff;
    }

    const days = Math.floor(remainingAfterYears / msPerDay);
    const remainingAfterDays = remainingAfterYears % msPerDay;
    const hours = Math.floor(remainingAfterDays / msPerHour);
    const remainingAfterHours = remainingAfterDays % msPerHour;
    const minutes = Math.floor(remainingAfterHours / msPerMinute);
    const remainingAfterMinutes = remainingAfterHours % msPerMinute;
    const seconds = Math.floor(remainingAfterMinutes / msPerSecond);

    return {
        y: String(years),
        d: String(days),
        h: String(hours).padStart(2, "0"),
        m: String(minutes).padStart(2, "0"),
        s: String(seconds).padStart(2, "0"),
    };
}

export default function AdminDashboard() {
    const { user, loading: authLoading } = useAuth();
    const [syncs, setSyncs] = useState([]);
    const [games, setGames] = useState([]);
    const [activeTab, setActiveTab] = useState("reminders");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [allPoolSettings, setAllPoolSettings] = useState([]);

    const [cfbWeek, setCfbWeek] = useState(1);
    const [cfbGames, setCfbGames] = useState([]);
    const [cfbLoading, setCfbLoading] = useState(false);

    const [ncaabWeek, setNcaabWeek] = useState(1);
    const [ncaabGames, setNcaabGames] = useState([]);
    const [ncaabLoading, setNcaabLoading] = useState(false);

    const token = localStorage.getItem("token");
    const isAdmin = user?.is_admin === 1 || user?.is_admin === true;

    const [reminders, setReminders] = useState([]);
    const [reminderForm, setReminderForm] = useState({ email: "", subject: "", message: "", send_at: "" });
    const [remindersLoading, setRemindersLoading] = useState(false);

    // Load NCAA team colors and logos mapping
    const { teamColors } = useTeamColors(token);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/admin/data", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSyncs(res.data.statuses || []);
            setGames(res.data.gameSettings || []);

            if (res.data.gameSettings) {
                const cfbSetting = res.data.gameSettings.find(g => g.game_key === "cfb_pickem_ats");
                if (cfbSetting && cfbSetting.current_week) {
                    setCfbWeek(Number(cfbSetting.current_week));
                }
                const ncaabSetting = res.data.gameSettings.find(g => g.game_key === "ncaab_pickem_ats");
                if (ncaabSetting && ncaabSetting.current_week) {
                    setNcaabWeek(Number(ncaabSetting.current_week));
                }
            }
        } catch (err) {
            console.error("Failed to load admin data", err);
            setError("Failed to load dashboard data. Ensure you have administrator access.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchData();
        }
    }, [isAdmin]);

    useEffect(() => {
        if (token && isAdmin) {
            axios.get("/api/settings/active-states", {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => setAllPoolSettings(res.data || []))
                .catch(err => console.error("Failed to load pool settings for dropdown", err));
        }
    }, [token, isAdmin]);

    useEffect(() => {
        if (activeTab === "cfb_must_picks" && token && isAdmin) {
            setCfbLoading(true);
            axios.get("/api/cfb_pickem_ats/games", {
                params: { week: cfbWeek },
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => {
                    setCfbGames(res.data.games || []);
                })
                .catch(err => {
                    console.error("Failed to load CFB games for admin", err);
                    toast.error("Failed to load matchups for Week " + cfbWeek);
                })
                .finally(() => setCfbLoading(false));
        }
    }, [activeTab, cfbWeek, token, isAdmin]);

    useEffect(() => {
        if (activeTab === "ncaab_must_picks" && token && isAdmin) {
            setNcaabLoading(true);
            axios.get("/api/ncaab_pickem_ats/games", {
                params: { week: ncaabWeek },
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => {
                    setNcaabGames(res.data.games || []);
                })
                .catch(err => {
                    console.error("Failed to load NCAAB games for admin", err);
                    toast.error("Failed to load matchups for Week " + ncaabWeek);
                })
                .finally(() => setNcaabLoading(false));
        }
    }, [activeTab, ncaabWeek, token, isAdmin]);

    useEffect(() => {
        if (activeTab === "reminders" && token && isAdmin) {
            setRemindersLoading(true);
            axios.get("/api/admin/reminders", {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => setReminders(res.data || []))
                .catch(err => {
                    console.error("Failed to load reminders", err);
                    toast.error("Failed to load reminders");
                })
                .finally(() => setRemindersLoading(false));
        }
    }, [activeTab, token, isAdmin]);

    if (authLoading) {
        return <div style={{ textAlign: "center", padding: 50, fontFamily: "system-ui, sans-serif" }}>Verifying access...</div>;
    }

    if (!isAdmin) {
        return <NotFound />;
    }

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

    const handleToggleMustPick = async (gameId, currentStatus) => {
        try {
            await axios.post("/api/admin/cfb-must-pick", {
                game_id: gameId,
                must_pick: !currentStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setCfbGames(prev => prev.map(g => {
                if (g.id === gameId) {
                    return { ...g, must_pick: !currentStatus };
                }
                return g;
            }));
            toast.success(!currentStatus ? "Marked as Must-Pick ⭐" : "Removed Must-Pick status");
        } catch (err) {
            console.error("Failed to update must-pick status", err);
            toast.error(err.response?.data?.error || "Failed to update must-pick status.");
        }
    };

    const handleToggleNcaabMustPick = async (gameId, currentStatus) => {
        try {
            await axios.post("/api/admin/ncaab-must-pick", {
                game_id: gameId,
                must_pick: !currentStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setNcaabGames(prev => prev.map(g => {
                if (g.id === gameId) {
                    return { ...g, must_pick: !currentStatus };
                }
                return g;
            }));
            toast.success(!currentStatus ? "Marked as Must-Pick ⭐" : "Removed Must-Pick status");
        } catch (err) {
            console.error("Failed to update NCAAB must-pick status", err);
            toast.error(err.response?.data?.error || "Failed to update must-pick status.");
        }
    };

    const handleCreateReminder = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post("/api/admin/reminders", reminderForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReminders([res.data.reminder, ...reminders]);
            setReminderForm({ email: "", subject: "", message: "", send_at: "" });
            toast.success("Reminder scheduled successfully!");
        } catch (err) {
            toast.error("Failed to schedule reminder.");
        }
    };

    const handleDeleteReminder = async (id) => {
        if (!window.confirm("Are you sure you want to delete this reminder?")) return;
        try {
            await axios.delete(`/api/admin/reminders/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReminders(prev => prev.filter(r => r.id !== id));
            toast.success("Reminder deleted.");
        } catch (err) {
            toast.error("Failed to delete reminder.");
        }
    };

    if (loading) {
        return <div style={{ textAlign: "center", padding: 50, fontFamily: "system-ui, sans-serif" }}>Loading Admin Hub...</div>;
    }

    const mustPickCount = cfbGames.filter(g => g.must_pick).length;
    const ncaabMustPickCount = ncaabGames.filter(g => g.must_pick).length;

    return (
        <div style={{ width: "100%", maxWidth: 1100, margin: "0 auto", padding: "20px 12px", fontFamily: "system-ui, sans-serif" }}>
            <style>{countdownStyle}</style>

            <div style={{ textAlign: "center", marginBottom: 20 }}>
                <h2 style={{ color: NAVY, fontSize: "26px", fontWeight: 800, margin: 0 }}>
                    🛠️ Administrator Control Hub
                </h2>
                <p style={{ color: "#64748b", marginTop: 4, fontSize: "13px" }}>
                    Manage background sync tasks, game configurations, and Must-Picks.
                </p>
            </div>

            {error && (
                <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: "13px", fontWeight: 600 }}>
                    {error}
                </div>
            )}

            {/* Navigation Tabs */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px", flexWrap: "wrap" }}>
                <button
                    onClick={() => setActiveTab("reminders")}
                    style={{
                        padding: "8px 16px", fontWeight: 700, fontSize: "14px", borderRadius: "6px", border: "none",
                        background: activeTab === "reminders" ? NAVY : "#f1f5f9",
                        color: activeTab === "reminders" ? "white" : "#475569", cursor: "pointer"
                    }}
                >
                    📧 Email Reminders ({reminders.length})
                </button>
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
                    onClick={() => setActiveTab("cfb_must_picks")}
                    style={{
                        padding: "8px 16px", fontWeight: 700, fontSize: "14px", borderRadius: "6px", border: "none",
                        background: activeTab === "cfb_must_picks" ? NAVY : "#f1f5f9",
                        color: activeTab === "cfb_must_picks" ? "white" : "#475569", cursor: "pointer"
                    }}
                >
                    <PoolEmoji gameKey="cfb_pickem_ats" /> CFB Must-Picks
                </button>
                <button
                    onClick={() => setActiveTab("ncaab_must_picks")}
                    style={{
                        padding: "8px 16px", fontWeight: 700, fontSize: "14px", borderRadius: "6px", border: "none",
                        background: activeTab === "ncaab_must_picks" ? NAVY : "#f1f5f9",
                        color: activeTab === "ncaab_must_picks" ? "white" : "#475569", cursor: "pointer"
                    }}
                >
                    <PoolEmoji gameKey="ncaab_pickem_ats" /> NCAAB Must-Picks
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

            {/* TAB 1: EMAIL REMINDERS MANAGEMENT */}
            {activeTab === "reminders" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Broadcast Pool Reminder Form */}
                    <div style={{ background: "white", padding: "20px", borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.04)", marginTop: "20px" }}>
                        <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: 800, color: NAVY }}>Broadcast Pool Reminder (Group Email)</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const poolKey = e.target.pool_key.value;
                            const subject = e.target.subject.value;
                            const message = e.target.message.value;
                            const sendAt = e.target.send_at.value; // Optional scheduled time

                            try {
                                const endpoint = sendAt ? "/api/admin/reminders/schedule-broadcast" : "/api/admin/reminders/broadcast";
                                const payload = sendAt
                                    ? { pool_key: poolKey, subject, message, send_at: sendAt }
                                    : { pool_key: poolKey, subject, message };

                                const res = await axios.post(endpoint, payload, {
                                    headers: { Authorization: `Bearer ${token}` }
                                });
                                toast.success(res.data.message);
                                e.target.reset();

                                // Refresh reminders list if a scheduled reminder was added
                                if (sendAt) {
                                    axios.get("/api/admin/reminders", { headers: { Authorization: `Bearer ${token}` } })
                                        .then(r => setReminders(r.data || []));
                                }
                            } catch (err) {
                                toast.error(err.response?.data?.error || "Failed to process broadcast reminder.");
                            }
                        }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", alignItems: "end" }}>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: 4, color: "#475569" }}>Select Pool</label>
                                <select name="pool_key" required style={{ width: "100%", padding: "8px", borderRadius: 4, border: "1px solid #cbd5e1" }}>
                                    <option value="">-- Choose Pool --</option>
                                    {allPoolSettings.map(pool => {
                                        const now = new Date();
                                        const isActive = pool.is_active === true || pool.is_active === 1 || pool.is_active === "true";
                                        const lockTime = pool.lock_date ? new Date(pool.lock_date) : null;

                                        let statusLabel = "🟢 Active";
                                        if (!isActive) {
                                            statusLabel = "🔴 Inactive";
                                        } else if (lockTime && now >= lockTime) {
                                            statusLabel = "🔒 Locked / Started";
                                        } else if (lockTime) {
                                            statusLabel = "⏳ Open (Pre-Lock)";
                                        }

                                        return (
                                            <option key={pool.game_key} value={pool.game_key}>
                                                {pool.game_label || pool.game_key} ({statusLabel})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: 4, color: "#475569" }}>Subject</label>
                                <input
                                    type="text"
                                    name="subject"
                                    required
                                    placeholder="Make your picks!"
                                    style={{ width: "100%", padding: "8px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: 4, color: "#475569" }}>Send At (Optional - Leave blank to send now)</label>
                                <input
                                    type="datetime-local"
                                    name="send_at"
                                    style={{ width: "100%", padding: "8px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                                />
                            </div>

                            <div style={{ gridColumn: "1 / -1" }}>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: 4, color: "#475569" }}>Message Body</label>
                                <textarea
                                    name="message"
                                    required
                                    placeholder="Reminder: Games lock soon, make sure your entries are submitted!"
                                    style={{ width: "100%", padding: "8px", borderRadius: 4, border: "1px solid #cbd5e1", minHeight: "80px" }}
                                />
                            </div>

                            <div>
                                <button type="submit" style={{ background: NAVY, color: "white", padding: "10px 16px", borderRadius: 6, fontWeight: 700, border: "none", cursor: "pointer" }}>
                                    Send / Schedule Broadcast 🚀
                                </button>
                            </div>
                        </form>
                    </div>
                    {/* Create Form */}
                    <div style={{ background: "white", padding: "20px", borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
                        <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: 800, color: NAVY }}>Schedule New Email Reminder</h3>
                        <form onSubmit={handleCreateReminder} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", alignItems: "end" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: 4, color: "#475569" }}>Recipient Email</label>
                                <input
                                    type="email"
                                    required
                                    value={reminderForm.email}
                                    onChange={e => setReminderForm({ ...reminderForm, email: e.target.value })}
                                    placeholder="user@example.com"
                                    style={{ width: "100%", padding: "8px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: 4, color: "#475569" }}>Subject</label>
                                <input
                                    type="text"
                                    required
                                    value={reminderForm.subject}
                                    onChange={e => setReminderForm({ ...reminderForm, subject: e.target.value })}
                                    placeholder="Pool Reminder"
                                    style={{ width: "100%", padding: "8px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: 4, color: "#475569" }}>Send At Time</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={reminderForm.send_at}
                                    onChange={e => setReminderForm({ ...reminderForm, send_at: e.target.value })}
                                    style={{ width: "100%", padding: "8px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                                />
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: 4, color: "#475569" }}>Message</label>
                                <textarea
                                    required
                                    value={reminderForm.message}
                                    onChange={e => setReminderForm({ ...reminderForm, message: e.target.value })}
                                    placeholder="Don't forget to submit your picks before lock!"
                                    style={{ width: "100%", padding: "8px", borderRadius: 4, border: "1px solid #cbd5e1", minHeight: "80px" }}
                                />
                            </div>
                            <div>
                                <button type="submit" style={{ background: NAVY, color: "white", padding: "10px 16px", borderRadius: 6, fontWeight: 700, border: "none", cursor: "pointer" }}>
                                    Schedule Reminder
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Existing Reminders Table */}
                    <div style={{ background: "white", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                        <div style={{ backgroundColor: NAVY, color: "white", padding: "12px 16px", fontWeight: 800, fontSize: "14px" }}>
                            Scheduled Reminders Queue
                        </div>
                        {remindersLoading ? (
                            <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>Loading reminders...</div>
                        ) : reminders.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>No scheduled reminders found.</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                {reminders.map((rem, idx) => (
                                    <div key={rem.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fafafa" : "white", gap: 12 }}>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>{rem.subject} <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 450 }}>({rem.email})</span></div>
                                            <div style={{ fontSize: "12px", color: "#475569", marginTop: 2 }}>{rem.message}</div>
                                            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: 4 }}>
                                                Scheduled for: {new Date(rem.send_at).toLocaleString()} | Status: <strong style={{ color: rem.sent ? "#16a34a" : "#ca8a04" }}>{rem.sent ? "Sent ✓" : "Pending ⏳"}</strong>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteReminder(rem.id)}
                                            style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", padding: "6px 10px", borderRadius: 6, fontWeight: 700, fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap" }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: SYNC CONTROLS */}
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
                                    Sync Enabled
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB 3: GAME SETTINGS */}
            {activeTab === "games" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {games.map((game) => {
                        const now = new Date();
                        const lockTime = game.lock_date ? new Date(game.lock_date) : null;
                        const mode = lockTime && now < lockTime ? "pre-start" : "active";

                        return (
                            <div key={game.game_key} style={{ background: "white", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", padding: "16px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px", flexWrap: "wrap", gap: 8 }}>
                                    <div style={{ fontSize: "16px", fontWeight: 800, color: NAVY }}>
                                        <PoolEmoji gameKey={game.game_key} /> {game.game_label} <span style={{ fontSize: "11px", color: "#64748b" }}>({game.game_key})</span>
                                    </div>

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

            {/* TAB 4: CFB MUST-PICKS MANAGEMENT */}
            {activeTab === "cfb_must_picks" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ background: "white", padding: "16px", borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: NAVY }}>CFB Pick 'Em Must-Picks Manager</h3>
                                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
                                    Select the weekly matchups below and click the button to set them as 'Must Picks' instantly. Currently set: <strong>{mustPickCount}</strong>
                                </p>
                            </div>
                        </div>

                        {/* Week Selector Bar */}
                        <div style={{
                            display: "flex",
                            justifyContent: "flex-start",
                            gap: 6,
                            marginBottom: 16,
                            flexWrap: "nowrap",
                            overflowX: "auto",
                            WebkitOverflowScrolling: "touch",
                            paddingBottom: 4,
                            width: "100%"
                        }}>
                            {[...Array(15)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setCfbWeek(i + 1)}
                                    style={{
                                        padding: "6px 12px",
                                        borderRadius: 6,
                                        border: "1px solid #ddd",
                                        backgroundColor: cfbWeek === i + 1 ? NAVY : "white",
                                        color: cfbWeek === i + 1 ? "white" : "#333",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                        flexShrink: 0,
                                        fontSize: "13px"
                                    }}
                                >
                                    W{i + 1}
                                </button>
                            ))}
                        </div>

                        {cfbLoading ? (
                            <div style={{ textAlign: "center", padding: "30px", color: "#64748b", fontSize: "13px" }}>Loading Week {cfbWeek} matchups...</div>
                        ) : cfbGames.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "30px", color: "#64748b", fontSize: "13px" }}>No games found for Week {cfbWeek}.</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {cfbGames.map(game => {
                                    const isMustPick = !!game.must_pick;
                                    const kickoffStr = game.game_date ? new Date(game.game_date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "TBD";

                                    const awayMeta = teamColors[game.away_team] || {};
                                    const homeMeta = teamColors[game.home_team] || {};

                                    const awayLogo = awayMeta.logo || game.away_logo || null;
                                    const homeLogo = homeMeta.logo || game.home_logo || null;

                                    const awayColor = awayMeta.primaryColor || game.away_color || "#1c61ac";
                                    const homeColor = homeMeta.primaryColor || game.home_color || "#1c61ac";

                                    const awaySecondaryColor = awayMeta.secondaryColor || game.away_secondary_color || "#cbd5e1";
                                    const homeSecondaryColor = homeMeta.secondaryColor || game.home_secondary_color || "#cbd5e1";

                                    return (
                                        <div key={game.id} style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "10px 14px",
                                            borderRadius: 8,
                                            border: isMustPick ? `2px solid ${GOLD}` : "1px solid #e2e8f0",
                                            backgroundColor: isMustPick ? "#fef3c2" : "#ffffff",
                                            boxShadow: isMustPick ? "0 2px 6px rgba(200, 157, 60, 0.2)" : "none",
                                            gap: 12
                                        }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
                                                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
                                                    {kickoffStr} {game.spread !== null && game.spread !== undefined ? `| Spread: ${game.spread}` : ""}
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                                    {/* Away Team Badge */}
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        {awayLogo && (
                                                            <div style={{
                                                                background: awaySecondaryColor,
                                                                borderRadius: 4,
                                                                padding: "2px",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                border: `1.5px solid ${awayColor}`,
                                                                width: 22,
                                                                height: 22,
                                                                flexShrink: 0
                                                            }}>
                                                                <img src={awayLogo} alt={game.away_team} style={{ width: 16, height: 16, objectFit: "contain", display: "block" }} />
                                                            </div>
                                                        )}
                                                        <span style={{ fontSize: "14px", fontWeight: 800, color: awayColor }}>
                                                            {game.away_team_rank ? <span style={{ color: "#b45309", marginRight: 2 }}>({game.away_team_rank})</span> : null}
                                                            {game.away_team}
                                                        </span>
                                                    </div>

                                                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>@</span>

                                                    {/* Home Team Badge */}
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        {homeLogo && (
                                                            <div style={{
                                                                background: homeSecondaryColor,
                                                                borderRadius: 4,
                                                                padding: "2px",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                border: `1.5px solid ${homeColor}`,
                                                                width: 22,
                                                                height: 22,
                                                                flexShrink: 0
                                                            }}>
                                                                <img src={homeLogo} alt={game.home_team} style={{ width: 16, height: 16, objectFit: "contain", display: "block" }} />
                                                            </div>
                                                        )}
                                                        <span style={{ fontSize: "14px", fontWeight: 800, color: homeColor }}>
                                                            {game.home_team_rank ? <span style={{ color: "#b45309", marginRight: 2 }}>({game.home_team_rank})</span> : null}
                                                            {game.home_team}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleToggleMustPick(game.id, isMustPick)}
                                                style={{
                                                    background: isMustPick ? GOLD : "#f1f5f9",
                                                    color: isMustPick ? "white" : "#475569",
                                                    border: isMustPick ? `1px solid ${GOLD}` : "1px solid #cbd5e1",
                                                    padding: "6px 12px",
                                                    borderRadius: 6,
                                                    fontWeight: 700,
                                                    fontSize: "12px",
                                                    cursor: "pointer",
                                                    whiteSpace: "nowrap",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 4
                                                }}
                                            >
                                                {isMustPick ? "⭐ Must-Pick" : "☆ Set Must-Pick"}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 5: NCAAB MUST-PICKS MANAGEMENT */}
            {activeTab === "ncaab_must_picks" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ background: "white", padding: "16px", borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: NAVY }}>NCAAB Pick 'Em Must-Picks Manager</h3>
                                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
                                    Select weekly college basketball matchups below and click the button to set them as 'Must Picks' instantly. Currently set: <strong>{ncaabMustPickCount}</strong>
                                </p>
                            </div>
                        </div>

                        {/* Week Selector Bar */}
                        <div style={{
                            display: "flex",
                            justifyContent: "flex-start",
                            gap: 6,
                            marginBottom: 16,
                            flexWrap: "nowrap",
                            overflowX: "auto",
                            WebkitOverflowScrolling: "touch",
                            paddingBottom: 4,
                            width: "100%"
                        }}>
                            {[...Array(15)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setNcaabWeek(i + 1)}
                                    style={{
                                        padding: "6px 12px",
                                        borderRadius: 6,
                                        border: "1px solid #ddd",
                                        backgroundColor: ncaabWeek === i + 1 ? NAVY : "white",
                                        color: ncaabWeek === i + 1 ? "white" : "#333",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                        flexShrink: 0,
                                        fontSize: "13px"
                                    }}
                                >
                                    W{i + 1}
                                </button>
                            ))}
                        </div>

                        {ncaabLoading ? (
                            <div style={{ textAlign: "center", padding: "30px", color: "#64748b", fontSize: "13px" }}>Loading Week {ncaabWeek} matchups...</div>
                        ) : ncaabGames.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "30px", color: "#64748b", fontSize: "13px" }}>No games found for Week {ncaabWeek}.</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {ncaabGames.map(game => {
                                    const isMustPick = !!game.must_pick;
                                    const kickoffStr = game.game_date ? new Date(game.game_date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "TBD";

                                    const awayMeta = teamColors[game.away_team] || {};
                                    const homeMeta = teamColors[game.home_team] || {};

                                    const awayLogo = awayMeta.logo || game.away_logo || null;
                                    const homeLogo = homeMeta.logo || game.home_logo || null;

                                    const awayColor = awayMeta.primaryColor || game.away_color || "#009CDE";
                                    const homeColor = homeMeta.primaryColor || game.home_color || "#009CDE";

                                    const awaySecondaryColor = awayMeta.secondaryColor || game.away_secondary_color || "#cbd5e1";
                                    const homeSecondaryColor = homeMeta.secondaryColor || game.home_secondary_color || "#cbd5e1";

                                    return (
                                        <div key={game.id} style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "10px 14px",
                                            borderRadius: 8,
                                            border: isMustPick ? `2px solid ${GOLD}` : "1px solid #e2e8f0",
                                            backgroundColor: isMustPick ? "#fef3c2" : "#ffffff",
                                            boxShadow: isMustPick ? "0 2px 6px rgba(200, 157, 60, 0.2)" : "none",
                                            gap: 12
                                        }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
                                                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
                                                    {kickoffStr} {game.spread !== null && game.spread !== undefined ? `| Spread: ${game.spread}` : ""}
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                                    {/* Away Team Badge */}
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        {awayLogo && (
                                                            <div style={{
                                                                background: awaySecondaryColor,
                                                                borderRadius: 4,
                                                                padding: "2px",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                border: `1.5px solid ${awayColor}`,
                                                                width: 22,
                                                                height: 22,
                                                                flexShrink: 0
                                                            }}>
                                                                <img src={awayLogo} alt={game.away_team} style={{ width: 16, height: 16, objectFit: "contain", display: "block" }} />
                                                            </div>
                                                        )}
                                                        <span style={{ fontSize: "14px", fontWeight: 800, color: awayColor }}>
                                                            {game.away_team_rank ? <span style={{ color: "#b45309", marginRight: 2 }}>({game.away_team_rank})</span> : null}
                                                            {game.away_team}
                                                        </span>
                                                    </div>

                                                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>@</span>

                                                    {/* Home Team Badge */}
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        {homeLogo && (
                                                            <div style={{
                                                                background: homeSecondaryColor,
                                                                borderRadius: 4,
                                                                padding: "2px",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                border: `1.5px solid ${homeColor}`,
                                                                width: 22,
                                                                height: 22,
                                                                flexShrink: 0
                                                            }}>
                                                                <img src={homeLogo} alt={game.home_team} style={{ width: 16, height: 16, objectFit: "contain", display: "block" }} />
                                                            </div>
                                                        )}
                                                        <span style={{ fontSize: "14px", fontWeight: 800, color: homeColor }}>
                                                            {game.home_team_rank ? <span style={{ color: "#b45309", marginRight: 2 }}>({game.home_team_rank})</span> : null}
                                                            {game.home_team}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleToggleNcaabMustPick(game.id, isMustPick)}
                                                style={{
                                                    background: isMustPick ? GOLD : "#f1f5f9",
                                                    color: isMustPick ? "white" : "#475569",
                                                    border: isMustPick ? `1px solid ${GOLD}` : "1px solid #cbd5e1",
                                                    padding: "6px 12px",
                                                    borderRadius: 6,
                                                    fontWeight: 700,
                                                    fontSize: "12px",
                                                    cursor: "pointer",
                                                    whiteSpace: "nowrap",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 4
                                                }}
                                            >
                                                {isMustPick ? "⭐ Must-Pick" : "☆ Set Must-Pick"}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 6: BTS Randomizer */}
            {activeTab === "bts_randomizer" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <BTSrandomizer />
                </div>
            )}

        </div>
    );
}