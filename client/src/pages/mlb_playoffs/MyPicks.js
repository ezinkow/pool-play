import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NAVY = "#13447a";
const GOLD = "#c89d3c";
const LIVE_RED = "#D50A0A";

const PULSE_STYLE = {
    width: "6px",
    height: "6px",
    backgroundColor: "#22c55e",
    borderRadius: "50%",
    display: "inline-block",
    boxShadow: "0 0 0 rgba(34, 197, 94, 0.4)",
    animation: "pulse 2s infinite"
};

export default function MyPicks() {
    const { user, loading: authLoading } = useAuth();
    const [picks, setPicks] = useState([]);
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRound, setSelectedRound] = useState(1);

    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        
        Promise.all([
            axios.get("/api/mlb/picks", { params: { name: user.name }, ...config }),
            axios.get("/api/mlb/standings", config),
        ]).then(([picksRes, standingsRes]) => {
            setPicks(picksRes.data || []);
            setStandings(standingsRes.data || []);
        }).catch(() => toast.error("Failed to load your data"))
            .finally(() => setLoading(false));
    }, [user, token]);

    const myStanding = useMemo(() =>
        standings.find(s => s.entry_name === user?.name || s.name === user?.name),
        [standings, user]
    );

    // Filter picks based on the selected postseason round (Round 1: Wild Card, Round 2: Division, etc.)
    const filteredPicks = useMemo(() => {
        return picks.filter(p => {
            const s = p.series || p.MlbSeries;
            if (!s) return true; // fallback if round info is missing
            return Number(s.round) === Number(selectedRound);
        });
    }, [picks, selectedRound]);

    const roundPointsEarned = useMemo(() => {
        return filteredPicks.reduce((sum, p) => {
            const s = p.series || p.MlbSeries;
            if (!s || s.status !== "STATUS_FINAL" || !s.winner) return sum;
            if (p.pick !== s.winner) return sum;
            const base = parseInt(p.confidence) || 0;
            const perfect = p.series_length_guess === s.series_length;
            return sum + base + (perfect ? base : 0);
        }, 0);
    }, [filteredPicks]);

    const totalConfidenceUsed = useMemo(() => {
        return filteredPicks.reduce((sum, p) => sum + (parseInt(p.confidence) || 0), 0);
    }, [filteredPicks]);

    const getSeries = p => p.series || p.MlbSeries;
    
    const getResult = p => {
        const s = getSeries(p);
        if (!s || s.status !== "STATUS_FINAL" || !s.winner) return null;
        if (p.pick !== s.winner) return { icon: "❌", color: "#fef2f2", label: "Wrong", type: "loss" };
        const perfect = p.series_length_guess === s.series_length;
        return perfect
            ? { icon: "🌟", color: "#fef9c3", label: `Perfect! ×2 (${(parseInt(p.confidence) || 0) * 2} pts)`, type: "perfect" }
            : { icon: "✅", color: "#f0fdf4", label: `+${p.confidence} pts`, type: "win" };
    };

    const roundsList = [
        { id: 1, label: "Wild Card" },
        { id: 2, label: "Division Series" },
        { id: 3, label: "League Championship" },
        { id: 4, label: "World Series" }
    ];

    if (authLoading) return <div style={{ paddingTop: 100, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>Verifying session…</div>;
    if (!user) return <div style={{ paddingTop: 100, textAlign: "center", fontFamily: "system-ui, sans-serif" }}><h3>Please log in.</h3></div>;

    return (
        <PoolGatekeeper user={user} gameKey="mlb" className='page-content'>
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "20px 12px", paddingBottom: 90, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                <Toaster />

                <style>{`
                    @keyframes pulse { 
                        0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 
                        70% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); } 
                        100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } 
                    }
                `}</style>

                {/* Header & Stats Summary */}
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: NAVY, fontSize: "26px", margin: 0, fontWeight: 800, letterSpacing: "-0.025em" }}>
                        <span>⚾</span> My Postseason Picks Summary <span style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>⚾</span>
                    </h2>
                    <p style={{ color: "#64748b", marginTop: 6, fontSize: "14px", fontWeight: 500 }}>
                        Review your series picks, confidence allocations, and round outcomes for {user.name}.
                    </p>

                    <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                        <div style={{ background: "#f1f5f9", padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: "13px", color: "#334155" }}>
                            Confidence Used: {totalConfidenceUsed} pts
                        </div>
                        <div style={{ background: "#f8fafc", padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: "13px", color: NAVY, border: "1px solid #e2e8f0" }}>
                            Round Points: {roundPointsEarned} pts
                        </div>
                        <div style={{ background: "#ecfdf5", padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: "13px", color: "#047857" }}>
                            Overall Standing: {myStanding?.points || 0} pts
                        </div>
                    </div>
                </div>

                {/* Round Selector Bar */}
                <div style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 6,
                    marginBottom: 20,
                    flexWrap: "nowrap",
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    paddingBottom: 6,
                    width: "100%"
                }}>
                    {roundsList.map(r => (
                        <button
                            key={r.id}
                            onClick={() => setSelectedRound(r.id)}
                            style={{
                                padding: "6px 14px",
                                borderRadius: 6,
                                border: "1px solid #ddd",
                                backgroundColor: selectedRound === r.id ? NAVY : "white",
                                color: selectedRound === r.id ? "white" : "#333",
                                cursor: "pointer",
                                fontWeight: 600,
                                flexShrink: 0,
                                fontSize: "13px"
                            }}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>Loading your picks…</div>
                ) : filteredPicks.length === 0 ? (
                    <div style={{
                        background: "white",
                        borderRadius: 12,
                        padding: "40px 20px",
                        textAlign: "center",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                        <p style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                            No picks submitted for this round yet.
                        </p>
                        <button
                            onClick={() => { window.location.hash = "#/mlb/picks"; }}
                            style={{
                                marginTop: 12,
                                padding: "8px 16px", backgroundColor: NAVY,
                                color: "white", border: "none", borderRadius: 8,
                                cursor: "pointer", fontWeight: 700, fontSize: "13px"
                            }}
                        >
                            Go make picks →
                        </button>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {filteredPicks.map((p, i) => {
                            const s = getSeries(p);
                            const result = getResult(p);

                            const awayColor = s?.away_color || NAVY;
                            const awaySecondary = s?.away_secondary_color || "#cbd5e1";
                            const homeColor = s?.home_color || NAVY;
                            const homeSecondary = s?.home_secondary_color || "#cbd5e1";

                            const isAwayPicked = s?.away_team === p.pick;
                            const isHomePicked = s?.home_team === p.pick;

                            const isFinal = s?.status === "STATUS_FINAL";
                            const isLive = s?.status === "STATUS_IN_PROGRESS";
                            const hasStarted = isLive || isFinal || (s?.game_date && new Date() >= new Date(s.game_date));

                            let statusBadge = null;
                            if (isFinal) {
                                statusBadge = <span style={{ color: "#16a34a", fontWeight: 800, fontSize: "11px" }}>FINAL ({s.away_wins}-{s.home_wins})</span>;
                            } else if (isLive) {
                                statusBadge = (
                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <span style={PULSE_STYLE} />
                                        <span style={{ backgroundColor: LIVE_RED, color: "white", padding: "1px 5px", borderRadius: 3, fontSize: "9px", fontWeight: 700 }}>LIVE ({s.away_wins}-{s.home_wins})</span>
                                    </div>
                                );
                            } else {
                                const kickoff = s?.game_date ? new Date(s.game_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "TBD";
                                statusBadge = <span style={{ color: "#64748b", fontWeight: 700, fontSize: "11px" }}>🕒 {kickoff}</span>;
                            }

                            const pickedPrimary = isAwayPicked ? awayColor : (isHomePicked ? homeColor : NAVY);
                            const pickedSecondary = isAwayPicked ? awaySecondary : (isHomePicked ? homeSecondary : "#cbd5e1");
                            const pickedLogo = isAwayPicked ? s?.away_logo : (isHomePicked ? s?.home_logo : null);

                            return (
                                <div key={i} style={{
                                    background: result?.color || "white",
                                    borderRadius: 12,
                                    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                                    padding: "12px 16px",
                                    borderLeft: `5px solid ${pickedPrimary}`,
                                    border: "1px solid #e2e8f0",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 12
                                }}>
                                    {/* Left: Matchup */}
                                    <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>
                                            {/* Away Team */}
                                            <span style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 5,
                                                backgroundColor: isAwayPicked ? awayColor : "transparent",
                                                padding: isAwayPicked ? "4px 8px" : "2px 4px",
                                                borderRadius: 6,
                                                border: isAwayPicked ? `2px solid #0284c7` : `1px solid ${awayColor}30`,
                                                color: isAwayPicked ? "#ffffff" : "#0f172a"
                                            }}>
                                                {s?.away_logo && (
                                                    <span style={{
                                                        background: awaySecondary,
                                                        borderRadius: 4,
                                                        padding: "2px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        border: `1px solid ${awayColor}`,
                                                        width: 20, height: 20, flexShrink: 0
                                                    }}>
                                                        <img src={s.away_logo} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />
                                                    </span>
                                                )}
                                                <span style={{ fontWeight: isAwayPicked ? 800 : 600, fontSize: "13px" }}>
                                                    {s?.away_seed && `(${s.away_seed})`} {s?.away_team}
                                                </span>
                                            </span>

                                            <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: "12px" }}>@</span>

                                            {/* Home Team */}
                                            <span style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 5,
                                                backgroundColor: isHomePicked ? homeColor : "transparent",
                                                padding: isHomePicked ? "4px 8px" : "2px 4px",
                                                borderRadius: 6,
                                                border: isHomePicked ? `2px solid #0284c7` : `1px solid ${homeColor}30`,
                                                color: isHomePicked ? "#ffffff" : "#0f172a"
                                            }}>
                                                {s?.home_logo && (
                                                    <span style={{
                                                        background: homeSecondary,
                                                        borderRadius: 4,
                                                        padding: "2px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        border: `1px solid ${homeColor}`,
                                                        width: 20, height: 20, flexShrink: 0
                                                    }}>
                                                        <img src={s.home_logo} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />
                                                    </span>
                                                )}
                                                <span style={{ fontWeight: isHomePicked ? 800 : 600, fontSize: "13px" }}>
                                                    {s?.home_seed && `(${s.home_seed})`} {s?.home_team}
                                                </span>
                                            </span>
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: 4, fontWeight: 600 }}>
                                            Length Guess: <strong>{p.series_length_guess ?? "?"}</strong> games
                                        </div>
                                    </div>

                                    {/* Middle: Confidence */}
                                    <div style={{ textAlign: "center", minWidth: "60px" }}>
                                        <div style={{ fontSize: "18px", fontWeight: 800, color: NAVY, lineHeight: 1 }}>
                                            {p.confidence}
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#9ca3af" }}>pts</div>
                                    </div>

                                    {/* Right: Status & Outcome */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center" }}>
                                            {statusBadge}
                                            {result ? (
                                                <div style={{ fontSize: "11px", fontWeight: 700, marginTop: 2, color: result.type === "loss" ? "#dc2626" : "#16a34a" }}>
                                                    {result.icon} {result.label}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>Pending</div>
                                            )}
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