import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NAVY = "#13447a";
const GOLD = "%23c89d3c";

const formatDateTime = (iso) => {
    if (!iso) return "TBD";
    const date = new Date(iso);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).toUpperCase();
};

export default function Picks() {
    const { user, loading: authLoading } = useAuth();
    const [series, setSeries] = useState([]);
    const [picks, setPicks] = useState([]);
    const [dataLoaded, setDataLoaded] = useState(false);

    useEffect(() => {
        axios.get("/api/mlb/series")
            .then(res => setSeries(res.data || []))
            .catch(() => toast.error("Error loading series"));
    }, []);

    useEffect(() => {
        if (user && series.length > 0) {
            const token = localStorage.getItem("token");
            const config = { headers: { Authorization: `Bearer ${token}` } };

            axios.get("/api/mlb/picks", { params: { name: user.name }, ...config })
                .then(res => {
                    if (res.data && Array.isArray(res.data)) {
                        const mappedPicks = res.data.map(p => ({
                            series: String(p.series_id),
                            pick: p.pick,
                            confidence: parseInt(p.confidence) || 0,
                            length: parseInt(p.series_length_guess) || 4
                        }));
                        setPicks(mappedPicks);
                    }
                    setDataLoaded(true);
                })
                .catch(() => setDataLoaded(true));
        }
    }, [user, series]);

    // --- LOGIC HOOKS ---
    const activeRound = useMemo(() => {
        if (!series.length) return 1;
        const now = new Date();
        const unstarted = series.filter(g => new Date(g.game_date) > now);
        if (unstarted.length > 0) {
            return Math.min(...unstarted.map(g => g.round));
        }
        return Math.max(...series.map(g => g.round)) + 1;
    }, [series]);

    const visibleGames = useMemo(() => {
        if (!series.length) return [];
        const now = new Date();
        return series
            .filter(g => g.round === activeRound && new Date(g.game_date) > now)
            .sort((a, b) => new Date(a.game_date) - new Date(b.game_date));
    }, [series, activeRound]);

    // Dynamic possible lengths based on round rules
    const availableLengths = useMemo(() => {
        if (activeRound === 1) return [2, 3]; // Wild Card: Best-of-3
        if (activeRound === 2) return [3, 4, 5]; // Division Series: Best-of-5
        return [4, 5, 6, 7]; // LCS & World Series: Best-of-7
    }, [activeRound]);

    const roundMax = useMemo(() => {
        const roundMapping = { 1: 24, 2: 32, 3: 16, 4: 8 };
        if (visibleGames.length > 0 && visibleGames[0].round_points_max) {
            return Number(visibleGames[0].round_points_max);
        }
        return roundMapping[activeRound];
    }, [visibleGames, activeRound]);

    const currentPointsUsed = useMemo(() => {
        if (visibleGames.length === 0) return 0;
        const visibleIds = visibleGames.map(vg => String(vg.id));
        return picks
            .filter(p => visibleIds.includes(String(p.series)))
            .reduce((sum, p) => sum + (parseInt(p.confidence) || 0), 0);
    }, [picks, visibleGames]);

    const currentRoundLabel = useMemo(() => {
        if (visibleGames.length > 0 && visibleGames[0].round_label) {
            return visibleGames[0].round_label.toLowerCase();
        }
        const mapping = { 1: "wild card", 2: "division series", 3: "league championship", 4: "world series" };
        return mapping[activeRound] || `round ${activeRound}`;
    }, [visibleGames, activeRound]);

    // --- ACTIONS ---
    const updatePickData = (gameId, field, value) => {
        const sId = String(gameId);
        setPicks(prev => {
            const existing = prev.find(p => p.series === sId);
            if (existing) {
                if (field === 'pick' && existing.pick === value) return prev.filter(p => p.series !== sId);
                return prev.map(p => p.series === sId ? { ...p, [field]: value } : p);
            }
            return [...prev, {
                series: sId,
                pick: field === 'pick' ? value : null,
                confidence: field === 'confidence' ? value : 0,
                length: field === 'length' ? value : availableLengths[0]
            }];
        });
    };

    const handleSubmitPicks = async () => {
        if (picks.length === 0) return toast.error("No picks selected");
        if (currentPointsUsed > roundMax) return toast.error(`Over the ${roundMax} point limit!`);

        const token = localStorage.getItem("token");
        try {
            await axios.post("/api/mlb/picks/bulk", {
                name: user.name,
                picks: picks.map(p => ({
                    series_id: p.series,
                    pick: p.pick,
                    confidence: p.confidence,
                    series_length_guess: p.length
                }))
            }, { headers: { Authorization: `Bearer ${token}` } });

            toast.success("Picks submitted successfully!");
            setTimeout(() => { window.location.hash = "#/mlb/mypicks"; }, 1500);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save picks");
        }
    };

    if (authLoading) return <div style={{ textAlign: "center", padding: 50, fontFamily: "system-ui, sans-serif" }}>Verifying Session...</div>;
    if (!user) return <div style={{ textAlign: "center", padding: 50, fontFamily: "system-ui, sans-serif" }}>Please log in to make picks.</div>;
    if (!dataLoaded && series.length > 0) return <div style={{ textAlign: "center", padding: 50, fontFamily: "system-ui, sans-serif" }}>Loading your saved picks...</div>;

    // Second round (Division Series) max confidence option count is 12, others are 10
    const maxConfidenceOption = activeRound === 2 ? 12 : 10;

    return (
        <PoolGatekeeper user={user} gameKey="mlb" className='page-content'>
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "12px 8px", paddingBottom: 100, paddingTop: 16, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                <Toaster />

                {/* Sticky Header */}
                <div style={{
                    position: "sticky",
                    top: "48px",
                    zIndex: 99,
                    background: "#ffffff",
                    paddingTop: 10,
                    paddingBottom: 10,
                    borderBottom: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                    marginBottom: 16,
                    marginLeft: "-8px",
                    marginRight: "-8px",
                    paddingLeft: "8px",
                    paddingRight: "8px"
                }}>
                    <div style={{ textAlign: "center" }}>
                        <h2 style={{ color: NAVY, fontSize: "19px", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 800 }}>
                            <span>⚾</span> MLB Postseason Pick'em <span style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>⚾</span>
                        </h2>
                        <p style={{ color: "#666", marginTop: 2, marginBottom: 8, fontSize: "11px", lineHeight: 1.3 }}>
                            Correctly guessing the number of games gives you a <strong>2x bonus</strong>! Allocate up to {roundMax} confidence points for the {currentRoundLabel} round.
                        </p>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, flexWrap: "nowrap" }}>
                            <div style={{ background: currentPointsUsed > roundMax ? "#fef2f2" : "#f8fafc", color: currentPointsUsed > roundMax ? "#dc2626" : "#475569", padding: "4px 10px", borderRadius: 6, fontWeight: 700, fontSize: "11px", border: "1px solid #cbd5e1" }}>
                                Points Used: <span style={{ color: currentPointsUsed > roundMax ? "#dc2626" : "#16a34a" }}>{currentPointsUsed}</span> / {roundMax}
                            </div>
                            <button
                                onClick={handleSubmitPicks}
                                style={{
                                    background: "#16a34a",
                                    color: "white",
                                    border: "1px solid #15803d",
                                    padding: "4px 12px",
                                    borderRadius: 6,
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    boxShadow: "0 2px 4px rgba(22,163,74,0.25)"
                                }}
                            >
                                Save All Picks
                            </button>
                        </div>
                    </div>
                </div>

                {visibleGames.length === 0 ? (
                    <div style={{ background: "white", borderRadius: 10, padding: "30px 16px", textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
                        <p style={{ fontSize: "15px", fontWeight: 700, color: NAVY, margin: 0 }}>No active matchups for selection right now.</p>
                        <p style={{ fontSize: "13px", color: "#64748b", marginTop: 6, marginBottom: 0 }}>Check back once the next round matchups are finalized!</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {visibleGames.map(s => {
                            const currentPick = picks.find(p => p.series === String(s.id)) || {};
                            const isAwayPicked = currentPick.pick === s.away_team;
                            const isHomePicked = currentPick.pick === s.home_team;

                            const awayColor = s.away_color || NAVY;
                            const awaySecondary = s.away_secondary_color || "#cbd5e1";
                            const homeColor = s.home_color || NAVY;
                            const homeSecondary = s.home_secondary_color || "#cbd5e1";

                            return (
                                <div key={s.id} style={{
                                    background: "#ffffff",
                                    borderRadius: 10,
                                    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.06)",
                                    border: "1px solid #cbd5e1",
                                    overflow: "hidden",
                                    padding: "10px 12px"
                                }}>
                                    {/* Game Time Header */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: "10px", fontWeight: 700, color: "#d97706", textTransform: "uppercase" }}>
                                        <span>Game 1 First Pitch: {formatDateTime(s.game_date)} CT</span>
                                    </div>

                                    {/* Team Selector Grid (Away vs Home) */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                                        {/* Away Team Option */}
                                        <div
                                            onClick={() => updatePickData(s.id, 'pick', s.away_team)}
                                            style={{
                                                backgroundImage: isAwayPicked
                                                    ? `linear-gradient(to right, ${awayColor} 100%, ${awayColor} 100%)`
                                                    : `linear-gradient(to right, ${awayColor} 0%, ${awayColor} 0%, transparent 0%), linear-gradient(135deg, ${awayColor}26 0%, ${awaySecondary}26 50%, #f8fafc 100%)`,
                                                backgroundColor: isAwayPicked ? awayColor : "transparent",
                                                borderRadius: 8,
                                                border: isAwayPicked ? `2px solid #0284c7` : `1px solid ${awayColor}55`,
                                                padding: "10px 8px",
                                                cursor: "pointer",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                textAlign: "center",
                                                position: "relative",
                                                boxShadow: isAwayPicked ? `0 0 10px rgba(2, 132, 199, 0.35), inset 0 0 8px ${awayColor}` : "0 1px 3px rgba(0,0,0,0.02)",
                                                transition: "background-size 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), border 0.2s ease, transform 0.1s ease",
                                                backgroundSize: isAwayPicked ? "100% 100%" : "0% 100%, 100% 100%",
                                                backgroundRepeat: "no-repeat",
                                                minWidth: 0
                                            }}
                                        >
                                            {isAwayPicked && (
                                                <span style={{ position: "absolute", top: 6, right: 8, fontSize: "11px", color: "#ffffff", fontWeight: 900 }}>✓</span>
                                            )}
                                            {s.away_logo ? (
                                                <div style={{
                                                    background: awaySecondary,
                                                    borderRadius: 6,
                                                    padding: "4px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    boxShadow: `0 0 4px 1px ${awayColor}, 0 1px 3px rgba(0,0,0,0.15)`,
                                                    border: `1.5px solid ${awayColor}`,
                                                    marginBottom: 6,
                                                    width: 35,
                                                    height: 35,
                                                    flexShrink: 0
                                                }}>
                                                    <img src={s.away_logo} alt={s.away_team} style={{ width: 25, height: 25, objectFit: "contain", display: "block" }} />
                                                </div>
                                            ) : null}
                                            <div style={{ fontWeight: isAwayPicked ? 800 : 600, fontSize: "12px", color: isAwayPicked ? "#ffffff" : "#0f172a", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {s.away_seed && <sup style={{ marginRight: 2, fontSize: 8 }}>({s.away_seed})</sup>}
                                                {s.away_team}
                                            </div>
                                            <div style={{ fontSize: "10px", color: isAwayPicked ? "#e2e8f0" : "#64748b", marginTop: 2, fontWeight: 600 }}>Away</div>
                                        </div>

                                        {/* Home Team Option */}
                                        <div
                                            onClick={() => updatePickData(s.id, 'pick', s.home_team)}
                                            style={{
                                                backgroundImage: isHomePicked
                                                    ? `linear-gradient(to right, ${homeColor} 100%, ${homeColor} 100%)`
                                                    : `linear-gradient(to right, ${homeColor} 0%, ${homeColor} 0%, transparent 0%), linear-gradient(135deg, ${homeColor}26 0%, ${homeSecondary}26 50%, #f8fafc 100%)`,
                                                backgroundColor: isHomePicked ? homeColor : "transparent",
                                                borderRadius: 8,
                                                border: isHomePicked ? `2px solid #0284c7` : `1px solid ${homeColor}55`,
                                                padding: "10px 8px",
                                                cursor: "pointer",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                textAlign: "center",
                                                position: "relative",
                                                boxShadow: isHomePicked ? `0 0 10px rgba(2, 132, 199, 0.35), inset 0 0 8px ${homeColor}` : "0 1px 3px rgba(0,0,0,0.02)",
                                                transition: "background-size 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), border 0.2s ease, transform 0.1s ease",
                                                backgroundSize: isHomePicked ? "100% 100%" : "0% 100%, 100% 100%",
                                                backgroundRepeat: "no-repeat",
                                                minWidth: 0
                                            }}
                                        >
                                            {isHomePicked && (
                                                <span style={{ position: "absolute", top: 6, right: 8, fontSize: "11px", color: "#ffffff", fontWeight: 900 }}>✓</span>
                                            )}
                                            {s.home_logo ? (
                                                <div style={{
                                                    background: homeSecondary,
                                                    borderRadius: 6,
                                                    padding: "4px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    boxShadow: `0 0 4px 1px ${homeColor}, 0 1px 3px rgba(0,0,0,0.15)`,
                                                    border: `1.5px solid ${homeColor}`,
                                                    marginBottom: 6,
                                                    width: 35,
                                                    height: 35,
                                                    flexShrink: 0
                                                }}>
                                                    <img src={s.home_logo} alt={s.home_team} style={{ width: 25, height: 25, objectFit: "contain", display: "block" }} />
                                                </div>
                                            ) : null}
                                            <div style={{ fontWeight: isHomePicked ? 800 : 600, fontSize: "12px", color: isHomePicked ? "#ffffff" : "#0f172a", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {s.home_seed && <sup style={{ marginRight: 2, fontSize: 8 }}>({s.home_seed})</sup>}
                                                {s.home_team}
                                            </div>
                                            <div style={{ fontSize: "10px", color: isHomePicked ? "#e2e8f0" : "#64748b", marginTop: 2, fontWeight: 600 }}>Home</div>
                                        </div>
                                    </div>

                                    {/* Series Length & Confidence Controls */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                                        <div>
                                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: 5 }}>Series Length (Games):</div>
                                            <div style={{ display: "flex", gap: 6 }}>
                                                {availableLengths.map(len => (
                                                    <button
                                                        key={len}
                                                        onClick={() => updatePickData(s.id, 'length', len)}
                                                        style={{
                                                            width: 32,
                                                            height: 30,
                                                            borderRadius: 6,
                                                            background: currentPick.length === len ? NAVY : "white",
                                                            color: currentPick.length === len ? "white" : "#333",
                                                            border: currentPick.length === len ? `1px solid ${NAVY}` : "1px solid #cbd5e1",
                                                            fontWeight: 700,
                                                            fontSize: "12px",
                                                            cursor: "pointer",
                                                            boxShadow: currentPick.length === len ? "0 2px 4px rgba(19, 68, 122, 0.25)" : "none",
                                                            transition: "all 0.15s ease"
                                                        }}
                                                    >
                                                        {len}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: 5 }}>Confidence Pts:</div>
                                            <select
                                                value={currentPick.confidence || ""}
                                                onChange={(e) => updatePickData(s.id, 'confidence', parseInt(e.target.value))}
                                                style={{
                                                    padding: "6px 10px",
                                                    borderRadius: 6,
                                                    border: "1px solid #cbd5e1",
                                                    fontSize: "12px",
                                                    fontWeight: 600,
                                                    background: "white",
                                                    cursor: "pointer",
                                                    color: "#0f172a",
                                                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                                                }}
                                            >
                                                <option value="" disabled>Select Pts</option>
                                                {[...Array(maxConfidenceOption)].map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>{i + 1} Pts</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </PoolGatekeeper>
    );
}