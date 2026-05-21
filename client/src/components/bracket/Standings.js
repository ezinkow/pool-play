import React, { useEffect, useState } from "react";
import axios from "axios";

const GOLD = "#c89d3c";
const BLUE = "#13447a";
const LOCK_TIME = new Date("2026-03-19T16:10:00Z");

const ROUND_LABELS = {
    1: "1st Round", 2: "2nd Round", 3: "Sweet 16",
    4: "Elite 8", 5: "Final Four", 6: "Championship"
};

const REGION_ORDER = ["East", "South", "Midwest", "West", "Final Four"];

function PickCard({ pickRow }) {
    const game = pickRow.GamesBracket;
    if (!game) return null;

    const userPick = pickRow.pick;
    const isFinal = game.status === "STATUS_FINAL";
    const isInProgress = game.status === "STATUS_IN_PROGRESS" || game.status === "STATUS_HALFTIME";
    const showScore = isFinal || isInProgress;

    const pointsEarned = (() => {
        if (!isFinal || !game.winner || userPick !== game.winner) return null;
        const roundPts = game.round_points || game.round || 1;
        const winningSeed = game.winner === game.home_team ? game.home_seed : game.away_seed;
        return roundPts + (winningSeed || 0);
    })();

    const roundPts = game.round_points || game.round || 1;

    const borderColor = (() => {
        // 1. User got it right (Points earned) -> Green
        if (pointsEarned !== null) return "#16a34a";

        // 2. Game is over, user had a pick, but it didn't match the winner -> Red
        if (game.status === "STATUS_FINAL" && game.result !== "Pending" && userPick) {
            return "#dc2626";
        }

        // 3. Game hasn't finished but a selection is locked in -> Navy Blue
        if (hasPick) return BLUE;

        // 4. Default baseline placeholder -> Light Gray
        return "#e5e7eb";
    })();

    const TeamRow = ({ name, seed, logo, side }) => {
        const isWinner = isFinal && game.winner === name;
        const isLoser = isFinal && game.winner && game.winner !== name;
        const isPick = userPick === name;
        const score = side === "home" ? game.home_score : game.away_score;

        return (
            <div style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "5px 8px", borderRadius: 6,
                backgroundColor: isPick
                    ? (isWinner ? "#f0fdf4" : isLoser ? "#fef2f2" : "#eff6ff")
                    : "transparent",
                border: isPick
                    ? `1.5px solid ${isWinner ? "#16a34a" : isLoser ? "#dc2626" : BLUE}`
                    : "1.5px solid transparent",
                opacity: (!isPick && isLoser) ? 0.35 : 1,
            }}>
                {logo
                    ? <img src={logo} width={18} height={18} alt="" style={{ objectFit: "contain", flexShrink: 0 }} />
                    : <span style={{ width: 18, flexShrink: 0 }} />
                }
                <span style={{
                    fontSize: 12, fontWeight: isPick ? 700 : 400,
                    color: isPick ? (isWinner ? "#16a34a" : isLoser ? "#dc2626" : BLUE) : "#374151",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                    {seed && <sup style={{ fontSize: 8, color: "#9ca3af", marginRight: 2 }}>{seed}</sup>}
                    {name || "TBD"}
                </span>
                {showScore && (
                    <span style={{
                        marginLeft: "auto", fontSize: 12, fontWeight: 700, flexShrink: 0,
                        color: isWinner ? "#16a34a" : "#6b7280",
                    }}>
                        {score}
                    </span>
                )}
                {isWinner && isPick && (
                    <span style={{ fontSize: 11, color: "#16a34a", flexShrink: 0 }}>✓</span>
                )}
            </div>
        );
    };

    return (
        <div style={{
            background: "white", borderRadius: 10, padding: "8px 10px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 7,
            borderLeft: `4px solid ${borderColor}`,
        }}>
            {/* Meta row */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{
                    fontSize: 9, fontWeight: 700, color: "white", backgroundColor: BLUE,
                    borderRadius: 4, padding: "2px 5px", textTransform: "uppercase", letterSpacing: "0.4px",
                }}>
                    {ROUND_LABELS[game.round]}
                </span>
                {game.region !== "Final Four" && (
                    <span style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600 }}>{game.region}</span>
                )}
                {pointsEarned !== null ? (
                    <span style={{
                        fontSize: 10, fontWeight: 800, color: "#16a34a",
                        backgroundColor: "#f0fdf4", borderRadius: 4,
                        padding: "1px 6px", border: "1px solid #bbf7d0",
                    }}>
                        +{pointsEarned} pts ✓
                    </span>
                ) : isFinal && userPick && userPick !== game.winner ? (
                    <span style={{
                        fontSize: 10, fontWeight: 700, color: "#dc2626",
                        backgroundColor: "#fef2f2", borderRadius: 4,
                        padding: "1px 6px", border: "1px solid #fecaca",
                    }}>
                        0 pts ✗
                    </span>
                ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, color: GOLD }}>
                        {roundPts} pt{roundPts !== 1 ? "s" : ""}
                    </span>
                )}
                {isInProgress && (
                    <span style={{ fontSize: 9, color: "#f97316", fontWeight: 700, marginLeft: "auto" }}>
                        🔴 LIVE
                    </span>
                )}
                {isFinal && (
                    <span style={{ fontSize: 9, color: "#6b7280", marginLeft: "auto" }}>Final</span>
                )}
            </div>
            {/* Teams */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <TeamRow name={game.away_team} seed={game.away_seed} logo={game.away_logo} side="away" />
                <TeamRow name={game.home_team} seed={game.home_seed} logo={game.home_logo} side="home" />
            </div>
        </div>
    );
}

function UserPicksDrawer({ name, onClose }) {
    const [picks, setPicks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get("/api/bracket/picks", { params: { name } })
            .then(res => {
                console.log("picks response sample:", res.data[0]);
                setPicks(res.data);
            })
            .finally(() => setLoading(false));
    }, [name]);

    console.log(picks)

    // Group by region then round
    const grouped = React.useMemo(() => {
        const groups = {};
        for (const region of REGION_ORDER) groups[region] = {};
        for (const p of picks) {
            const game = p.GamesBracket;
            if (!game) continue;
            const region = game.round >= 5 ? "Final Four" : game.region;
            if (!groups[region]) groups[region] = {};
            if (!groups[region][game.round]) groups[region][game.round] = [];
            groups[region][game.round].push(p);
        }
        for (const region of Object.keys(groups)) {
            for (const round of Object.keys(groups[region])) {
                groups[region][round].sort((a, b) => {
                    const ga = a.GamesBracket;
                    const gb = b.GamesBracket;
                    return (ga?.bracket_slot ?? 0) - (gb?.bracket_slot ?? 0);
                });
            }
        }
        return groups;
    }, [picks]);

    const totalPoints = React.useMemo(() => {
        let pts = 0;
        for (const p of picks) {
            const game = p.GamesBracket;
            if (!game || game.status !== "STATUS_FINAL" || !game.winner) continue;
            if (p.pick !== game.winner) continue;
            const roundPts = game.round_points || game.round || 1;
            const winningSeed = game.winner === game.home_team ? game.home_seed : game.away_seed;
            pts += roundPts + (winningSeed || 0);
        }
        return pts;
    }, [picks]);

    return (
        <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0,
            width: "min(480px, 100vw)",
            backgroundColor: "#f8fafc",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
            zIndex: 100,
            display: "flex", flexDirection: "column",
            overflowY: "auto",
        }}>
            {/* Drawer header */}
            <div style={{
                background: `linear-gradient(135deg, ${BLUE} 0%, #030831 100%)`,
                padding: "16px 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexShrink: 0,
                position: "sticky", top: 0, zIndex: 2,
            }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: GOLD }}>{name}</div>
                    {!loading && (
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                            {totalPoints} pts · {picks.filter(p => {
                                const g = p.GamesBracket;
                                return g?.status === "STATUS_FINAL" && p.pick === g?.winner;
                            }).length} correct
                        </div>
                    )}
                </div>
                <button onClick={onClose} style={{
                    background: "rgba(255,255,255,0.15)", border: "none",
                    color: "white", fontWeight: 700, fontSize: 18,
                    width: 34, height: 34, borderRadius: "50%",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>×</button>
            </div>

            {/* Content */}
            <div style={{ padding: "16px 14px", flex: 1 }}>
                {loading ? (
                    <div style={{ textAlign: "center", padding: 40, color: BLUE }}>Loading picks...</div>
                ) : (
                    REGION_ORDER.map(region => {
                        const rounds = grouped[region];
                        if (!rounds || Object.keys(rounds).length === 0) return null;
                        return (
                            <div key={region} style={{ marginBottom: 24 }}>
                                <div style={{
                                    borderBottom: `2px solid ${GOLD}`, paddingBottom: 4, marginBottom: 10,
                                }}>
                                    <h4 style={{ margin: 0, color: BLUE, fontWeight: 900, fontSize: 13 }}>{region}</h4>
                                </div>
                                {Object.keys(rounds).sort((a, b) => a - b).map(round => (
                                    <div key={round} style={{ marginBottom: 10 }}>
                                        <div style={{
                                            fontSize: 10, fontWeight: 700, color: "#9ca3af",
                                            textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5,
                                        }}>
                                            {ROUND_LABELS[round]}
                                        </div>
                                        {rounds[round].map((p, i) => (
                                            <PickCard key={i} pickRow={p} />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default function BracketStandings() {
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const isLocked = new Date() >= LOCK_TIME;

    useEffect(() => {
        axios.get("/api/bracket/standings")
            .then(res => setStandings(res.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ padding: 80, textAlign: "center", color: BLUE }}>Loading standings...</div>;

    return (
        <div style={{ paddingTop: 68, paddingBottom: 80, maxWidth: 800, margin: "0 auto", padding: "68px 16px 80px" }}>
            <h2 style={{ color: BLUE, marginBottom: 4 }}>🏆 Bracket Standings</h2>
            <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 20 }}>
                Points: 1pt R1 · 2pt R2 · 4pt Sweet 16 · 8pt Elite 8 · 16pt Final Four · 32pt Championship
                <br />PLUS: Team's seed value as bonus
            </p>

            {standings.length === 0 && <p style={{ color: "#6b7280" }}>No picks submitted yet.</p>}

            {/* Desktop table */}
            <div className="mypicks-desktop">
                <table style={{
                    borderCollapse: "collapse", width: "100%", background: "white",
                    fontSize: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.07)"
                }}>
                    <thead>
                        <tr>
                            {["Rank", "Name", "Points", "Correct", ...(isLocked ? ["Champ"] : [])].map(h => (
                                <th key={h} style={{
                                    position: "sticky", top: 65, zIndex: 4,
                                    padding: "10px 14px", backgroundColor: BLUE, color: "white",
                                    borderBottom: `2px solid ${GOLD}`, textAlign: "left",
                                    whiteSpace: "nowrap", fontWeight: 600, fontSize: 13,
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {standings.map((s, i) => (
                            <tr key={s.name}
                                onClick={() => setSelectedUser(s.name)}
                                style={{
                                    backgroundColor: i % 2 === 0 ? "white" : "#f9fafb",
                                    borderBottom: "1px solid #e5e7eb",
                                    cursor: "pointer",
                                    transition: "background 0.1s",
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = "#eff6ff"}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? "white" : "#f9fafb"}
                            >
                                <td style={{ padding: "10px 14px", fontWeight: 700, color: i === 0 ? GOLD : "#374151" }}>
                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                                </td>
                                <td style={{ padding: "10px 14px", fontWeight: 600 }}>
                                    {s.name}
                                    <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6 }}>→</span>
                                </td>
                                <td style={{ padding: "10px 14px", fontWeight: 700, color: BLUE }}>{s.points}</td>
                                <td style={{ padding: "10px 14px", color: "#16a34a", fontWeight: 600 }}>{s.correct}</td>
                                {isLocked && (
                                    <td style={{ padding: "10px 14px", color: "#374151" }}>
                                        {s.predictedWinner
                                            ? <span style={{ fontWeight: 600 }}>🏆 {s.predictedWinner}</span>
                                            : <span style={{ color: "#9ca3af" }}>—</span>
                                        }
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="mypicks-mobile">
                {standings.map((s, i) => (
                    <div key={s.name}
                        onClick={() => setSelectedUser(s.name)}
                        style={{
                            background: "white", borderRadius: 12, padding: "14px 16px",
                            marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                            borderLeft: `4px solid ${i === 0 ? GOLD : BLUE}`,
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            cursor: "pointer",
                        }}
                    >
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 18 }}>
                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                                </span>
                                <span style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</span>
                            </div>
                            {isLocked && s.predictedWinner && (
                                <div style={{ fontSize: 12, color: "#6b7280" }}>🏆 {s.predictedWinner}</div>
                            )}
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 800, fontSize: 20, color: BLUE }}>{s.points}</div>
                            <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>{s.correct} correct</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Drawer overlay */}
            {selectedUser && (
                <>
                    <div
                        onClick={() => setSelectedUser(null)}
                        style={{
                            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.35)",
                            zIndex: 99,
                        }}
                    />
                    <UserPicksDrawer name={selectedUser} onClose={() => setSelectedUser(null)} />
                </>
            )}
        </div>
    );
}